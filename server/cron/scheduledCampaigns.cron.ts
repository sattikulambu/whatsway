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

import cron from "node-cron";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { storage } from "../storage";
import {startCampaignExecution} from "../controllers/campaigns.controller";

// ⏰ Runs every minute
export function startScheduledCampaignCron() {
  cron.schedule("* * * * *", async () => {
    try {
      console.log("⏳ Cron: checking scheduled campaigns");

      const now = new Date();

      // 🟡 Sirf scheduled campaigns jinka time aa chuka hai
      const campaigns = await storage.getScheduledCampaigns(now);

      for (const campaign of campaigns) {
        console.log("Starting scheduled campaign:", campaign.id);

        await storage.updateCampaign(campaign.id, {
          status: "active",
        });

        const updated = await storage.getCampaign(campaign.id);
        if (!updated || updated.status !== "active") {
          console.error(`Scheduled campaign ${campaign.id} failed to transition to active`);
          continue;
        }

        await startCampaignExecution(campaign.id);
      }
    } catch (error) {
      console.error("❌ Cron error (scheduled campaigns):", error);
    }
  });
}
