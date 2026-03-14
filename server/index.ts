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

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { registerRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { MessageStatusUpdater } from "./services/message-status-updater";
import { MessageQueueService } from "./services/message-queue";
import "dotenv/config";
import { initializeUploadsDirectory } from "./middlewares/upload.middleware";
import cors from "cors";
import { rateLimitMiddleware } from "./middlewares/rate-limit.middleware";
import path from "path";
import { createServer } from "http";
import { storage } from "./storage";
import { Server as SocketIOServer } from "socket.io";
import { fetchConversationList } from "./controllers/conversations.controller";
import { startScheduledCampaignCron } from "./cron/scheduledCampaigns.cron";
import { diployLogger, DIPLOY_HEADER_KEY, DIPLOY_HEADER_VALUE, DIPLOY_VERSION, DIPLOY_PRODUCT_NAME } from "@diploy/core";
import { createAdapter } from "@socket.io/redis-adapter";

const app = express();
const httpServer = createServer(app);

// ============================================
// INITIALIZE SOCKET.IO
// ============================================
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*", // In production, specify your domains
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

if (process.env.REDIS_URL) {
  (async () => {
    try {
      const Redis = (await import("ioredis")).default;
      const redisUrl = process.env.REDIS_URL!;

      const redisOpts = {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy() { return null; },
      };

      const pubClient = new Redis(redisUrl, redisOpts);
      const subClient = new Redis(redisUrl, redisOpts);

      pubClient.on("error", () => {});
      subClient.on("error", () => {});

      const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));

      await Promise.all([
        Promise.race([pubClient.connect(), timeout(5000)]),
        Promise.race([subClient.connect(), timeout(5000)]),
      ]);

      io.adapter(createAdapter(pubClient, subClient));
      console.log("[Socket.IO] Redis adapter attached for multi-instance support");
    } catch {
      console.warn("[Socket.IO] Redis not available — using in-memory adapter (this is fine for single-instance)");
    }
  })();
}

(global as any).io = io;

// Store connected users
const connectedUsers = new Map();
const conversationRooms = new Map();

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log("Socket.io client connected:", socket.id);

  const { userId, role, siteId } = socket.handshake.query;

  // Store user info
  const user = {
    socketId: socket.id,
    userId: userId as string,
    role: (role as string) || "agent",
    siteId: siteId as string,
  };

  connectedUsers.set(socket.id, user);
  console.log(`User connected: ${userId}, Role: ${role}`);

  if (userId) {
    socket.join(`user:${userId}`);
    console.log(`✅ Auto-joined user:${userId} room for notifications`);
  }

  // Join site room for broadcasts
  if (siteId) {
    socket.join(`site:${siteId}`);
  }


   socket.on("test_event", (data) => {
      console.log("🔥 TEST EVENT RECEIVED:", data);
  
      socket.emit("test_response", { msg: "Server se response aaya!" });
    });
    socket.on("join-room", ({ room }) => {
    console.log("📥 Socket joined room:", room);
    socket.join(room);
  });

  socket.on("leave-room", ({ room }) => {
    socket.leave(room);
    console.log("📤 Left:", room);
  });

  
  
       // ============================================
    // GET CONVERSATIONS LIST (AGENT SIDE)
    // ============================================
    socket.on("get_conversations", async ({ channelId }) => {
      try {
        console.log("🔥 get_conversations called for channel:", channelId);
  
        const list = await fetchConversationList(channelId);
  
        console.log("🔥 conversations_list sending:", list?.length || 0);
  
        socket.emit("conversations_list", list);
  
      } catch (err) {
        console.error("Error fetching conversations via socket:", err);
      }
    });
  
  
  
  

  // ==========================================
  // AGENT EVENTS
  // ==========================================

  // Agent joins a conversation

   socket.on(
    "agent_join_conversation",
    async ({ conversationId, agentId, agentName }) => {
      console.log(`Agent ${agentName} joining conversation ${conversationId}`);

      // Join BOTH room formats
      socket.join(`conversation:${conversationId}`);
      socket.join(`conversation_${conversationId}`);  // ADD THIS LINE

      const user = connectedUsers.get(socket.id);
      if (user) {
        user.conversationId = conversationId;
        user.agentName = agentName;
      }

      if (!conversationRooms.has(conversationId)) {
        conversationRooms.set(conversationId, new Set());
      }
      conversationRooms.get(conversationId)?.add(socket.id);

      // Notify others in the conversation
      socket.to(`conversation:${conversationId}`).emit("agent_joined", {
        conversationId,
        agentId,
        agentName,
      });

      // Update database
      try {
        await storage.updateConversation(conversationId, {
          status: "assigned",
          assignedTo: agentId,
          assignedToName: agentName,
        });
      } catch (error) {
        console.error("Error updating conversation:", error);
      }
      
      console.log(`✅ Agent joined both room formats for ${conversationId}`);
    }
  );
  socket.on(
    "agent_join_conversationOLD",
    async ({ conversationId, agentId, agentName }) => {
      console.log(`Agent ${agentName} joining conversation ${conversationId}`);

      socket.join(`conversation:${conversationId}`);
      socket.join(`conversation_${conversationId}`); 

      const user = connectedUsers.get(socket.id);
      if (user) {
        user.conversationId = conversationId;
        user.agentName = agentName;
      }

      if (!conversationRooms.has(conversationId)) {
        conversationRooms.set(conversationId, new Set());
      }
      conversationRooms.get(conversationId)?.add(socket.id);

      // Notify others in the conversation
      socket.to(`conversation:${conversationId}`).emit("agent_joined", {
        conversationId,
        agentId,
        agentName,
      });

      // Update database - assign conversation
      try {
        // You'll need to implement this in your storage
        await storage.updateConversation(conversationId, {
          status: "assigned",
          assignedTo: agentId,
          assignedToName: agentName,
        });
      } catch (error) {
        console.error("Error updating conversation:", error);
      }
    }
  );

  // Agent is typing
  socket.on("agent_typing", ({ conversationId, agentName }) => {
    console.log(`Agent typing in ${conversationId}`);
    socket.to(`conversation:${conversationId}`).emit("agent_typing", {
      conversationId,
      agentName,
    });
  });

  // Agent stopped typing
  socket.on("agent_stopped_typing", ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit("agent_stopped_typing", {
      conversationId,
    });
  });

  // Agent sends message
  socket.on(
    "agent_send_message",
    async ({ conversationId, content, agentId, agentName }) => {
      console.log(`Agent message in ${conversationId}:`, content);

      try {
        // Message is already saved by API endpoint, just broadcast it
        const message = {
          id: `msg_${Date.now()}`, // This will be replaced by actual DB ID
          conversationId,
          content,
          fromUser: false,
          fromType: "agent",
          fromName: agentName,
          createdAt: new Date().toISOString(),
          status: "sent",
        };

        // Broadcast to all participants in the conversation
        io.to(`conversation:${conversationId}`).emit("new_message", {
          conversationId,
          message,
        });

        // Confirm to sender
        socket.emit("message_sent", {
          conversationId,
          status: "delivered",
        });
      } catch (error) {
        console.error("Error sending agent message:", error);
        socket.emit("message_error", {
          error: "Failed to send message",
        });
      }
    }
  );

  // Close conversation
  socket.on("close_conversation", async ({ conversationId, agentId }) => {
    console.log(`Closing conversation ${conversationId}`);

    try {
      // Update database
      // await storage.updateConversation(conversationId, {
      //   status: 'closed'
      // });

      // Notify all participants
      io.to(`conversation:${conversationId}`).emit(
        "conversation_status_changed",
        {
          conversationId,
          status: "closed",
        }
      );
    } catch (error) {
      console.error("Error closing conversation:", error);
    }
  });

  

socket.on('join_all_conversations', ({ channelId, userId }) => {
  console.log(`✅ JOIN_ALL_CONVERSATIONS: User ${userId} joining channel ${channelId}`);
  socket.join(`channel:${channelId}`);
  socket.join(`user:${userId}`);
  console.log(`✅ Successfully joined channel:${channelId}`);
  
  socket.emit('joined_channel', {
    channelId,
    userId,
    message: 'Successfully joined channel room'
  });
});

socket.on('join_conversation', ({ conversationId, userId }) => {
  console.log(`✅ JOIN_CONVERSATION: ${userId} joining ${conversationId}`);
  socket.join(`conversation_${conversationId}`);
  socket.join(`conversation:${conversationId}`);
  
  if (!conversationRooms.has(conversationId)) {
    conversationRooms.set(conversationId, new Set());
  }
  conversationRooms.get(conversationId)?.add(socket.id);
  console.log(`✅ Joined conversation_${conversationId}`);
});

socket.on('leave_conversation', ({ conversationId, userId }) => {
  socket.leave(`conversation_${conversationId}`);
  socket.leave(`conversation:${conversationId}`);
  const room = conversationRooms.get(conversationId);
  if (room) {
    room.delete(socket.id);
  }
});
  // Visitor is typing
  socket.on("user_typing", ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit("user_typing", {
      conversationId,
    });
  });

  // Visitor stopped typing
  socket.on("user_stopped_typing", ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit("user_stopped_typing", {
      conversationId,
    });
  });

  // Conversation opened (mark as read)
  socket.on("conversation_opened", async ({ conversationId }) => {
    console.log(`Conversation opened: ${conversationId}`);

    try {
      // Mark messages as read
      await storage.markMessagesAsRead(conversationId);

      socket.to(`conversation:${conversationId}`).emit("messages_read", {
        conversationId,
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  // Message read
  socket.on("message_read", async ({ conversationId, messageId }) => {
    try {
      // Update message status
      await storage.updateMessage(messageId, {
        status: "read",
        readAt: new Date(),
      });

      socket
        .to(`conversation:${conversationId}`)
        .emit("message_status_update", {
          messageId,
          status: "read",
        });
    } catch (error) {
      console.error("Error updating message status:", error);
    }
  });

  // ==========================================
  // DISCONNECT
  // ==========================================
  socket.on("disconnect", () => {
    console.log("Socket.io client disconnected:", socket.id);

    const user = connectedUsers.get(socket.id);
    if (user?.conversationId) {
      const room = conversationRooms.get(user.conversationId);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          conversationRooms.delete(user.conversationId);
        }
      }

      // Notify others
      if (user.role === "visitor") {
        socket.to(`conversation:${user.conversationId}`).emit("user_left", {
          conversationId: user.conversationId,
        });
      }
    }

    connectedUsers.delete(socket.id);
  });
});

// Helper functions
io.getOnlineAgents = function (siteId?: string) {
  const agents: any[] = [];
  connectedUsers.forEach((user) => {
    if (user.role === "agent" || user.role === "admin") {
      if (!siteId || user.siteId === siteId) {
        agents.push(user);
      }
    }
  });
  return agents;
};

io.isConversationActive = function (conversationId: string) {
  const room = conversationRooms.get(conversationId);
  return room && room.size > 0;
};

app.use((_req, res, next) => {
  res.setHeader(DIPLOY_HEADER_KEY, DIPLOY_HEADER_VALUE);
  next();
});

app.get("/api/version", (_req, res) => {
  res.json({ version: DIPLOY_VERSION, product: DIPLOY_PRODUCT_NAME });
});

app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use('/webhooks/razorpay', express.raw({ type: 'application/json' }));
app.use('/webhooks/paypal', express.raw({ type: 'application/json' }));
app.use('/webhooks/paystack', express.raw({ type: 'application/json' }));
app.use('/webhooks/mercadopago', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static("uploads"));
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

app.use(
  "/widget",
  express.static(path.join(process.cwd(), "public"), {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    },
  })
);

// Get online agents
app.get("/api/agents/online", (req, res) => {
  const { siteId } = req.query;
  const agents = io.getOnlineAgents?.(siteId as string) || [];
  res.json({ agents });
});

initializeUploadsDirectory();

// console.log("ENV::", process.env.NODE_ENV ,process.env.FORCE_HTTPS);
// Set up session management
const PostgresSessionStore = connectPgSimple(session);
app.use(
  session({
    store: new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    }),
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hour
    },
  })
);

app.use(rateLimitMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  

  const listenOptions: any = {
    port,
    host: "0.0.0.0",
  };

  // Only use reusePort if the platform supports it
  if (process.platform !== "win32" && process.env.NODE_ENV !== "production") {
    listenOptions.reusePort = true;
  }

  httpServer.listen(listenOptions, async () => {
    diployLogger.banner();
    diployLogger.success(`Server running on port ${port}`);

    const instanceId = process.env.NODE_APP_INSTANCE;
    const isCronLeader = !instanceId || instanceId === "0";

    if (isCronLeader) {
      diployLogger.success(`Worker ${instanceId ?? "main"} is the cron leader — starting scheduled jobs`);
      startScheduledCampaignCron();

      const messageStatusUpdater = new MessageStatusUpdater();
      messageStatusUpdater.startCronJob(60);

      MessageQueueService.startProcessing();

      const { channelHealthMonitor } = await import(
        "./cron/channel-health-monitor"
      );
      channelHealthMonitor.start();
    } else {
      diployLogger.success(`Worker ${instanceId} skipping cron jobs (not the leader)`);
    }
  });
})();
