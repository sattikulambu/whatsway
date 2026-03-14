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

import { storage } from "../storage";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { z } from "zod";
import { insertAutomationSchema, insertAutomationNodeSchema } from "@shared/schema";
import { AutomationRepository } from "../repositories/automation.repository";
import type { Express } from "express";
import { requireAuth } from "../middlewares/auth.middleware";


const automationRepo = new AutomationRepository();

// Schema for creating/updating automation with nodes
const automationWithNodesSchema = z.object({
  automation: insertAutomationSchema,
  nodes: z.array(insertAutomationNodeSchema)
});

export function registerAutomationRoutes(app: Express) {
// Get all automations for active channel
app.get("/api/automations", requireAuth, async (req, res) => {
  try {
    const activeChannel = await storage.getActiveChannel();
    if (!activeChannel) {
      return res.status(400).json({ error: "No active channel selected" });
    }

    const automations = await storage.getAutomationsByChannel(activeChannel.id);
    res.json(automations);
  } catch (error) {
    console.error("Error fetching automations:", error);
    res.status(500).json({ error: "Failed to fetch automations" });
  }
});

// Get a specific automation with its nodes
app.get("/api/automations/:id", requireAuth, async (req, res) => {
  try {
    const automation = await storage.getAutomation(req.params.id);
    if (!automation) {
      return res.status(404).json({ error: "Automation not found" });
    }

    const nodes = await automationRepo.findNodesByAutomation(automation.id);
    res.json({ automation, nodes });
  } catch (error) {
    console.error("Error fetching automation:", error);
    res.status(500).json({ error: "Failed to fetch automation" });
  }
});

// Create a new automation with nodes
app.post("/api/automations", requireAuth, async (req, res) => {
  try {
    const activeChannel = await storage.getActiveChannel();
    if (!activeChannel) {
      return res.status(400).json({ error: "No active channel selected" });
    }
console.log('Request body:', req.body); // Debug log
    const parsed = automationWithNodesSchema.parse(req.body);
    
    // Create automation
    const automation = await storage.createAutomation({
      ...parsed.automation,
      channelId: activeChannel.id,
      createdBy: req.user?.id
    });

    // Create nodes
    const nodesWithAutomationId = parsed.nodes.map(node => ({
      ...node,
      automationId: automation.id
    }));
    const nodes = await automationRepo.createNodes(nodesWithAutomationId);

    res.status(201).json({ automation, nodes });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Error creating automation:", error);
    res.status(500).json({ error: "Failed to create automation" });
  }
});

// Update an automation and its nodes
app.put("/api/automations/:id", requireAuth, async (req, res) => {
  try {
    const parsed = automationWithNodesSchema.parse(req.body);
    
    // Update automation
    const automation = await storage.updateAutomation(req.params.id, parsed.automation);
    if (!automation) {
      return res.status(404).json({ error: "Automation not found" });
    }

    // Delete existing nodes and recreate them
    await automationRepo.deleteNodesByAutomation(automation.id);
    
    // Create new nodes
    const nodesWithAutomationId = parsed.nodes.map(node => ({
      ...node,
      automationId: automation.id
    }));
    const nodes = await automationRepo.createNodes(nodesWithAutomationId);

    res.json({ automation, nodes });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    console.error("Error updating automation:", error);
    res.status(500).json({ error: "Failed to update automation" });
  }
});

// Toggle automation status (active/inactive)
app.patch("/api/automations/:id/toggle", requireAuth, async (req, res) => {
  try {
    const automation = await storage.getAutomation(req.params.id);
    if (!automation) {
      return res.status(404).json({ error: "Automation not found" });
    }

    const newStatus = automation.status === 'active' ? 'inactive' : 'active';
    const updated = await storage.updateAutomation(req.params.id, { status: newStatus });

    res.json(updated);
  } catch (error) {
    console.error("Error toggling automation:", error);
    res.status(500).json({ error: "Failed to toggle automation" });
  }
});

// Delete an automation
app.delete("/api/automations/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await storage.deleteAutomation(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Automation not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting automation:", error);
    res.status(500).json({ error: "Failed to delete automation" });
  }
});

// Get automation execution history
app.get("/api/automations/:id/executions", requireAuth, async (req, res) => {
  try {
    const executions = await automationRepo.findExecutionsByAutomation(req.params.id);
    res.json(executions);
  } catch (error) {
    console.error("Error fetching executions:", error);
    res.status(500).json({ error: "Failed to fetch executions" });
  }
});

// Get execution logs
app.get("/api/execution/:id/logs", requireAuth, async (req, res) => {
  try {
    const logs = await automationRepo.findExecutionLogs(req.params.id);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching execution logs:", error);
    res.status(500).json({ error: "Failed to fetch execution logs" });
  }
});

}