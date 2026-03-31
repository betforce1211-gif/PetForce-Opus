/**
 * Email templates for PetForce notifications.
 *
 * Each template function returns { subject, html } for use with Resend.
 * Templates use simple inline HTML — no heavy template engine needed.
 */

export interface TemplateData {
  petName: string;
  householdName: string;
  memberName: string;
  [key: string]: unknown;
}

function layout(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a2e;">
  <div style="border-bottom: 3px solid #6366F1; padding-bottom: 12px; margin-bottom: 24px;">
    <h2 style="margin: 0; color: #6366F1;">🐾 PetForce</h2>
  </div>
  ${body}
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
    <p>You're receiving this because you're a member of a PetForce household.</p>
  </div>
</body>
</html>`;
}

export function medicationReminder(data: TemplateData & { medicationName: string; dosage?: string }) {
  const dosageInfo = data.dosage ? ` (${data.dosage})` : "";
  return {
    subject: `💊 Medication reminder: ${data.medicationName} for ${data.petName}`,
    html: layout(`
      <h3 style="color: #1a1a2e;">Medication Reminder</h3>
      <p>Hi ${data.memberName},</p>
      <p><strong>${data.petName}</strong> is due for their medication:</p>
      <div style="background: #f0f0ff; border-left: 4px solid #6366F1; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <strong>${data.medicationName}</strong>${dosageInfo}
      </div>
      <p>Please log it in PetForce once administered.</p>
    `),
  };
}

export function vetVisitAlert(data: TemplateData & { visitDate: string; vetOrClinic?: string; reason?: string }) {
  const clinicInfo = data.vetOrClinic ? ` at <strong>${data.vetOrClinic}</strong>` : "";
  const reasonInfo = data.reason ? `<p>Reason: ${data.reason}</p>` : "";
  return {
    subject: `🏥 Upcoming vet visit for ${data.petName} on ${data.visitDate}`,
    html: layout(`
      <h3 style="color: #1a1a2e;">Upcoming Vet Visit</h3>
      <p>Hi ${data.memberName},</p>
      <p><strong>${data.petName}</strong> has a vet visit scheduled:</p>
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <strong>${data.visitDate}</strong>${clinicInfo}
        ${reasonInfo}
      </div>
    `),
  };
}

export function feedingReminder(data: TemplateData & { feedingLabel: string; feedingTime: string; foodType?: string }) {
  const foodInfo = data.foodType ? ` — ${data.foodType}` : "";
  return {
    subject: `🍖 Feeding reminder: ${data.feedingLabel} for ${data.petName}`,
    html: layout(`
      <h3 style="color: #1a1a2e;">Feeding Reminder</h3>
      <p>Hi ${data.memberName},</p>
      <p><strong>${data.petName}</strong> needs to be fed:</p>
      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <strong>${data.feedingLabel}</strong> at ${data.feedingTime}${foodInfo}
      </div>
      <p>Please log the feeding in PetForce once done.</p>
    `),
  };
}

export const templates = {
  "medication-reminder": medicationReminder,
  "vet-visit-alert": vetVisitAlert,
  "feeding-reminder": feedingReminder,
} as const;

export type TemplateName = keyof typeof templates;
