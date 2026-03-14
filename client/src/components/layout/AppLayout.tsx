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

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { setMeta } from "@/hooks/setMeta";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { useSocket } from "@/contexts/socket-context";
import { useGlobalNotifications } from "../notification/useGlobalNotifications.tsx";
import { api } from "@/lib/api"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: brandSettings } = useQuery({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });


 const { socket } = useSocket();

  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations/global"],
    queryFn: async () => {
      const res = await api.getConversations(); // or active channel
      return res.json();
    },
  });

  // 🔥 GLOBAL notification + title logic
  useGlobalNotifications(socket, conversations);

  useEffect(() => {
    if (brandSettings) {
      setMeta({
        title: brandSettings.title,
        favicon: brandSettings.favicon,
        description: brandSettings.tagline,
        keywords: `${brandSettings.title} ${brandSettings.tagline}`,
      });
    }
  }, [brandSettings]);

  return (
    <>
      <SidebarProvider>{children}</SidebarProvider>
    </>
  );
}
