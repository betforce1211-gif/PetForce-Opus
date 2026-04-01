#!/usr/bin/env npx tsx
/**
 * PetForce Security Auditor
 *
 * Scans the API codebase for:
 * 1. RBAC gaps — tRPC procedures missing household membership checks
 * 2. IDOR vulnerabilities — direct object reference without ownership verification
 * 3. Upload validation — magic bytes, file size, content-type checks
 * 4. Rate limiting coverage — public-facing endpoints without rate limits
 *
 * Usage: npx tsx scripts/security-audit.ts [--json]
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "critical" | "high" | "medium" | "low" | "info";

interface Finding {
  id: string;
  category: "rbac" | "idor" | "upload" | "rate-limit";
  severity: Severity;
  title: string;
  file: string;
  line?: number;
  description: string;
  recommendation: string;
}

interface RouterAnalysis {
  name: string;
  file: string;
  procedures: ProcedureInfo[];
}

interface ProcedureInfo {
  name: string;
  type: "query" | "mutation";
  procedureBase: string; // publicProcedure | protectedProcedure | householdProcedure
  hasHouseholdCheck: boolean;
  hasRoleCheck: boolean;
  hasVerifyMembership: boolean;
  line: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_SRC = path.resolve(__dirname, "../apps/api/src");
const ROUTERS_DIR = path.join(API_SRC, "routers");
const ROUTES_DIR = path.join(API_SRC, "routes");

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

function getLine(content: string, substring: string): number {
  const idx = content.indexOf(substring);
  if (idx === -1) return -1;
  return content.substring(0, idx).split("\n").length;
}

function relPath(filePath: string): string {
  return path.relative(path.resolve(__dirname, ".."), filePath);
}

// ---------------------------------------------------------------------------
// 1. RBAC / Household Membership Analysis
// ---------------------------------------------------------------------------

function analyzeRouter(filePath: string): RouterAnalysis {
  const content = readFile(filePath);
  const name = path.basename(filePath, ".ts");
  const procedures: ProcedureInfo[] = [];

  // Match procedure definitions: name: <base>.input(...).query/mutation
  // or name: <base>.query/mutation
  const procRegex =
    /(\w+)\s*:\s*(publicProcedure|protectedProcedure|householdProcedure)([\s\S]*?)\.(query|mutation)\s*\(/g;

  let match: RegExpExecArray | null;
  while ((match = procRegex.exec(content)) !== null) {
    const procName = match[1];
    const base = match[2];
    const middleware = match[3];
    const type = match[4] as "query" | "mutation";
    const line = content.substring(0, match.index).split("\n").length;

    // Check for additional membership verification in the handler body
    // Find the handler body (next ~50 lines after match)
    const afterMatch = content.substring(match.index, match.index + 2000);
    const hasVerifyMembership = afterMatch.includes("verifyMembership");
    const hasRoleCheck =
      afterMatch.includes("requireAdmin") ||
      afterMatch.includes("requireOwner") ||
      /role\s*[!=]==/.test(afterMatch);

    const hasHouseholdCheck =
      base === "householdProcedure" ||
      hasVerifyMembership ||
      afterMatch.includes("householdId") && afterMatch.includes("members");

    procedures.push({
      name: procName,
      type,
      procedureBase: base,
      hasHouseholdCheck,
      hasRoleCheck,
      hasVerifyMembership,
      line,
    });
  }

  return { name, file: filePath, procedures };
}

function auditRBAC(routers: RouterAnalysis[]): Finding[] {
  const findings: Finding[] = [];

  for (const router of routers) {
    for (const proc of router.procedures) {
      // Flag mutations without household membership checks
      if (proc.type === "mutation" && !proc.hasHouseholdCheck) {
        const content = readFile(router.file);
        const procStart = content.indexOf(`${proc.name}:`);
        const procBody = content.substring(procStart, procStart + 2000);

        // Check if the procedure scopes to ctx.userId (safe self-scoped operation)
        const scopesToUser = /eq\(\w+\.userId,\s*ctx\.userId\)/.test(procBody);

        // Token-based flows (invitation accept/decline) are intentionally memberless
        const isTokenFlow = procBody.includes("token") && (
          proc.name === "accept" || proc.name === "decline" ||
          proc.name === "getByToken"
        );

        if (isTokenFlow) {
          // Intentional — token-based join flows bypass membership by design
        } else if (scopesToUser && !procBody.includes("householdId")) {
          // Scoped to the current user and doesn't touch household data — safe
        } else {
          // Determine severity: mutations touching householdId without check are high,
          // self-scoped delete is medium (data pollution risk)
          const touchesHousehold = procBody.includes("householdId");
          const severity: Severity = touchesHousehold ? "high" : "medium";

          findings.push({
            id: `RBAC-${router.name}-${proc.name}`,
            category: "rbac",
            severity,
            title: `Mutation '${router.name}.${proc.name}' missing household membership check`,
            file: relPath(router.file),
            line: proc.line,
            description: touchesHousehold
              ? `The mutation uses '${proc.procedureBase}' and writes to a householdId without verifying membership. An attacker can pollute another household's data.`
              : `The mutation uses '${proc.procedureBase}' without household membership verification. Evaluate whether household scoping is needed.`,
            recommendation: touchesHousehold
              ? `Add verifyMembership() for the provided householdId, or switch to householdProcedure.`
              : `Review whether this endpoint needs household scoping. If it accesses household resources, add membership verification.`,
          });
        }
      }

      // Flag queries on protectedProcedure that take a householdId but don't verify membership
      if (
        proc.type === "query" &&
        proc.procedureBase === "protectedProcedure" &&
        !proc.hasHouseholdCheck
      ) {
        // Read the handler to check if it accepts householdId
        const content = readFile(router.file);
        const procStart = content.indexOf(`${proc.name}:`);
        const procBody = content.substring(procStart, procStart + 1500);
        if (procBody.includes("householdId")) {
          findings.push({
            id: `RBAC-${router.name}-${proc.name}-query`,
            category: "rbac",
            severity: "medium",
            title: `Query '${router.name}.${proc.name}' accepts householdId without membership check`,
            file: relPath(router.file),
            line: proc.line,
            description: `Query accepts a householdId input but uses protectedProcedure without household membership verification.`,
            recommendation: `Switch to householdProcedure or add verifyMembership() to prevent data leakage across households.`,
          });
        }
      }

      // Flag public procedures that are mutations
      if (proc.type === "mutation" && proc.procedureBase === "publicProcedure") {
        findings.push({
          id: `RBAC-${router.name}-${proc.name}-public`,
          category: "rbac",
          severity: "critical",
          title: `Public mutation '${router.name}.${proc.name}' — no auth required`,
          file: relPath(router.file),
          line: proc.line,
          description: `This mutation uses publicProcedure, meaning it can be called without any authentication.`,
          recommendation: `Evaluate if this truly needs to be public. If not, switch to protectedProcedure at minimum.`,
        });
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// 2. IDOR Analysis
// ---------------------------------------------------------------------------

function auditIDOR(routers: RouterAnalysis[]): Finding[] {
  const findings: Finding[] = [];

  for (const router of routers) {
    const content = readFile(router.file);

    for (const proc of router.procedures) {
      // Find procedures that take an entity ID but don't scope to household
      if (proc.procedureBase === "protectedProcedure" && !proc.hasVerifyMembership) {
        const procStart = content.indexOf(`${proc.name}:`);
        const procBody = content.substring(procStart, procStart + 2000);

        // Check if it takes an ID input (potential direct object reference)
        const takesId = /input\(.*?id.*?\)/.test(procBody) || /\.input\(z\.object\(\{.*?id:/.test(procBody);
        const usesIdInQuery = /eq\(\w+\.\w+,\s*input\.id\)/.test(procBody);
        const scopesToUser = /eq\(\w+\.userId,\s*ctx\.userId\)/.test(procBody);

        if (takesId && usesIdInQuery && !scopesToUser && !proc.hasHouseholdCheck) {
          findings.push({
            id: `IDOR-${router.name}-${proc.name}`,
            category: "idor",
            severity: "high",
            title: `Potential IDOR in '${router.name}.${proc.name}' — entity lookup by ID without ownership check`,
            file: relPath(router.file),
            line: proc.line,
            description: `Procedure looks up entity by ID without verifying the caller owns or is a member of the entity's household. An attacker could guess IDs to access other households' data.`,
            recommendation: `Add verifyMembership() or scope the query to the user's household.`,
          });
        }
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// 3. Upload Validation Analysis
// ---------------------------------------------------------------------------

function auditUploads(): Finding[] {
  const findings: Finding[] = [];

  if (!fs.existsSync(ROUTES_DIR)) {
    findings.push({
      id: "UPLOAD-no-routes",
      category: "upload",
      severity: "info",
      title: "No routes/ directory found",
      file: "apps/api/src/routes/",
      description: "Upload routes directory not found. Uploads may be handled elsewhere.",
      recommendation: "Verify upload handling location.",
    });
    return findings;
  }

  const uploadFiles = fs.readdirSync(ROUTES_DIR).filter((f) => f.includes("upload"));

  if (uploadFiles.length === 0) {
    findings.push({
      id: "UPLOAD-no-upload-routes",
      category: "upload",
      severity: "info",
      title: "No upload route files found",
      file: "apps/api/src/routes/",
      description: "No files matching 'upload' in routes directory.",
      recommendation: "Check if uploads are handled in tRPC routers instead.",
    });
    return findings;
  }

  for (const file of uploadFiles) {
    const filePath = path.join(ROUTES_DIR, file);
    const content = readFile(filePath);
    const rel = relPath(filePath);

    // Check for magic byte validation
    if (!content.includes("validateFileMagicBytes") && !content.includes("fileTypeFromBuffer")) {
      findings.push({
        id: `UPLOAD-${file}-no-magic-bytes`,
        category: "upload",
        severity: "high",
        title: `Upload handler '${file}' missing magic byte validation`,
        file: rel,
        description: "File uploads should validate magic bytes to prevent disguised file types.",
        recommendation: "Use validateFileMagicBytes() from lib/validate-file-type.ts.",
      });
    }

    // Check for file size limits
    if (!content.includes("MAX_SIZE") && !content.includes("file.size") && !content.includes("maxFileSize")) {
      findings.push({
        id: `UPLOAD-${file}-no-size-limit`,
        category: "upload",
        severity: "high",
        title: `Upload handler '${file}' missing file size validation`,
        file: rel,
        description: "No file size limit detected. Large uploads could exhaust server memory or storage.",
        recommendation: "Add explicit file size checks before processing.",
      });
    }

    // Check for content-type validation
    if (!content.includes("ALLOWED_TYPES") && !content.includes("content-type") && !content.includes("mime")) {
      findings.push({
        id: `UPLOAD-${file}-no-content-type`,
        category: "upload",
        severity: "medium",
        title: `Upload handler '${file}' missing content-type validation`,
        file: rel,
        description: "No content-type or MIME type allowlist detected.",
        recommendation: "Check Content-Type header against an allowlist before processing.",
      });
    }

    // Check for auth
    if (!content.includes("userId") && !content.includes("auth") && !content.includes("clerk")) {
      findings.push({
        id: `UPLOAD-${file}-no-auth`,
        category: "upload",
        severity: "critical",
        title: `Upload handler '${file}' missing authentication`,
        file: rel,
        description: "Upload endpoint has no authentication check.",
        recommendation: "Add Clerk JWT verification before processing uploads.",
      });
    }

    // Check for household membership on upload
    if (!content.includes("members") && !content.includes("membership") && !content.includes("householdId")) {
      findings.push({
        id: `UPLOAD-${file}-no-household-check`,
        category: "upload",
        severity: "high",
        title: `Upload handler '${file}' missing household membership check`,
        file: rel,
        description: "Upload endpoint does not verify household membership before allowing upload.",
        recommendation: "Verify the user is a member of the target household before accepting the upload.",
      });
    }

    // Check for file extension validation
    if (!content.includes("extension") && !content.includes("extname") && !content.includes(".ext")) {
      findings.push({
        id: `UPLOAD-${file}-no-ext-validation`,
        category: "upload",
        severity: "low",
        title: `Upload handler '${file}' missing file extension validation`,
        file: rel,
        description:
          "No file extension validation detected. While magic bytes are more reliable, extension checks add defense-in-depth.",
        recommendation: "Consider validating file extensions as an additional check.",
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// 4. Rate Limiting Analysis
// ---------------------------------------------------------------------------

function auditRateLimiting(): Finding[] {
  const findings: Finding[] = [];

  const rateLimitPath = path.join(API_SRC, "lib", "rate-limit.ts");
  const indexPath = path.join(API_SRC, "index.ts");

  if (!fs.existsSync(rateLimitPath)) {
    findings.push({
      id: "RATELIMIT-missing",
      category: "rate-limit",
      severity: "critical",
      title: "No rate limiting implementation found",
      file: "apps/api/src/lib/rate-limit.ts",
      description: "No rate-limit.ts file found. All endpoints are unprotected from abuse.",
      recommendation: "Implement rate limiting middleware with per-user and per-IP buckets.",
    });
    return findings;
  }

  const rateLimitContent = readFile(rateLimitPath);

  // Check if rate limiter is applied globally
  if (fs.existsSync(indexPath)) {
    const indexContent = readFile(indexPath);
    if (!indexContent.includes("rateLimit") && !indexContent.includes("rateLimiter")) {
      findings.push({
        id: "RATELIMIT-not-applied",
        category: "rate-limit",
        severity: "high",
        title: "Rate limiter defined but not applied in main server",
        file: relPath(indexPath),
        description: "Rate limiting middleware exists but may not be applied to the main Hono app.",
        recommendation: "Ensure rate limiter middleware is applied to /trpc/* and /upload/* routes.",
      });
    }
  }

  // Check for per-endpoint granularity
  if (!rateLimitContent.includes("export") || !rateLimitContent.includes("/upload")) {
    findings.push({
      id: "RATELIMIT-no-upload-category",
      category: "rate-limit",
      severity: "medium",
      title: "No dedicated rate limit category for upload endpoints",
      file: relPath(rateLimitPath),
      description: "Upload endpoints may share the standard rate limit bucket, allowing more uploads than intended.",
      recommendation: "Add a dedicated rate limit category for upload endpoints with stricter limits.",
    });
  }

  // Check for export endpoint rate limiting
  if (!rateLimitContent.includes("export")) {
    findings.push({
      id: "RATELIMIT-no-export-limit",
      category: "rate-limit",
      severity: "medium",
      title: "No dedicated rate limit for export endpoints",
      file: relPath(rateLimitPath),
      description:
        "Export endpoints fetch large datasets (up to 10k rows × 11 tables). Standard rate limits may not be sufficient.",
      recommendation: "Add a stricter rate limit category for export/reporting endpoints.",
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function severityOrder(s: Severity): number {
  return { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[s];
}

function severityColor(s: Severity): string {
  return {
    critical: "\x1b[41m\x1b[37m",
    high: "\x1b[31m",
    medium: "\x1b[33m",
    low: "\x1b[36m",
    info: "\x1b[90m",
  }[s];
}

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function printReport(findings: Finding[], routers: RouterAnalysis[]): void {
  const sorted = [...findings].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));

  const counts = {
    critical: sorted.filter((f) => f.severity === "critical").length,
    high: sorted.filter((f) => f.severity === "high").length,
    medium: sorted.filter((f) => f.severity === "medium").length,
    low: sorted.filter((f) => f.severity === "low").length,
    info: sorted.filter((f) => f.severity === "info").length,
  };

  const totalProcedures = routers.reduce((sum, r) => sum + r.procedures.length, 0);
  const mutations = routers.reduce(
    (sum, r) => sum + r.procedures.filter((p) => p.type === "mutation").length,
    0
  );
  const queries = routers.reduce(
    (sum, r) => sum + r.procedures.filter((p) => p.type === "query").length,
    0
  );
  const withHouseholdCheck = routers.reduce(
    (sum, r) => sum + r.procedures.filter((p) => p.hasHouseholdCheck).length,
    0
  );

  console.log(`\n${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  PetForce Security Audit Report${RESET}`);
  console.log(`${BOLD}  Generated: ${new Date().toISOString()}${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}\n`);

  console.log(`${BOLD}SCAN SUMMARY${RESET}`);
  console.log(`  Routers scanned:      ${routers.length}`);
  console.log(`  Total procedures:     ${totalProcedures} (${mutations} mutations, ${queries} queries)`);
  console.log(`  Household-gated:      ${withHouseholdCheck}/${totalProcedures} (${Math.round((withHouseholdCheck / totalProcedures) * 100)}%)`);
  console.log(`  Total findings:       ${sorted.length}`);
  console.log(
    `  ${severityColor("critical")}CRITICAL: ${counts.critical}${RESET}  ${severityColor("high")}HIGH: ${counts.high}${RESET}  ${severityColor("medium")}MEDIUM: ${counts.medium}${RESET}  ${severityColor("low")}LOW: ${counts.low}${RESET}  INFO: ${counts.info}`
  );

  console.log(`\n${BOLD}─── FINDINGS ───────────────────────────────────────────────────${RESET}\n`);

  for (const finding of sorted) {
    const color = severityColor(finding.severity);
    console.log(`${color}[${finding.severity.toUpperCase()}]${RESET} ${BOLD}${finding.title}${RESET}`);
    console.log(`  ID:     ${finding.id}`);
    console.log(`  File:   ${finding.file}${finding.line ? `:${finding.line}` : ""}`);
    console.log(`  Issue:  ${finding.description}`);
    console.log(`  Fix:    ${finding.recommendation}`);
    console.log();
  }

  // Router coverage table
  console.log(`${BOLD}─── ROUTER SECURITY POSTURE ─────────────────────────────────────${RESET}\n`);
  console.log(
    `  ${"Router".padEnd(18)} ${"Queries".padEnd(8)} ${"Mutations".padEnd(10)} ${"HH Check".padEnd(10)} ${"Role Check".padEnd(12)} Status`
  );
  console.log(`  ${"─".repeat(70)}`);

  for (const router of routers) {
    const qs = router.procedures.filter((p) => p.type === "query");
    const ms = router.procedures.filter((p) => p.type === "mutation");
    const allChecked = router.procedures.every((p) => p.hasHouseholdCheck);
    const anyRole = router.procedures.some((p) => p.hasRoleCheck);
    const status = allChecked ? "\x1b[32m✓ PASS\x1b[0m" : "\x1b[31m✗ GAPS\x1b[0m";

    console.log(
      `  ${router.name.padEnd(18)} ${String(qs.length).padEnd(8)} ${String(ms.length).padEnd(10)} ${(allChecked ? "YES" : "PARTIAL").padEnd(10)} ${(anyRole ? "YES" : "NO").padEnd(12)} ${status}`
    );
  }

  console.log(`\n${BOLD}═══════════════════════════════════════════════════════════════${RESET}\n`);
}

function printJSON(findings: Finding[], routers: RouterAnalysis[]): void {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      routersScanned: routers.length,
      totalProcedures: routers.reduce((sum, r) => sum + r.procedures.length, 0),
      totalFindings: findings.length,
      bySeverity: {
        critical: findings.filter((f) => f.severity === "critical").length,
        high: findings.filter((f) => f.severity === "high").length,
        medium: findings.filter((f) => f.severity === "medium").length,
        low: findings.filter((f) => f.severity === "low").length,
        info: findings.filter((f) => f.severity === "info").length,
      },
    },
    findings: findings.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity)),
    routers: routers.map((r) => ({
      name: r.name,
      file: relPath(r.file),
      procedures: r.procedures,
    })),
  };

  console.log(JSON.stringify(report, null, 2));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const jsonOutput = process.argv.includes("--json");

  // Scan all routers
  const routerFiles = fs
    .readdirSync(ROUTERS_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => path.join(ROUTERS_DIR, f));

  const routers = routerFiles.map(analyzeRouter);

  // Run all audits
  const findings: Finding[] = [
    ...auditRBAC(routers),
    ...auditIDOR(routers),
    ...auditUploads(),
    ...auditRateLimiting(),
  ];

  if (jsonOutput) {
    printJSON(findings, routers);
  } else {
    printReport(findings, routers);
  }

  // Exit with non-zero if critical or high findings
  const hasBlocking = findings.some((f) => f.severity === "critical" || f.severity === "high");
  process.exit(hasBlocking ? 1 : 0);
}

main();
