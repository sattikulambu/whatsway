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

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLastSeen } from "./utils";
import type { ConversationWithContact } from "./types";
import { isDemoUser, maskName, maskPhone, maskContent } from "@/utils/maskUtils";

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
];

function getAvatarColor(name: string | null | undefined): string {
  if (!name) return "bg-gray-400";
  const charCode = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
}

function getMessagePreview(message: any, shouldMask: boolean): string {
  if (!message) return "";
  if (shouldMask) return maskContent();

  if (typeof message === "object") {
    if (typeof message.content === "string") {
      return message.content.length > 40
        ? message.content.substring(0, 40) + "..."
        : message.content;
    }

    if (typeof message.text === "string") {
      return message.text.length > 40
        ? message.text.substring(0, 40) + "..."
        : message.text;
    }

    return "[Media]";
  }

  const safeMessage = String(message);

  return safeMessage.length > 40
    ? safeMessage.substring(0, 40) + "..."
    : safeMessage;
}

const ConversationListItem = ({
  conversation,
  isSelected,
  onClick,
  user,
}: {
  conversation: ConversationWithContact;
  isSelected: boolean;
  onClick: () => void;
  user?: any;
}) => {
  const lastMessageTime = conversation.lastMessageAt
    ? formatLastSeen(conversation.lastMessageAt)
    : "";
  const demo = isDemoUser(user?.username);

  const displayName = demo
    ? maskName(conversation.contactName || "")
    : conversation.contactName;
  const displayPhone = demo
    ? maskPhone(conversation.contactPhone || "")
    : conversation.contactPhone;

  const avatarColor = getAvatarColor(conversation.contactName);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150",
        isSelected
          ? "bg-green-50/80 border-l-[3px] border-l-green-500 shadow-sm"
          : "border-l-[3px] border-l-transparent hover:bg-gray-50/80"
      )}
    >
      <Avatar className="h-11 w-11 flex-shrink-0">
        <AvatarFallback className={cn("text-white font-semibold text-sm", avatarColor)}>
          {demo ? "*" : (conversation.contactName?.[0]?.toUpperCase() || "?")}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h4 className="font-semibold text-[14px] text-gray-900 truncate leading-tight">
            {displayName ||
                displayPhone ||
                "Unknown"}
          </h4>
          <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0 font-medium">
            {lastMessageTime}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center min-w-0">
            {conversation.type === "whatsapp" && (
              <MessageCircle className="w-3.5 h-3.5 text-green-500 inline-block mr-1.5 flex-shrink-0" />
            )}
            {conversation.type === "messenger" && (
              <MessageCircle className="w-3.5 h-3.5 text-blue-500 inline-block mr-1.5 flex-shrink-0" />
            )}
            {conversation.type === "chatbot" && (
              <Bot className="w-3.5 h-3.5 text-green-500 inline-block mr-1.5 flex-shrink-0" />
            )}
            <p className="text-[13px] text-gray-500 truncate leading-tight">
              {getMessagePreview(conversation.lastMessageText, demo) ||
                "No messages yet"}
            </p>
          </div>

          {conversation.unreadCount && conversation.unreadCount > 0 && (
            <Badge className="ml-1 bg-green-500 hover:bg-green-500 text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center rounded-full px-1.5 font-semibold flex-shrink-0">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationListItem;
