import { Queue } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { env } from "./env.js";
import { logger } from "./logger.js";

// ---------------------------------------------------------------------------
// BullMQ queue setup — requires REDIS_URL (standard Redis protocol).
// When REDIS_URL is not set, queues are unavailable and enqueue calls are
// silently dropped (same graceful-degradation pattern as rate-limit.ts).
// ---------------------------------------------------------------------------

function parseRedisUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    tls: parsed.protocol === "rediss:" ? {} : undefined,
  };
}

const connection: ConnectionOptions | null = env.REDIS_URL
  ? parseRedisUrl(env.REDIS_URL)
  : null;

// ---------------------------------------------------------------------------
// Queue definitions — one queue per job domain for isolation + monitoring.
// ---------------------------------------------------------------------------

export const QUEUE_NAMES = {
  /** Image processing (avatar resize, thumbnail generation) */
  imageProcessing: "image-processing",
  /** Email/push notifications */
  notifications: "notifications",
  /** Data export generation (CSV, PDF) */
  exports: "exports",
  /** Gamification recalculation */
  gamification: "gamification",
} as const;

type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<QueueName, Queue>();

function getQueue(name: QueueName): Queue | null {
  if (!connection) return null;

  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
    queues.set(name, queue);
  }
  return queue;
}

// ---------------------------------------------------------------------------
// Job type definitions
// ---------------------------------------------------------------------------

export interface ImageProcessingJob {
  type: "avatar-resize" | "thumbnail";
  entityType: "pet" | "member" | "household";
  entityId: string;
  sourceUrl: string;
  householdId: string;
}

export interface NotificationJob {
  type: "email" | "push";
  recipientUserId: string;
  householdId: string;
  template: string;
  data: Record<string, unknown>;
}

export interface ExportJob {
  type: "household-export";
  householdId: string;
  requestedBy: string;
  format: "csv" | "json";
}

export interface GamificationJob {
  type: "recalculate";
  householdId: string;
}

// ---------------------------------------------------------------------------
// Enqueue helpers — gracefully degrade when Redis is unavailable.
// ---------------------------------------------------------------------------

export async function enqueueImageProcessing(
  job: ImageProcessingJob
): Promise<string | null> {
  const queue = getQueue(QUEUE_NAMES.imageProcessing);
  if (!queue) {
    logger.debug({ job }, "Image processing queue unavailable — skipping");
    return null;
  }
  const added = await queue.add(job.type, job, {
    jobId: `${job.entityType}:${job.entityId}`,
  });
  return added.id ?? null;
}

export async function enqueueNotification(
  job: NotificationJob
): Promise<string | null> {
  const queue = getQueue(QUEUE_NAMES.notifications);
  if (!queue) {
    logger.debug({ job }, "Notification queue unavailable — skipping");
    return null;
  }
  const added = await queue.add(job.type, job);
  return added.id ?? null;
}

export async function enqueueExport(
  job: ExportJob
): Promise<string | null> {
  const queue = getQueue(QUEUE_NAMES.exports);
  if (!queue) {
    logger.debug({ job }, "Export queue unavailable — skipping");
    return null;
  }
  const added = await queue.add(job.type, job, {
    jobId: `export:${job.householdId}:${job.requestedBy}`,
  });
  return added.id ?? null;
}

export async function enqueueGamificationRecalc(
  job: GamificationJob
): Promise<string | null> {
  const queue = getQueue(QUEUE_NAMES.gamification);
  if (!queue) {
    logger.debug({ job }, "Gamification queue unavailable — skipping");
    return null;
  }
  const added = await queue.add(job.type, job, {
    jobId: `gamification:${job.householdId}`,
    // Deduplicate: if a recalc is already pending, don't add another
    delay: 5000,
  });
  return added.id ?? null;
}

// ---------------------------------------------------------------------------
// Shutdown — close all queue connections.
// ---------------------------------------------------------------------------

export async function closeQueues(): Promise<void> {
  const closePromises: Promise<void>[] = [];
  for (const [name, queue] of queues) {
    logger.info({ queue: name }, "Closing queue connection");
    closePromises.push(queue.close());
  }
  await Promise.all(closePromises);
  queues.clear();
}

/** Check if the job queue system is available (REDIS_URL configured). */
export function isQueueAvailable(): boolean {
  return connection !== null;
}

/** Get the Redis connection options (for use by worker process). */
export function getQueueConnection(): ConnectionOptions | null {
  return connection;
}
