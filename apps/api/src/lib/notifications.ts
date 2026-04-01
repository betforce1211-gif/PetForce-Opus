/**
 * Notification delivery module — email via Resend, push via Expo.
 *
 * Both channels degrade gracefully when credentials are missing.
 */

import { env } from "./env.js";
import { logger } from "./logger.js";
import { templates, type TemplateName, type TemplateData } from "./email-templates.js";
import type { NotificationJob } from "./queue.js";

// ---------------------------------------------------------------------------
// Email delivery via Resend
// ---------------------------------------------------------------------------

async function sendEmail(
  to: string,
  template: TemplateName,
  data: TemplateData & Record<string, unknown>,
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    logger.warn({ template, to }, "RESEND_API_KEY not set — skipping email");
    return false;
  }

  const templateFn = templates[template];
  if (!templateFn) {
    logger.error({ template }, "Unknown email template");
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { subject, html } = templateFn(data as any);
  const from = env.RESEND_FROM_EMAIL ?? "PetForce <notifications@petforce.app>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body, to, template }, "Resend API error");
    throw new Error(`Resend API returned ${res.status}: ${body}`);
  }

  logger.info({ to, template }, "Email sent via Resend");
  return true;
}

// ---------------------------------------------------------------------------
// Push notification delivery via Expo
// ---------------------------------------------------------------------------

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
}

async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  if (!expoPushToken) {
    logger.warn("No push token — skipping push notification");
    return false;
  }

  const message: ExpoPushMessage = {
    to: expoPushToken,
    title,
    body,
    data,
    sound: "default",
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (env.EXPO_PUSH_ACCESS_TOKEN) {
    headers["Authorization"] = `Bearer ${env.EXPO_PUSH_ACCESS_TOKEN}`;
  }

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers,
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const respBody = await res.text();
    logger.error({ status: res.status, body: respBody, token: expoPushToken }, "Expo push API error");
    throw new Error(`Expo push API returned ${res.status}: ${respBody}`);
  }

  logger.info({ token: expoPushToken.slice(0, 20) + "..." }, "Push notification sent via Expo");
  return true;
}

// ---------------------------------------------------------------------------
// Build push content from template name + data
// ---------------------------------------------------------------------------

function buildPushContent(template: string, data: Record<string, unknown>): { title: string; body: string } {
  const petName = (data.petName as string) ?? "your pet";

  switch (template) {
    case "medication-reminder":
      return {
        title: `💊 Medication Reminder`,
        body: `${petName} is due for ${(data.medicationName as string) ?? "medication"}`,
      };
    case "vet-visit-alert":
      return {
        title: `🏥 Vet Visit Coming Up`,
        body: `${petName} has a vet visit on ${(data.visitDate as string) ?? "soon"}`,
      };
    case "feeding-reminder":
      return {
        title: `🍖 Feeding Time`,
        body: `Time to feed ${petName} — ${(data.feedingLabel as string) ?? "scheduled feeding"}`,
      };
    case "pet-added":
      return {
        title: `🐾 New Pet Added`,
        body: `${petName} has joined the household!`,
      };
    case "member-joined":
      return {
        title: `👋 New Member`,
        body: `${(data.memberName as string) ?? "Someone"} joined the household`,
      };
    case "streak-alert":
      return {
        title: `🔥 Streak Alert`,
        body: `Your care streak for ${petName} is at risk!`,
      };
    case "budget-alert":
      return {
        title: `💰 Budget Alert`,
        body: `You've reached ${(data.percentUsed as string) ?? "80%"} of your budget`,
      };
    case "achievement-alert":
      return {
        title: `🏆 Achievement Unlocked`,
        body: `You earned: ${(data.achievementName as string) ?? "a new badge"}!`,
      };
    default:
      return { title: "PetForce Notification", body: "You have a new notification." };
  }
}

// ---------------------------------------------------------------------------
// Main processor — called by the BullMQ worker
// ---------------------------------------------------------------------------

export async function processNotificationJob(job: NotificationJob): Promise<void> {
  logger.info(
    { type: job.type, recipient: job.recipientUserId, template: job.template },
    "Processing notification job",
  );

  if (job.type === "email") {
    const email = job.data.recipientEmail as string | undefined;
    if (!email) {
      logger.warn({ recipient: job.recipientUserId, template: job.template }, "No email for recipient — skipping");
      return;
    }
    await sendEmail(email, job.template as TemplateName, job.data as TemplateData & Record<string, unknown>);
  } else if (job.type === "push") {
    const pushToken = job.data.expoPushToken as string | undefined;
    if (!pushToken) {
      logger.warn({ recipient: job.recipientUserId, template: job.template }, "No push token — skipping");
      return;
    }
    const { title, body } = buildPushContent(job.template, job.data);
    await sendPushNotification(pushToken, title, body, {
      template: job.template,
      householdId: job.householdId,
    });
  }

  logger.info({ type: job.type, recipient: job.recipientUserId }, "Notification job completed");
}
