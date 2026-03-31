/**
 * Background job worker process.
 *
 * Run separately from the API server:
 *   pnpm worker          (dev, with tsx watch)
 *   node dist/worker.js  (prod)
 *
 * Requires REDIS_URL to be set. Exits immediately if not configured.
 */

import { Worker, Queue } from "bullmq";
import { logger } from "./lib/logger.js";
import { QUEUE_NAMES, getQueueConnection } from "./lib/queue.js";
import { processNotificationJob } from "./lib/notifications.js";
import { runAllNotificationTriggers } from "./lib/notification-triggers.js";
import type {
  ImageProcessingJob,
  NotificationJob,
  ExportJob,
  GamificationJob,
} from "./lib/queue.js";

const connection = getQueueConnection();

if (!connection) {
  logger.error("REDIS_URL is not set — worker cannot start without a Redis connection.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Job processors
// ---------------------------------------------------------------------------

async function processImageJob(job: ImageProcessingJob): Promise<void> {
  logger.info(
    { jobType: job.type, entity: `${job.entityType}:${job.entityId}` },
    "Processing image job"
  );
  // TODO: Implement image resizing with sharp
  // 1. Download source image from job.sourceUrl
  // 2. Resize to standard dimensions (avatar: 256x256, thumbnail: 128x128)
  // 3. Upload resized image to Supabase Storage
  // 4. Update entity record with new URL
  logger.info({ jobType: job.type, entityId: job.entityId }, "Image job completed");
}

async function processExportJob(job: ExportJob): Promise<void> {
  logger.info(
    { householdId: job.householdId, format: job.format, requestedBy: job.requestedBy },
    "Processing export job"
  );
  // TODO: Implement data export
  // 1. Query all household data (pets, activities, health records, etc.)
  // 2. Format as CSV or JSON
  // 3. Upload to Supabase Storage
  // 4. Notify user that export is ready
  logger.info({ householdId: job.householdId }, "Export job completed");
}

async function processGamificationJob(job: GamificationJob): Promise<void> {
  logger.info({ householdId: job.householdId }, "Processing gamification recalc");
  // The actual recalculation logic lives in the gamification router.
  // Import it here to reuse the same code path.
  // TODO: Extract recalculation logic into a shared function
  // that both the router mutation and this worker can call.
  logger.info({ householdId: job.householdId }, "Gamification recalc completed");
}

// ---------------------------------------------------------------------------
// Workers — one per queue for concurrency isolation.
// ---------------------------------------------------------------------------

const workers: Worker[] = [];

const imageWorker = new Worker(
  QUEUE_NAMES.imageProcessing,
  async (job) => processImageJob(job.data as ImageProcessingJob),
  { connection, concurrency: 3 }
);
workers.push(imageWorker);

const notificationWorker = new Worker(
  QUEUE_NAMES.notifications,
  async (job) => processNotificationJob(job.data as NotificationJob),
  { connection, concurrency: 5 }
);
workers.push(notificationWorker);

const exportWorker = new Worker(
  QUEUE_NAMES.exports,
  async (job) => processExportJob(job.data as ExportJob),
  { connection, concurrency: 2 }
);
workers.push(exportWorker);

const gamificationWorker = new Worker(
  QUEUE_NAMES.gamification,
  async (job) => processGamificationJob(job.data as GamificationJob),
  { connection, concurrency: 1 }
);
workers.push(gamificationWorker);

// ---------------------------------------------------------------------------
// Notification trigger scheduler — runs every 15 minutes to scan for events
// that should generate notifications (overdue meds, upcoming vet visits, etc.)
// ---------------------------------------------------------------------------

const SCHEDULER_QUEUE_NAME = "notification-scheduler";

const schedulerQueue = new Queue(SCHEDULER_QUEUE_NAME, { connection });

// Register a repeatable job that fires every 15 minutes
schedulerQueue.upsertJobScheduler(
  "notification-trigger-scan",
  { every: 15 * 60 * 1000 },
  { name: "trigger-scan" },
).catch((err) => {
  logger.error({ err }, "Failed to register notification scheduler");
});

const schedulerWorker = new Worker(
  SCHEDULER_QUEUE_NAME,
  async () => {
    await runAllNotificationTriggers();
  },
  { connection, concurrency: 1 },
);
workers.push(schedulerWorker);

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

for (const worker of workers) {
  worker.on("failed", (job, err) => {
    logger.error(
      { queue: worker.name, jobId: job?.id, attempt: job?.attemptsMade, err },
      "Job failed"
    );
  });

  worker.on("completed", (job) => {
    logger.info({ queue: worker.name, jobId: job.id }, "Job completed");
  });

  worker.on("error", (err) => {
    logger.error({ queue: worker.name, err }, "Worker error");
  });
}

logger.info(
  { queues: Object.values(QUEUE_NAMES) },
  "Background workers started"
);

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string) {
  logger.info({ signal }, "Worker shutting down gracefully...");

  const closePromises = workers.map((w) => w.close());
  await Promise.all(closePromises);

  logger.info("All workers closed.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection in worker");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception in worker — shutting down");
  shutdown("uncaughtException");
});
