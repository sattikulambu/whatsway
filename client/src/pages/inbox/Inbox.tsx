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

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { io, Socket } from "socket.io-client";
import { useTranslation } from "@/lib/i18n";
import { normalizeTime } from "./utils";
import ConversationList from "./ConversationList";
import MessageThread from "./MessageThread";
import type { Message, ConversationWithContact } from "./types";
import type { Conversation, Contact } from "@shared/schema";

export default function Inbox() {
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [location] = useLocation();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedConversationRef = useRef(selectedConversation);
  const templateRefetchTimersRef = useRef<NodeJS.Timeout[]>([]);

  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  const { data: conversations = [], isLoading: conversationsLoading } =
    useQuery({
      queryKey: ["/api/conversations", activeChannel?.id],
      queryFn: async () => {
        const response = await api.getConversations(activeChannel?.id);
        return await response.json();
      },
      enabled: !!activeChannel,
      refetchOnWindowFocus: true,
      staleTime: 0,
    });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
    queryFn: async () => {
      if (!selectedConversation?.id) return [];
      const response = await api.getMessages(selectedConversation.id);
      const data = await response.json();
      return data;
    },
    enabled: !!selectedConversation?.id,
  });


  useEffect(() => {
  if (!selectedConversation?.id) return;

  queryClient.invalidateQueries({
    queryKey: [
      "/api/conversations",
      selectedConversation.id,
      "messages",
    ],
  });
}, [selectedConversation?.id]);



  function normalizeTimeLocal(value: any): number {
  if (!value) return 0;

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value < 1e12 ? value * 1000 : value;
  }

  const parsed = Date.parse(value);
  return isNaN(parsed) ? 0 : parsed;
}

  

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user?.id) return;

    const API_BASE = `${window.location.origin}`;
    console.log("Connecting to Socket.io at", API_BASE);
    
    const socketInstance = io(API_BASE, {
      query: {
        userId: user.id,
        role: user.role || "agent",
        siteId: activeChannel?.id || "default",
      },
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
    console.log("Socket.io connected for agent");
    if (activeChannel?.id) {
    const channelRoom = `channel:${activeChannel.id}`;
    console.log("🔗 Joining channel room:", channelRoom);

    socketInstance.emit("join-room", {
      room: channelRoom,
    });
  }
    });

   
    socketInstance.on("disconnect", () => {
      console.log("Socket.io disconnected");
    });
    


socketInstance.on("conversation_created", (data: any) => {
  console.log("🔥 conversation_created event received", data);
  if (data?.conversation && activeChannel?.id) {
    queryClient.setQueryData(
      ["/api/conversations", activeChannel.id],
      (old: any[]) => {
        if (!Array.isArray(old)) return old;
        const exists = old.some((c) => c.id === data.conversation.id);
        if (exists) return old;
        return [data.conversation, ...old];
      }
    );
  }
  queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
});


socketInstance.on("message_sent", (data) => {
  console.log("📩 message_sent event received:", data);

  queryClient.invalidateQueries({
    queryKey: ["/api/conversations"]
  });

  
    queryClient.invalidateQueries({
      queryKey: ["/api/conversations", data.conversationId, "messages"]
    });
  
});




socketInstance.on("new-message", (data) => {
  console.log("🔥 Incoming message (raw):", data);

  const conversationId = data.conversationId;

  const lastMessageText =
    typeof data?.message?.content === "string"
      ? data.message.content
      : typeof data?.content === "string"
      ? data.content
      : "[Media]";

    const lastMessageAt =
  typeof data?.createdAt === "number"
    ? data.createdAt
    : typeof data?.createdAt === "string"
    ? Date.parse(data.createdAt)
    : Date.now();


  queryClient.setQueryData(
    ["/api/conversations", activeChannel.id],
    (old: any[]) => {
      if (!Array.isArray(old)) return old;

      return old
        .map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                lastMessageText,
                lastMessageAt,
                unreadCount:
                  selectedConversationRef.current?.id === conversationId
                    ? 0
                    : (conv.unreadCount || 0) + 1,
              }
            : conv
        )
        .sort(
          (a, b) =>
           normalizeTime(b.lastMessageAt) -
           normalizeTime(a.lastMessageAt)
        );
    }
  );

  if (selectedConversationRef.current?.id === conversationId) {
    queryClient.invalidateQueries({
      queryKey: [
        "/api/conversations",
        conversationId,
        "messages",
      ],
    });
  }


});



socketInstance.on("conversation_updated", (data) => {
  console.log("🔔 Conversation updated:", data.conversationId);
  queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
});

socketInstance.on("new-message", (data) => {
  console.log("🔥 Incoming message (raw):", data);

  const conversationId = data.conversationId;

  const lastMessageText =
    typeof data?.message?.content === "string"
      ? data.message.content
      : typeof data?.content === "string"
      ? data.content
      : "[Media]";

    const lastMessageAt =
  typeof data?.createdAt === "number"
    ? data.createdAt
    : typeof data?.createdAt === "string"
    ? Date.parse(data.createdAt)
    : Date.now();


  queryClient.setQueryData(
    ["/api/conversations", activeChannel.id],
    (old: any[]) => {
      if (!Array.isArray(old)) return old;

      return old
        .map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                lastMessageText,
                lastMessageAt,
                unreadCount:
                  selectedConversationRef.current?.id === conversationId
                    ? 0
                    : (conv.unreadCount || 0) + 1,
              }
            : conv
        )
        .sort(
          (a, b) =>
            normalizeTime(b.lastMessageAt) -
            normalizeTime(a.lastMessageAt)
        );
    }
  );

  if (selectedConversationRef.current?.id === conversationId) {
    queryClient.invalidateQueries({
      queryKey: [
        "/api/conversations",
        conversationId,
        "messages",
      ],
    });
  }


});




    socketInstance.on("new_message", (data) => {
      console.log("New message received:", data);

      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });

      if (
        selectedConversationRef.current &&
        data.conversationId === selectedConversationRef.current.id
      ) {
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", selectedConversationRef.current.id, "messages"],
        });
      }
    });

    socketInstance.on("user_typing", (data) => {
      if (selectedConversationRef.current?.id === data.conversationId) {
        setIsTyping(true);
        setTypingUser("Visitor");
      }
    });

    socketInstance.on("user_stopped_typing", (data) => {
      if (selectedConversationRef.current?.id === data.conversationId) {
        setIsTyping(false);
        setTypingUser("");
      }
    });

    socketInstance.on("new_conversation_assigned", (data) => {
      if (data.agentId === user.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        toast({
          title: "New Conversation Assigned",
          description: "A new conversation has been assigned to you",
        });
      }
    });

    socketInstance.on("conversation_transferred", (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (selectedConversationRef.current?.id === data.conversationId) {
        toast({
          title: "Conversation Transferred",
          description: `Transferred to ${data.agent?.name || "another agent"}`,
        });
      }
    });

    socketInstance.on("messages_read", (data) => {
      if (selectedConversationRef.current?.id === data.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", selectedConversationRef.current?.id, "messages"],
        });
      }
    });

    socketInstance.on("message_reaction", (data) => {
      console.log("📍 Reaction received:", data);
      const currentConv = selectedConversationRef.current;
      if (currentConv && data.conversationId === currentConv.id) {
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", currentConv.id, "messages"],
        });
      }
    });

    socketInstance.on("message_status_update", (data) => {
  const {
    conversationId,
    whatsappMessageId,
    status,
    errorDetails,
  } = data;

  console.log("📬 message_status_update received:", { conversationId, whatsappMessageId, status, hasError: !!errorDetails });

  const currentConv = selectedConversationRef.current;

  if (currentConv?.id === conversationId) {
    queryClient.setQueryData(
      ["/api/conversations", conversationId, "messages"],
      (old: any[]) => {
        if (!Array.isArray(old)) return old;

        return old.map((msg) =>
          msg.whatsappMessageId === whatsappMessageId
            ? {
                ...msg,
                status,
                errorDetails: errorDetails || msg.errorDetails,
              }
            : msg
        );
      }
    );

    queryClient.invalidateQueries({
      queryKey: ["/api/conversations", conversationId, "messages"],
    });
  }

  if (status === "failed" && errorDetails) {
    const errorMsg = errorDetails.title || errorDetails.message || "Message delivery failed";
    const isBilling = errorMsg.toLowerCase().includes("payment") || errorMsg.toLowerCase().includes("billing") || errorMsg.toLowerCase().includes("eligibility");

    toast({
      title: isBilling ? "Meta Billing Issue" : "Message Failed",
      description: isBilling
        ? "Message failed due to a payment issue. Please check your payment method in Meta Business Manager (business.facebook.com) → Billing & Payments."
        : errorMsg,
      variant: "destructive",
      duration: 10000,
    });
  }
});


    socketInstance.on("conversation_status_changed", (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (selectedConversationRef.current?.id === data.conversationId) {
        toast({
          title: "Conversation Status Changed",
          description: `Status changed to: ${data.status}`,
        });
      }
    });


    

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user?.id, activeChannel?.id]);



  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected (WhatsApp)");
      ws.send(JSON.stringify({ type: "join-all-conversations" }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

    };

    ws.onerror = (error) => console.error("WebSocket error:", error);
    ws.onclose = () => console.log("WebSocket disconnected");

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);



  useEffect(() => {
  if (!selectedConversation || !socket) return;

  const room = `conversation:${selectedConversation.id}`;
  console.log("🔗 Joining conversation room:", room);

  socket.emit("join-room", { room });

  return () => {
    console.log("🚪 Leaving conversation room:", room);
    socket.emit("leave-room", { room });
  };
}, [selectedConversation?.id, socket]);


  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; content: string }) => {
      const response = await fetch(
        `/api/conversations/${data.conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: data.content,
            fromUser: true,
            fromType: "agent",
            agentId: user?.id,
            agentName:
              `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
              user?.username,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }

      return response.json();
    },
    onSuccess: (data: any) => {
      if (socket && selectedConversation) {
        socket.emit("agent_send_message", {
          conversationId: selectedConversation.id,
          content: messageText,
          agentId: user?.id,
          agentName:
            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
            user?.username,
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });

      setMessageText("");

      if (socket && selectedConversation) {
        socket.emit("agent_stopped_typing", {
          conversationId: selectedConversation.id,
        });
      }

      if (data?.status === "failed" || data?.success === false) {
        const errorMsg = data?.errorDetails?.message || data?.error || "Message delivery failed";
        const isBilling = errorMsg.toLowerCase().includes("payment") || errorMsg.toLowerCase().includes("billing") || errorMsg.toLowerCase().includes("eligibility");

        toast({
          title: isBilling ? "Meta Billing Issue" : "Message Failed",
          description: isBilling
            ? "Message failed due to a payment issue. Please check your payment method in Meta Business Manager (business.facebook.com) → Billing & Payments."
            : errorMsg,
          variant: "destructive",
          duration: 10000,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setMessageText(e.target.value);

    if (!socket || !selectedConversation) return;

    socket.emit("agent_typing", {
      conversationId: selectedConversation.id,
      agentName:
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
        user?.username,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("agent_stopped_typing", {
        conversationId: selectedConversation.id,
      });
    }, 2000);
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { conversationId: string; status: string }) => {
      const response = await fetch(
        `/api/conversations/${data.conversationId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: data.status }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update status");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      if (socket) {
        socket.emit("conversation_status_changed", {
          conversationId: variables.conversationId,
          status: variables.status,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Success",
        description: "Conversation status updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendTemplateMutation = useMutation({
  mutationFn: async (data: {
    conversationId: string;
    templateName: string;
    phoneNumber: string;
    parameters?: { type?: string; value?: string }[];
    mediaId?: string;
    headerType?: string | null;
  }) => {
    const response = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: data.phoneNumber,
        templateName: data.templateName,
        channelId: selectedConversation?.channelId,
        headerType: data.headerType
          ? data.headerType.toUpperCase()
          : undefined,
        parameters: data.parameters || [],
        mediaId: data.mediaId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to send template");
    }

    return response.json();
  },
  onSuccess: (data: any) => {
    queryClient.invalidateQueries({
      queryKey: ["/api/conversations", selectedConversation?.id, "messages"],
    });

    if (data?.success === false || data?.message?.status === "failed") {
      const msg = data?.error || data?.message?.errorDetails?.message || "Template delivery failed";
      const isBilling = msg.toLowerCase().includes("payment") || msg.toLowerCase().includes("billing") || msg.toLowerCase().includes("eligibility");
      const isRateLimit = msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("throttl");
      const isNotRegistered = msg.toLowerCase().includes("not registered") || msg.toLowerCase().includes("not a valid whatsapp");

      let title = "Failed to send template";
      let description = msg;

      if (isBilling) {
        title = "Meta Billing Issue";
        description = "Your WhatsApp Business account has a payment issue. Please check your payment method in Meta Business Manager (business.facebook.com) → Billing & Payments, then try again.";
      } else if (isRateLimit) {
        title = "Rate Limit Reached";
        description = "You've hit WhatsApp's sending limit. Please wait a few minutes before trying again.";
      } else if (isNotRegistered) {
        title = "Invalid Recipient";
        description = "This phone number is not registered on WhatsApp. Please verify the number and try again.";
      }

      toast({
        title,
        description,
        variant: "destructive",
        duration: 10000,
      });
    } else {
      toast({
        title: "Template submitted",
        description: "Your template message has been submitted for delivery.",
      });

      const convId = selectedConversation?.id;
      templateRefetchTimersRef.current.forEach(t => clearTimeout(t));
      templateRefetchTimersRef.current = [];

      const t1 = setTimeout(() => {
        console.log("⏰ Delayed refetch: checking for message status updates");
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", convId, "messages"],
        });
      }, 10000);

      const t2 = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["/api/conversations", convId, "messages"],
        });
      }, 20000);

      templateRefetchTimersRef.current = [t1, t2];
    }
  },
  onError: (error: Error) => {
    const msg = error.message || "Failed to send template";
    const isBilling = msg.toLowerCase().includes("payment") || msg.toLowerCase().includes("billing") || msg.toLowerCase().includes("eligibility");
    const isRateLimit = msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("throttl");
    const isNotRegistered = msg.toLowerCase().includes("not registered") || msg.toLowerCase().includes("not a valid whatsapp");

    let title = "Failed to send template";
    let description = msg;

    if (isBilling) {
      title = "Meta Billing Issue";
      description = "Your WhatsApp Business account has a payment issue. Please check your payment method in Meta Business Manager (business.facebook.com) → Billing & Payments, then try again.";
    } else if (isRateLimit) {
      title = "Rate Limit Reached";
      description = "You've hit WhatsApp's sending limit. Please wait a few minutes before trying again.";
    } else if (isNotRegistered) {
      title = "Invalid Recipient";
      description = "This phone number is not registered on WhatsApp. Please verify the number and try again.";
    }

    toast({
      title,
      description,
      variant: "destructive",
      duration: 10000,
    });
  },
});


  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;

    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      content: messageText.trim(),
    });
  };



  const handleSelectTemplate = (template: any, variables: { type?: string; value?: string }[], mediaId?: string, headerType?: string | null) => {
  if (!selectedConversation) return;

  sendTemplateMutation.mutate({
    conversationId: selectedConversation.id,
    templateName: template.name,
    phoneNumber: selectedConversation.contactPhone || "",
    parameters: variables,
    mediaId: mediaId,
    headerType: headerType as any,
  });
};


  const handleFileAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation) return;

    const formData = new FormData();
    formData.append("media", file);
    formData.append("fromUser", "true");
    formData.append("conversationId", selectedConversation.id);
    formData.append("caption", messageText || "");

    try {
      const response = await fetch(
        `/api/conversations/${selectedConversation.id}/messages`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send media");
      }

      toast({
        title: "Success",
        description: "Media sent successfully",
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversation.id, "messages"],
      });
      setMessageText("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }

    event.target.value = "";
  };

  const updateConversationStatus = (status: string) => {
    if (!selectedConversation) return;

    updateStatusMutation.mutate({
      conversationId: selectedConversation.id,
      status: status,
    });
  };

  const handleViewContact = () => {
    if (!selectedConversation || !selectedConversation.contactId) return;
    window.location.href = `/contacts?id=${
      selectedConversation.contactId
    }&phone=${selectedConversation.contactPhone || ""}`;
  };

  const handleArchiveChat = async () => {
    if (!selectedConversation) return;

    try {
      await apiRequest(
        "PATCH",
        `/api/conversations/${selectedConversation.id}`,
        { status: "archived" }
      );

      toast({
        title: "Chat Archived",
        description: "This conversation has been archived",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive chat",
        variant: "destructive",
      });
    }
  };

  const handleBlockContact = async () => {
    if (!selectedConversation || !selectedConversation.contactId) return;

    try {
      await apiRequest(
        "PATCH",
        `/api/contacts/${selectedConversation.contactId}`,
        { status: "blocked" }
      );

      toast({
        title: "Contact Blocked",
        description: "This contact has been blocked",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block contact",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedConversation) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this chat? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      await apiRequest(
        "DELETE",
        `/api/conversations/${selectedConversation.id}`
      );

      toast({
        title: "Chat Deleted",
        description: "This conversation has been deleted",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    }
  };

  const updateConversationMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      const response = await fetch(`/api/conversations/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.updates),
      });
      const result = await response.json();

      if (!response.ok) {
        console.error(result.error || "Unknown error");
        throw new Error(result.error || "Failed to update conversation");
      }

      return result;
    },
    onSuccess: (updatedConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(updatedConversation);
      toast({
        title: "Success",
        description: "Conversation updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssignConversation = (
    assignedTo: string,
    assignedToName: string
  ) => {
    if (!selectedConversation) return;

    updateConversationMutation.mutate({
      id: selectedConversation.id,
      updates: {
        assignedTo,
        assignedToName,
        assignedAt: new Date().toISOString(),
        status: assignedTo ? "assigned" : "open",
      },
    });
  };

  const handleCloseConversation = () => {
    if (!socket || !selectedConversation) return;

    socket.emit("close_conversation", {
      conversationId: selectedConversation.id,
      agentId: user?.id,
    });

    updateConversationStatus("closed");
  };

  const filteredConversations = conversations.filter((conv: any) => {
    const matchesSearch =
      conv.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.contactPhone?.includes(searchQuery) ||
      conv.contactName?.toLowerCase().includes(searchQuery.toLowerCase());

    switch (filterTab) {
      case "unread":
        return matchesSearch && (conv.unreadCount || 0) > 0;
      case "open":
        return matchesSearch && conv.status === "open";
      case "resolved":
        return matchesSearch && conv.status === "resolved";
      case "whatsapp":
        return matchesSearch && conv.type === "whatsapp";
      case "chatbot":
        return matchesSearch && conv.type === "chatbot";
      case "assigned":
        return (
          matchesSearch &&
          conv.status === "assigned" &&
          (user?.role === "admin" || conv.assignedTo === user?.id)
        );
      default:
        return matchesSearch;
    }
  });

  function normalizeTimeFormat(value: any): number {
  if (!value) return 0;

  if (value instanceof Date) return value.getTime();

  if (typeof value === "number") {
    return value < 1e12 ? value * 1000 : value;
  }

  const parsed = Date.parse(value);
  return isNaN(parsed) ? 0 : parsed;
}

  const is24HourWindowExpired =
  selectedConversation?.type === "whatsapp" &&
  normalizeTime((selectedConversation as any)?.lastIncomingMessageAt || selectedConversation?.lastMessageAt) > 0
    ? Date.now() -
        normalizeTime((selectedConversation as any)?.lastIncomingMessageAt || selectedConversation?.lastMessageAt) >
      24 * 60 * 60 * 1000
    : false;


  if (!activeChannel) {
    return (
      <div className="h-screen flex flex-col">
        <Header title={t("inbox.title")} />
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={MessageCircle}
            title="No Active Channel"
            description="Please select a channel from the channel switcher to view conversations."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
     <Header
  title={t("inbox.title")}
/>

      <div className="flex-1 flex bg-gray-50 overflow-hidden">
        <ConversationList
          conversations={filteredConversations}
          conversationsLoading={conversationsLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterTab={filterTab}
          onFilterTabChange={setFilterTab}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
          user={user}
        />

        {selectedConversation ? (
          <MessageThread
            selectedConversation={selectedConversation}
            messages={messages}
            messagesLoading={messagesLoading}
            isTyping={isTyping}
            typingUser={typingUser}
            user={user}
            messageText={messageText}
            onTyping={handleTyping}
            onSendMessage={handleSendMessage}
            onFileAttachment={handleFileAttachment}
            onFileChange={handleFileChange}
            onSelectTemplate={handleSelectTemplate}
            is24HourWindowExpired={is24HourWindowExpired}
            activeChannelId={activeChannel?.id}
            sendMessagePending={sendMessageMutation.isPending}
            fileInputRef={fileInputRef}
            messagesEndRef={messagesEndRef}
            onBack={() => setSelectedConversation(null)}
            onUpdateStatus={updateConversationStatus}
            onViewContact={handleViewContact}
            onArchiveChat={handleArchiveChat}
            onBlockContact={handleBlockContact}
            onDeleteChat={handleDeleteChat}
            onAssignConversation={handleAssignConversation}
          />
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
