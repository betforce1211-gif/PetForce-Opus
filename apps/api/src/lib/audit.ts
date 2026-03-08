import { db, activityLog } from "@petforce/db";

interface AuditEntry {
  householdId: string;
  action: string;
  subjectType: string;
  subjectId?: string;
  subjectName?: string;
  performedBy: string;
  metadata?: Record<string, unknown>;
}

export function logActivity(entry: AuditEntry): Promise<void> {
  return db
    .insert(activityLog)
    .values({
      householdId: entry.householdId,
      action: entry.action,
      subjectType: entry.subjectType,
      subjectId: entry.subjectId ?? null,
      subjectName: entry.subjectName ?? null,
      performedBy: entry.performedBy,
      metadata: entry.metadata ?? null,
    })
    .then(() => {});
}
