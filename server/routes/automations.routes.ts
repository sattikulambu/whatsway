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

import type { Express } from "express";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import * as automationsController from "../controllers/automations.controller";
import { validateRequest } from "../middlewares/validation.middleware";
import { insertAutomationSchema } from "@shared/schema";
import { extractChannelId } from "../middlewares/channel.middleware";
import { upload } from "server/middlewares/upload.middleware";

export function registerAutomationsRoutes(app: Express) {
  // Get all automations
  app.get("/api/automations",
    extractChannelId,
    automationsController.getAutomations
  );

  // Get single automation
  app.get("/api/automations/:id", automationsController.getAutomation);

  // Create automation
  app.post(
    "/api/automations",
    upload.any(), // Changed from upload.fields() to upload.any()
    automationsController.createAutomation
  );

  // Update automation
  app.put("/api/automations/:id", automationsController.updateAutomation);

  // Delete automation
  app.delete("/api/automations/:id", automationsController.deleteAutomation);

  // Toggle automation active/inactive
  app.post("/api/automations/:id/toggle", automationsController.toggleAutomation);
}