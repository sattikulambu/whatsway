/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import { eq, and, inArray } from "drizzle-orm";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import {
  notifications,
  sentNotifications,
  notificationTemplates,
  userNotificationPreferences,
  users,
} from "@shared/schema";
import { db } from "server/db";
import nodemailer from "nodemailer";

export const NOTIFICATION_EVENTS = {
  NEW_MESSAGE: 'new_message',
  TEMPLATE_APPROVED: 'template_approved',
  TEMPLATE_REJECTED: 'template_rejected',
  CAMPAIGN_COMPLETED: 'campaign_completed',
  CAMPAIGN_FAILED: 'campaign_failed',
  CHANNEL_HEALTH_WARNING: 'channel_health_warning',
  TICKET_REPLY: 'ticket_reply',
} as const;

function replaceVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

async function getEmailTransporter() {
  const { getSMTPConfig } = await import("server/controllers/smtp.controller");
  const config = await getSMTPConfig();
  if (config) {
    const port = parseInt(config.port, 10);
    const secure = port === 465;
    return nodemailer.createTransport({
      host: config.host,
      port,
      secure,
      ...(!secure && (port === 587 || !!config.secure) ? { requireTLS: true } : {}),
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

export async function sendNotificationEmail(to: string, subject: string, htmlBody: string) {
  try {
    const transporter = await getEmailTransporter();
    const { getSMTPConfig } = await import("server/controllers/smtp.controller");
    const config = await getSMTPConfig();
    const fromName = config?.fromName || "Notifications";
    const fromEmail = config?.fromEmail || "noreply@example.com";

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✉️ [Notification Email] Sent to:", to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ [Notification Email] Failed to send:", error);
    return { success: false, error };
  }
}

export async function getUserNotificationPreferences(userId: string) {
  const prefs = await db
    .select()
    .from(userNotificationPreferences)
    .where(eq(userNotificationPreferences.userId, userId));

  if (prefs.length === 0) {
    const defaults: Record<string, { inAppEnabled: boolean; emailEnabled: boolean; soundEnabled: boolean }> = {};
    for (const event of Object.values(NOTIFICATION_EVENTS)) {
      defaults[event] = {
        inAppEnabled: true,
        emailEnabled: true,
        soundEnabled: true,
      };
    }
    return defaults;
  }

  const result: Record<string, { inAppEnabled: boolean; emailEnabled: boolean; soundEnabled: boolean }> = {};
  for (const pref of prefs) {
    result[pref.eventType] = {
      inAppEnabled: pref.inAppEnabled ?? true,
      emailEnabled: pref.emailEnabled ?? true,
      soundEnabled: pref.soundEnabled ?? true,
    };
  }

  for (const event of Object.values(NOTIFICATION_EVENTS)) {
    if (!result[event]) {
      result[event] = {
        inAppEnabled: true,
        emailEnabled: true,
        soundEnabled: true,
      };
    }
  }

  return result;
}

export async function updateUserNotificationPreference(
  userId: string,
  eventType: string,
  prefs: { inAppEnabled?: boolean; emailEnabled?: boolean; soundEnabled?: boolean }
) {
  const existing = await db
    .select()
    .from(userNotificationPreferences)
    .where(
      and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.eventType, eventType)
      )
    );

  if (existing.length > 0) {
    const [updated] = await db
      .update(userNotificationPreferences)
      .set(prefs)
      .where(
        and(
          eq(userNotificationPreferences.userId, userId),
          eq(userNotificationPreferences.eventType, eventType)
        )
      )
      .returning();
    return updated;
  } else {
    const [inserted] = await db
      .insert(userNotificationPreferences)
      .values({
        userId,
        eventType,
        inAppEnabled: prefs.inAppEnabled ?? true,
        emailEnabled: prefs.emailEnabled ?? true,
        soundEnabled: prefs.soundEnabled ?? true,
      })
      .returning();
    return inserted;
  }
}

function generateCleanMessage(eventType: string, variables: Record<string, string>): string {
  switch (eventType) {
    case NOTIFICATION_EVENTS.NEW_MESSAGE:
      return `New message from ${variables.contactName || variables.contactPhone || "Unknown"}: ${variables.messagePreview || ""}`;
    case NOTIFICATION_EVENTS.TEMPLATE_APPROVED:
      return `Your template "${variables.templateName || ""}" has been approved and is ready to use.`;
    case NOTIFICATION_EVENTS.TEMPLATE_REJECTED:
      return `Your template "${variables.templateName || ""}" was rejected. ${variables.rejectionReason ? "Reason: " + variables.rejectionReason : ""}`;
    case NOTIFICATION_EVENTS.CAMPAIGN_COMPLETED:
      return `Campaign "${variables.campaignName || ""}" completed. Sent: ${variables.totalSent || "0"}, Delivered: ${variables.deliveredCount || "0"}, Failed: ${variables.failedCount || "0"}.`;
    case NOTIFICATION_EVENTS.CAMPAIGN_FAILED:
      return `Campaign "${variables.campaignName || ""}" had issues. Failed: ${variables.failedCount || "0"}. ${variables.errorMessage || ""}`;
    case NOTIFICATION_EVENTS.CHANNEL_HEALTH_WARNING:
      return `Channel ${variables.channelName || ""} (${variables.channelPhone || ""}) health: ${variables.healthStatus || "Warning"}. Quality: ${variables.qualityRating || "Unknown"}.`;
    case NOTIFICATION_EVENTS.TICKET_REPLY:
      return `New reply on ticket "${variables.ticketTitle || ""}": ${variables.messagePreview || ""}`;
    default:
      return variables.messagePreview || "You have a new notification.";
  }
}

function getNotificationLink(eventType: string): string {
  switch (eventType) {
    case NOTIFICATION_EVENTS.NEW_MESSAGE:
      return "/inbox";
    case NOTIFICATION_EVENTS.TEMPLATE_APPROVED:
    case NOTIFICATION_EVENTS.TEMPLATE_REJECTED:
      return "/templates";
    case NOTIFICATION_EVENTS.CAMPAIGN_COMPLETED:
    case NOTIFICATION_EVENTS.CAMPAIGN_FAILED:
      return "/campaigns";
    case NOTIFICATION_EVENTS.CHANNEL_HEALTH_WARNING:
      return "/settings";
    case NOTIFICATION_EVENTS.TICKET_REPLY:
      return "/support";
    default:
      return "/notifications";
  }
}

export async function triggerNotification(
  eventType: string,
  variables: Record<string, string>,
  targetUserIds: string[],
  channelId?: string
) {
  try {
    const [template] = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.eventType, eventType));

    if (!template) {
      console.warn(`[Notification] No template found for event: ${eventType}`);
      return { success: false, reason: "Template not found" };
    }

    const filteredUsers = await db
      .select()
      .from(users)
      .where(inArray(users.id, targetUserIds));

    const resolvedTitle = replaceVariables(template.subject, variables);
    const resolvedHtmlBody = replaceVariables(template.htmlBody, variables);
    const cleanMessage = generateCleanMessage(eventType, variables);
    const link = getNotificationLink(eventType);

    for (const user of filteredUsers) {
      const userPrefs = await getUserNotificationPreferences(user.id);
      const eventPrefs = userPrefs[eventType] || { inAppEnabled: true, emailEnabled: true, soundEnabled: true };

      const userVariables = { ...variables, userName: user.username || user.email || "User" };
      const userResolvedTitle = replaceVariables(template.subject, userVariables);
      const userResolvedHtmlBody = replaceVariables(template.htmlBody, userVariables);

      if (template.isInAppEnabled && eventPrefs.inAppEnabled) {
        const [notif] = await db
          .insert(notifications)
          .values({
            title: userResolvedTitle,
            message: cleanMessage,
            type: eventType,
            createdBy: "system",
            channelId: channelId || null,
            targetType: "single",
            targetIds: [user.id],
            status: "sent",
            sentAt: new Date(),
          })
          .returning();

        await db.insert(sentNotifications).values({
          notificationId: notif.id,
          userId: user.id,
        });

        const io = (global as any).io;
        if (io) {
          io.to(`user:${user.id}`).emit('notification:new', {
            id: notif.id,
            title: userResolvedTitle,
            message: cleanMessage,
            type: eventType,
            link,
            channelId: channelId || null,
            createdAt: notif.createdAt,
            soundEnabled: eventPrefs.soundEnabled !== false,
          });
        }
      }

      if (template.isEmailEnabled && eventPrefs.emailEnabled && user.email) {
        await sendNotificationEmail(user.email, userResolvedTitle, userResolvedHtmlBody);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("[Notification] Error triggering notification:", error);
    return { success: false, error };
  }
}
