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

import { asyncHandler } from "../utils/async-handler";
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { storage } from "../storage";
import { z } from "zod";
import type { Contact } from "@shared/schema";
import { randomUUID } from "crypto";
import { WhatsAppApiService } from "../services/whatsapp-api";
import { triggerNotification, NOTIFICATION_EVENTS } from "../services/notification.service";
import { db, dbRead } from "../db";
import { channels, users } from "@shared/schema";
import { eq } from "drizzle-orm";

const MESSAGING_TIER_LIMITS: Record<string, number> = {
  TIER_250: 250,
  TIER_1K: 1000,
  TIER_10K: 10000,
  TIER_100K: 100000,
  UNLIMITED: Infinity,
};

export function parseMessagingTier(tier?: string): number {
  if (!tier) return 250;
  const upper = tier.toUpperCase();
  return MESSAGING_TIER_LIMITS[upper] ?? 250;
}

async function notifyCampaignCompletion(campaignId: string) {
  try {
    const campaign = await storage.getCampaign(campaignId);
    if (!campaign || !campaign.channelId) return;

    const channel = await dbRead.select().from(channels).where(eq(channels.id, campaign.channelId)).limit(1);
    const channelName = channel[0]?.name || "Unknown";
    if (!channel[0]?.createdBy) return;
    const ownerId = channel[0].createdBy;
    const ownerAndTeam = await dbRead.select().from(users).where(eq(users.id, ownerId));
    const teamMembers = await dbRead.select().from(users).where(eq(users.createdBy, ownerId));
    const allUsers = [...ownerAndTeam, ...teamMembers];
    const targetUserIds = [...new Set(allUsers.map((u) => u.id))];
    if (targetUserIds.length === 0) return;

    const hasFailed = (campaign.failedCount || 0) > (campaign.sentCount || 0);
    const eventType = hasFailed ? NOTIFICATION_EVENTS.CAMPAIGN_FAILED : NOTIFICATION_EVENTS.CAMPAIGN_COMPLETED;

    await triggerNotification(eventType, {
      campaignName: campaign.name || "Untitled Campaign",
      totalSent: String(campaign.sentCount || 0),
      deliveredCount: String((campaign.sentCount || 0) - (campaign.failedCount || 0)),
      failedCount: String(campaign.failedCount || 0),
      errorMessage: hasFailed ? "Some messages could not be delivered" : "",
      channelName,
    }, targetUserIds, campaign.channelId || undefined);
  } catch (err) {
    console.error("Error sending campaign completion notification:", err);
  }
}

const variableValueSchema = z.object({
  type: z.enum(["firstName", "lastName", "fullName", "phone", "custom"]),
  value: z.string().optional(),
});

const buttonMappingSchema = z.record(z.object({
  type: z.string().optional(),
  value: z.string().optional(),
}));

const variableMappingSchema = z.object({
  buttons: buttonMappingSchema.optional(),
  headerVars: z.record(variableValueSchema).optional(),
}).catchall(variableValueSchema);

const createCampaignSchema = z.object({
  channelId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  campaignType: z.enum(["contacts", "csv", "api"]),
  type: z.enum(["marketing", "transactional"]),
  apiType: z.enum(["cloud_api", "marketing_messages", "mm_lite"]),
  templateId: z.string(),
  templateName: z.string(),
  templateLanguage: z.string(),
  variableMapping: variableMappingSchema.optional(),
  status: z.string(),
  scheduledAt: z.string().nullable(),
  contactGroups: z.array(z.string()).optional(),
  csvData: z.array(z.any()).optional(),
  recipientCount: z.number(),
  autoRetry: z.boolean().optional(),
});

const updateStatusSchema = z.object({
  status: z.string(),
});

export const campaignsController = {
  // Get all campaigns
  getCampaigns: asyncHandler(async (req, res) => {
    const channelId = req.headers["x-channel-id"] as string;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const user = (req.session as any)?.user;

    if (channelId) {
      if (user && user.role !== 'superadmin') {
        const ownerId = user.role === 'team' ? user.createdBy : user.id;
        const channels = await storage.getChannelsByUserId(ownerId);
        const channelIds = channels.map((ch: any) => ch.id);
        if (!channelIds.includes(channelId)) {
          return res.status(403).json({ error: 'Access denied to this channel' });
        }
      }
      const campaigns = await storage.getCampaignsByChannel(channelId, page, limit);
      res.json(campaigns);
    } else if (user && user.role === 'superadmin') {
      const campaigns = await storage.getCampaigns(page, limit);
      res.json(campaigns);
    } else {
      const ownerId = user?.role === 'team' ? user?.createdBy : user?.id;
      if (!ownerId) return res.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      const channels = await storage.getChannelsByUserId(ownerId);
      if (channels.length === 0) return res.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      const campaigns = await storage.getCampaignsByChannel(channels[0].id, page, limit);
      res.json(campaigns);
    }
  }),

  // Get campaign by ID
  getCampaign: asyncHandler(async (req, res) => {
    const campaign = await storage.getCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    const user = (req.session as any)?.user;
    if (user && user.role !== 'superadmin' && campaign.channelId) {
      const ownerId = user.role === 'team' ? user.createdBy : user.id;
      const channels = await storage.getChannelsByUserId(ownerId);
      const channelIds = channels.map((ch: any) => ch.id);
      if (!channelIds.includes(campaign.channelId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    res.json(campaign);
  }),


 getCampaignByUserID: asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const user = (req.session as any)?.user;

  if (user && user.role !== 'superadmin') {
    const ownerId = user.role === 'team' ? user.createdBy : user.id;
    if (userId !== ownerId && userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  const page = Number(req.body.page) || 1;
  const limit = Number(req.body.limit) || 10;

  const campaign = await storage.getCampaignByUserId(userId, page, limit);

  res.json(campaign);
}),



  createCampaign: asyncHandler(async (req, res) => {
  const data = createCampaignSchema.parse(req.body);

  if (!req.user?.id) {
    return res
      .status(401)
      .json({ status: "error", message: "User not authenticated" });
  }

  const createdBy = req.user.id;

  let apiKey: string | undefined;
  let apiEndpoint: string | undefined;
  if (data.campaignType === "api") {
    apiKey = `ww_${randomUUID().replace(/-/g, "")}`;
    apiEndpoint = `${req.protocol}://${req.get("host")}/api/campaigns/send/${apiKey}`;
  }

  let contactIds: string[] = [];
  if (data.campaignType === "csv" && data.csvData) {
    for (const row of data.csvData) {
      if (row.phone) {
        let contact = await storage.getContactByPhone(row.phone);
        if (!contact) {
          contact = await storage.createContact({
            channelId: data.channelId,
            name: row.name || row.phone,
            phone: row.phone,
            email: row.email || null,
            groups: ["csv_import"],
            tags: [`campaign_${data.name}`],
          });
        }
        contactIds.push(contact.id);
      }
    }
  } else if (data.campaignType === "contacts") {
    contactIds = data.contactGroups || [];
  }

  const recipientCount = contactIds.length;

  const channel = await storage.getChannel(data.channelId);
  if (!channel) {
    return res.status(400).json({ error: "Channel not found" });
  }
  const messagingLimit = parseMessagingTier(
    (channel.healthDetails as any)?.messaging_limit
  );
  if (recipientCount > messagingLimit) {
    return res.status(400).json({
      error: `Your channel's messaging limit is ${messagingLimit.toLocaleString()} messages per 24 hours. You selected ${recipientCount.toLocaleString()} recipients. Please reduce the number of contacts or upgrade your WhatsApp tier.`,
    });
  }

  // Build campaign object (to save + for runner)
  const campaignDataToSave = {
    ...data,
    apiKey,
    apiEndpoint,
    recipientCount,
    contactGroups: contactIds,
    scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    variableMapping: data.variableMapping,
    createdBy,
  };

  // Save campaign to DB
  const campaign = await storage.createCampaign(campaignDataToSave);

  // If active and not scheduled, start campaign immediately
  if (data.status === "active" && !data.scheduledAt) {
    await startCampaignExecution(campaign.id, {
      ...campaign,
      ...campaignDataToSave,
    });
  }

  res.json(campaign);
}),

  // Update campaign status
  updateCampaignStatus: asyncHandler(async (req, res) => {
    const { status } = updateStatusSchema.parse(req.body);
    const campaign = await storage.updateCampaign(req.params.id, { status });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // If reactivating a campaign, start execution
    if (status === "active") {
      await startCampaignExecution(campaign.id);
    }

    res.json(campaign);
  }),

  // Delete campaign
  deleteCampaign: asyncHandler(async (req, res) => {
    const deleted = await storage.deleteCampaign(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    res.json({ success: true });
  }),

  // Start campaign execution
  startCampaign: asyncHandler(async (req, res) => {
    const campaign = await storage.getCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    await startCampaignExecution(campaign.id);
    res.json({ success: true, message: "Campaign started" });
  }),

  // Get campaign analytics
  getCampaignAnalytics: asyncHandler(async (req, res) => {
    const campaign = await storage.getCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    if (!campaign.deliveredCount) {
      return res
        .status(400)
        .json({ error: "No messages delivered yet for this campaign" });
    }
    if (!campaign.sentCount) {
      return res
        .status(400)
        .json({ error: "No messages sent yet for this campaign" });
    }
    if (!campaign.recipientCount) {
      return res
        .status(400)
        .json({ error: "No recipients found for this campaign" });
    }
    if (!campaign.readCount) {
      return res
        .status(400)
        .json({ error: "No messages read yet for this campaign" });
    }

    // Return campaign metrics
    res.json({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      metrics: {
        recipientCount: campaign.recipientCount,
        sentCount: campaign.sentCount,
        deliveredCount: campaign.deliveredCount,
        readCount: campaign.readCount,
        repliedCount: campaign.repliedCount,
        failedCount: campaign.failedCount,
        deliveryRate: campaign.sentCount
          ? ((campaign.deliveredCount / campaign.recipientCount) * 100).toFixed(
              2
            )
          : 0,
        readRate: campaign.deliveredCount
          ? ((campaign.readCount / campaign.deliveredCount) * 100).toFixed(2)
          : 0,
      },
      createdAt: campaign.createdAt,
      completedAt: campaign.completedAt,
    });
  }),

  // API campaign endpoint
  sendApiCampaign: asyncHandler(async (req, res) => {
    const { apiKey } = req.params;

    // Find campaign by API key
    const campaigns = await storage.getCampaigns();
    const campaign = campaigns.find((c) => c.apiKey === apiKey);

    if (!campaign || campaign.campaignType !== "api") {
      return res.status(401).json({ error: "Invalid API key" });
    }

    if (campaign.status !== "active") {
      return res.status(400).json({ error: "Campaign is not active" });
    }

    // Get channel
    if (!campaign.channelId) {
      return res
        .status(400)
        .json({ error: "Channel ID is missing in campaign" });
    }
    const channel = await storage.getChannel(campaign.channelId);
    if (!channel) {
      return res.status(400).json({ error: "Channel not found" });
    }

    // Parse request body
    const { phone, variables = {} } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Get template

    if (!campaign.templateId) {
      return res
        .status(400)
        .json({ error: "Template ID is missing in campaign" });
    }
    const template = await storage.getTemplate(campaign.templateId);
    if (!template) {
      return res.status(400).json({ error: "Template not found" });
    }

    // Build WhatsApp API components from variableMapping + variables
    const apiComponents: any[] = [];
    const mapping = campaign.variableMapping as any;

    // BODY variables
    const bodyText = template.body || "";
    const bodyVarMatches = bodyText.match(/\{\{\d+\}\}/g) || [];
    if (bodyVarMatches.length > 0) {
      const bodyComp: any = { type: "body", parameters: [] };
      for (const varText of bodyVarMatches) {
        const idx = varText.replace(/\D/g, "");
        const mapObj = mapping?.[idx];
        let value = "";
        if (mapObj?.type === "custom") {
          value = mapObj.value || variables?.[mapObj.value] || "";
        } else if (mapObj?.type && variables) {
          value = variables[mapObj.type] || "";
        } else if (variables) {
          value = variables[idx] || "";
        }
        bodyComp.parameters.push({ type: "text", text: value });
      }
      apiComponents.push(bodyComp);
    }

    // HEADER media
    if (template.mediaUrl) {
      const mediaType = (template.mediaType || "image").toLowerCase();
      if (mediaType === "image") {
        apiComponents.push({ type: "header", parameters: [{ type: "image", image: { id: template.mediaUrl } }] });
      } else if (mediaType === "video") {
        apiComponents.push({ type: "header", parameters: [{ type: "video", video: { id: template.mediaUrl } }] });
      } else if (mediaType === "document") {
        apiComponents.push({ type: "header", parameters: [{ type: "document", document: { id: template.mediaUrl } }] });
      }
    }

    // BUTTONS
    if (Array.isArray(template.buttons)) {
      template.buttons.forEach((button: any, index: number) => {
        if (button.type === "URL" && button.url?.includes("{{")) {
          const btnMap = mapping?.buttons?.[index.toString()];
          apiComponents.push({
            type: "button", sub_type: "url", index: index.toString(),
            parameters: [{ type: "text", text: btnMap?.value || variables?.[`button_${index}`] || "" }],
          });
        } else if (button.type === "COPY_CODE") {
          const btnMap = mapping?.buttons?.[index.toString()];
          apiComponents.push({
            type: "button", sub_type: "copy_code", index: index.toString(),
            parameters: [{ type: "coupon_code", coupon_code: btnMap?.value || button.example?.[0] || "" }],
          });
        }
      });
    }

    try {
      const response = await WhatsAppApiService.sendTemplateMessage(
        channel,
        phone,
        template.name,
        apiComponents,
        template.language || "en_US",
        true
      );
      const messageId = response.messages?.[0]?.id || `msg_${randomUUID()}`;
      const sentVia = response._sentVia || "cloud_api";

      let conversation = await storage.getConversationByPhone(phone);
      if (!conversation) {
        let contact = await storage.getContactByPhone(phone);
        if (!contact) {
          contact = await storage.createContact({
            name: phone,
            phone: phone,
            channelId: channel.id,
          });
        }
        conversation = await storage.createConversation({
          contactId: contact.id,
          contactPhone: phone,
          contactName: contact.name || phone,
          channelId: channel.id,
          unreadCount: 0,
        });
      }

      const createdMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: template.body || "",
        status: "sent",
        whatsappMessageId: messageId,
        messageType: "text",
        metadata: { apiEndpoint: sentVia },
      });

      // await storage.createMessage({
      //   conversationId: null, // API messages may not have conversation
      //   to: phone,
      //   from: channel.phoneNumber,
      //   type: "template",
      //   content: JSON.stringify({
      //     templateId: template.id,
      //     templateName: template.name,
      //     parameters: templateParams,
      //   }),
      //   status: "sent",
      //   direction: "outbound",
      //   whatsappMessageId: messageId,
      //   timestamp: new Date(),
      //   campaignId: campaign.id,
      // });

      // Update campaign stats
      await storage.updateCampaign(campaign.id, {
        sentCount: (campaign.sentCount || 0) + 1,
      });

      res.json({
        success: true,
        messageId,
        message: "Message sent successfully",
      });
    } catch (error: any) {
      // Update failed count
      await storage.updateCampaign(campaign.id, {
        failedCount: (campaign.failedCount || 0) + 1,
      });

      res.status(500).json({
        error: "Failed to send message",
        details: error.message,
      });
    }
  }),
};


export async function startCampaignExecution(
  campaignId: string,
  overrideCampaign?: any // optional override
) {
  console.log("Starting campaign execution for:", campaignId);

  // Use overrideCampaign first, otherwise fetch
  const campaign = overrideCampaign ?? (await storage.getCampaign(campaignId));

  if (!campaign) {
    console.error(`[Campaign ${campaignId}] Campaign not found`);
    return;
  }

  if (campaign.status !== "active") {
    console.warn(`[Campaign ${campaignId}] Skipping — status is "${campaign.status}", expected "active"`);
    return;
  }

  const channel = await storage.getChannel(campaign.channelId!);
  if (!channel) {
    console.error(`[Campaign ${campaignId}] Channel not found: ${campaign.channelId}`);
    await storage.updateCampaign(campaignId, { status: "failed" });
    return;
  }

  const template = await storage.getTemplate(campaign.templateId!);
  if (!template) {
    console.error(`[Campaign ${campaignId}] Template not found: ${campaign.templateId}`);
    await storage.updateCampaign(campaignId, { status: "failed" });
    return;
  }

  let contacts: Contact[] = [];
  if (campaign.campaignType === "contacts" && campaign.contactGroups) {
    for (const contactId of campaign.contactGroups) {
      const contact = await storage.getContact(contactId);
      if (contact) contacts.push(contact);
    }
  }

  console.log(`Found ${contacts.length} contacts`);

  for (const contact of contacts) {
    try {
      const components: any[] = [];

      // HEADER — media (IMAGE, VIDEO, DOCUMENT)
      if (template.mediaUrl) {
        const mediaType = (template.mediaType || "image").toLowerCase();
        if (mediaType === "image") {
          components.push({
            type: "header",
            parameters: [{ type: "image", image: { id: template.mediaUrl } }],
          });
        } else if (mediaType === "video") {
          components.push({
            type: "header",
            parameters: [{ type: "video", video: { id: template.mediaUrl } }],
          });
        } else if (mediaType === "document") {
          components.push({
            type: "header",
            parameters: [{ type: "document", document: { id: template.mediaUrl } }],
          });
        }
      }

      // HEADER — text variables (e.g. "Order #{{1}} Update")
      const headerText = template.header || "";
      const headerVars = headerText.match(/\{\{\d+\}\}/g) || [];
      if (headerVars.length > 0 && !template.mediaUrl) {
        const headerComponent: any = { type: "header", parameters: [] };
        for (const varText of headerVars) {
          const index = varText.replace(/\D/g, "");
          const mapObj = campaign.variableMapping?.headerVars?.[index];
          let textValue = "";
          if (mapObj) {
            if (mapObj.type === "custom") {
              textValue = mapObj.value || "";
            } else if (mapObj.type === "firstName") {
              textValue = contact.firstName || contact.name || "";
            } else if (mapObj.type === "lastName") {
              textValue = contact.lastName || "";
            } else if (mapObj.type === "fullName") {
              textValue = (contact.firstName || contact.name || "") + (contact.lastName ? " " + contact.lastName : "");
            } else if (mapObj.type === "phone") {
              textValue = contact.phone;
            }
          }
          headerComponent.parameters.push({ type: "text", text: textValue });
        }
        components.push(headerComponent);
      }

      
// =======================
// ===== BODY VARIABLES ==
// =======================
const bodyText = template.body || "";
const bodyVars = bodyText.match(/\{\{\d+\}\}/g) || [];

if (bodyVars.length > 0) {
  const bodyComponent: any = { type: "body", parameters: [] };

  for (const varText of bodyVars) {
    const index = varText.replace(/\D/g, ""); // e.g. "{{1}}" -> "1"

    const mapObj = campaign.variableMapping?.[index];
    let textValue = "";

    if (mapObj) {
      if (mapObj.type === "custom") {
        // custom value
        textValue = mapObj.value || "";
      } else if (mapObj.type === "firstName") {
        textValue = contact.firstName || contact.name || "";
      } else if (mapObj.type === "lastName") {
        textValue = contact.lastName || "";
      } else if (mapObj.type === "fullName") {
        // fullName fallback
        textValue =
          (contact.firstName || contact.name || "") +
          (contact.lastName ? " " + contact.lastName : "");
      } else if (mapObj.type === "phone") {
        textValue = contact.phone;
      }
    }

    bodyComponent.parameters.push({
      type: "text",
      text: textValue,
    });
  }

  components.push(bodyComponent);
}



      // BUTTONS — URL and COPY_CODE
      if (Array.isArray(template.buttons)) {
        template.buttons.forEach((button: any, index: number) => {
          if (button.type === "URL") {
            const mapObj = campaign.variableMapping?.buttons?.[index.toString()];
            let textValue = "";

            if (mapObj) {
              if (mapObj.type === "custom") {
                textValue = mapObj.value || "";
              } else if (mapObj.type === "firstName") {
                textValue = contact.firstName || "";
              } else if (mapObj.type === "lastName") {
                textValue = contact.lastName || "";
              } else if (mapObj.type === "fullName") {
                textValue = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
              } else if (mapObj.type === "phone") {
                textValue = contact.phone;
              }
            }

            components.push({
              type: "button",
              sub_type: "url",
              index: index.toString(),
              parameters: [
                {
                  type: "text",
                  text: textValue,
                },
              ],
            });
          } else if (button.type === "COPY_CODE") {
            const mapObj = campaign.variableMapping?.buttons?.[index.toString()];
            const couponCode = mapObj?.value || button.example?.[0] || "";

            components.push({
              type: "button",
              sub_type: "copy_code",
              index: index.toString(),
              parameters: [
                {
                  type: "coupon_code",
                  coupon_code: couponCode,
                },
              ],
            });
          }
        });
      }

      console.log(
        "Final components for WhatsApp:",
        JSON.stringify(components, null, 2)
      );

      const response = await WhatsAppApiService.sendTemplateMessage(
        channel,
        contact.phone,
        template.name,
        components,
        template.language ?? "en_US",
        true
      );

      const messageId =
        response.messages?.[0]?.id || `msg_${randomUUID()}`;
      const sentVia = response._sentVia || "cloud_api";

      let conversation = await storage.getConversationByPhone(contact.phone);
      if (!conversation) {
        conversation = await storage.createConversation({
          contactId: contact.id,
          contactPhone: contact.phone,
          contactName: contact.name || contact.phone,
          channelId: channel.id,
          unreadCount: 0,
        });
      }

      await storage.createMessage({
        conversationId: conversation.id,
        content: template.body,
        whatsappMessageId: messageId,
        status: "sent",
        messageType: "text",
        campaignId,
        metadata: { apiEndpoint: sentVia, campaignId },
      });

      await storage.incrementCampaignSentCount(campaignId);

      console.log(`[Campaign ${campaignId}] Message sent: ${contact.phone}`);
    } catch (err) {
      console.error(`[Campaign ${campaignId}] Send failed for ${contact.phone}:`, err);
      await storage.incrementCampaignFailedCount(campaignId);
    }
  }

  const updatedCampaign = await storage.getCampaign(campaignId);
  const totalProcessed = (updatedCampaign?.sentCount || 0) + (updatedCampaign?.failedCount || 0);
  const recipientCount = updatedCampaign?.recipientCount || 0;

  console.log(`[Campaign ${campaignId}] Execution complete — sent: ${updatedCampaign?.sentCount || 0}, failed: ${updatedCampaign?.failedCount || 0}, total: ${totalProcessed}/${recipientCount}`);

  if (updatedCampaign && totalProcessed >= recipientCount) {
    await storage.updateCampaign(campaignId, {
      status: "completed",
      completedAt: new Date(),
    });
    await notifyCampaignCompletion(campaignId);
  }
}


