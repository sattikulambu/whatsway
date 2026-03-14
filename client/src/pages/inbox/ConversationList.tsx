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

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/ui/loading";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import ConversationListItem from "./ConversationListItem";
import type { ConversationWithContact } from "./types";
import type { Conversation } from "@shared/schema";

interface ConversationListProps {
  conversations: ConversationWithContact[];
  conversationsLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterTab: string;
  onFilterTabChange: (tab: string) => void;
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: ConversationWithContact) => void;
  user?: any;
}

const ConversationList = ({
  conversations,
  conversationsLoading,
  searchQuery,
  onSearchChange,
  filterTab,
  onFilterTabChange,
  selectedConversation,
  onSelectConversation,
  user,
}: ConversationListProps) => {
  return (
    <div
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)]",
        selectedConversation
          ? "hidden md:flex md:w-[340px] lg:w-[400px]"
          : "w-full md:w-[340px] lg:w-[400px]"
      )}
    >
      <div className="p-2 sm:p-3 md:p-4 border-b border-gray-200 bg-white">
        <div className="relative mb-2 sm:mb-3">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-7 sm:pl-9 pr-2 sm:pr-3 bg-gray-50 text-xs sm:text-sm w-full h-8 sm:h-10 rounded-lg"
          />
        </div>

        <Tabs value={filterTab} onValueChange={onFilterTabChange}>
          <div className="overflow-x-auto -mx-2 sm:-mx-3 md:-mx-4 px-2 sm:px-3 md:px-4 [&::-webkit-scrollbar]:h-[2px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
            <TabsList className="inline-flex w-auto h-7 sm:h-9 md:h-10 gap-1 sm:gap-1.5 md:gap-2 bg-gray-100 p-0.5 sm:p-1 rounded-lg">
              <TabsTrigger
                value="all"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="whatsapp"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                WA
              </TabsTrigger>
              <TabsTrigger
                value="chatbot"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                Widget
              </TabsTrigger>
              <TabsTrigger
                value="assigned"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                Assigned
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                Unread
              </TabsTrigger>
              <TabsTrigger
                value="open"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                Open
              </TabsTrigger>
              <TabsTrigger
                value="resolved"
                className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md"
              >
                Resolved
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 ">
        {conversationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loading />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No conversations found
          </div>
        ) : (
          conversations.map(
            (conversation: ConversationWithContact) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversation?.id === conversation.id}
                onClick={() => onSelectConversation(conversation)}
                user={user}
              />
            )
          )
        )}
      </ScrollArea>                                                 
    </div>
  );
};

export default ConversationList;
