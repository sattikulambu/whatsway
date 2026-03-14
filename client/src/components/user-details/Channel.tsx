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

import { useState } from "react";
import { PageNumbers } from "@/components/ui/page-numbers";
import { AlertCircle, Loader2, Users, MoreHorizontal, Unplug, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { EmptyState } from "../EmptyState";
import { StateDisplay } from "../StateDisplay";
import { isDemoUser, maskValue } from "@/utils/maskUtils";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Channel {
  id: string;
  name: string;
  phoneNumberId: string;
  phoneNumber: string;
  accessToken: string;
  whatsappBusinessAccountId: string;
  isActive: boolean;
  healthStatus: string;
  lastHealthCheck: string;
  healthDetails: {
    error: string;
    error_code: number;
    error_type: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface ChannelsProps {
  userId: string;
}

export default function Channels({ userId }: ChannelsProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [confirmAction, setConfirmAction] = useState<{
    type: "disconnect" | "delete";
    channel: Channel;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["/api/channels/userid", userId, page],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/channels/userid", {
        userId,
        page,
        limit,
      });
      const json = await res.json();
      return json;
    },
    enabled: !!userId,
  });

  const channels: Channel[] = response?.data || [];
  const pagination = response?.pagination;

  const handleChannelAction = async () => {
    if (!confirmAction) return;
    const { type, channel } = confirmAction;
    setActionLoading(true);
    try {
      if (type === "disconnect") {
        await apiRequest("POST", `/api/channels/${channel.id}/disconnect`);
        toast({
          title: "Channel Disconnected",
          description: `${channel.name || channel.phoneNumber} has been disconnected. The user can reconnect later.`,
        });
      } else {
        await apiRequest("DELETE", `/api/channels/${channel.id}`);
        toast({
          title: "Channel Deleted",
          description: `${channel.name || channel.phoneNumber} and all associated data have been permanently deleted.`,
        });
      }
      setConfirmAction(null);
      queryClient.invalidateQueries({ queryKey: ["/api/channels/userid", userId] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to ${type} channel: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading channels...
      </div>
    );

  // if (isError)
  //   return (
  //     <p className="text-red-500 text-sm">
  //       Error: {(error as Error)?.message || "Failed to load channels"}
  //     </p>
  //   );

  // if (channels.length === 0)
  //   return <p className="text-muted-foreground">No channels found.</p>;

  // if (channels.length === 0) {
  //   return (
  //     <EmptyState
  //       icon={Users}
  //       title="No Team Members Yet"
  //       description="Start building your team by inviting members. They'll appear here once added."
  //       buttonText="Invite Team Member"
  //     />
  //   );
  // }

  // Error State
  if (isError) {
    return (
      <StateDisplay
        variant="error"
        icon={AlertCircle}
        title="Failed to Load Channels"
        description={"Something went wrong while fetching Channels."}
        buttonText="Try Again"
        onButtonClick={() => window.location.reload()}
      />
    );
  }

  // Empty State
  if (channels.length === 0) {
    return (
      <StateDisplay
        icon={Users}
        title="No Channels Yet"
        description="Start building your team by inviting members. They'll appear here once added."
        buttonText="Invite Team Member"
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 bg-white rounded-lg shadow-sm">
          <thead className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
            <tr>
              <th className="py-3 px-4 border-b">Name</th>
              <th className="py-3 px-4 border-b">Phone Number</th>
              <th className="py-3 px-4 border-b">Status</th>
              <th className="py-3 px-4 border-b">Health</th>
              <th className="py-3 px-4 border-b">Last Health Check</th>
              <th className="py-3 px-4 border-b">Created At</th>
              {user?.role === "superadmin" && (
                <th className="py-3 px-4 border-b">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {channels.map((channel) => (
              <tr
                key={channel.id}
                className="hover:bg-gray-50 transition-colors text-sm text-gray-700"
              >
                <td className="py-3 px-4 border-b">{channel.name}</td>
                <td className="py-3 px-4 border-b">{isDemoUser(user?.username) ? maskValue(channel.phoneNumber) : channel.phoneNumber}</td>
                <td className="py-3 px-4 border-b">
                  {channel.isActive ? (
                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 border-b">
                  {channel.healthStatus === "error" ? (
                    <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">
                      {channel.healthDetails?.error || "Error"}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                      {channel.healthStatus}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 border-b">
                  {channel.lastHealthCheck
                    ? new Date(channel.lastHealthCheck).toLocaleString()
                    : "-"}
                </td>
                <td className="py-3 px-4 border-b">
                  {new Date(channel.createdAt).toLocaleDateString()}
                </td>
                {user?.role === "superadmin" && (
                  <td className="py-3 px-4 border-b">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {channel.isActive && (
                          <DropdownMenuItem
                            className="text-orange-600 focus:text-orange-600"
                            onClick={() => setConfirmAction({ type: "disconnect", channel })}
                          >
                            <Unplug className="mr-2 h-4 w-4" />
                            Disconnect
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setConfirmAction({ type: "delete", channel })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination (Fully Responsive) */}
      {pagination && (
        <div className="w-full mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* LEFT SIDE → Showing + Per Page */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm text-gray-700">
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, pagination.total)} of {pagination.total}{" "}
              channels
            </span>

            {/* Per Page Selector (optional) */}
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border px-3 py-2 rounded-md text-sm w-24"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* RIGHT SIDE → Pagination Buttons */}
          <div className="flex items-center justify-center sm:justify-end gap-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            >
              Previous
            </button>

            <PageNumbers
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPage(p)}
            />

            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page >= pagination.totalPages}
              onClick={() =>
                setPage((prev) => Math.min(prev + 1, pagination.totalPages))
              }
            >
              Next
            </button>
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "disconnect"
                ? "Disconnect Channel"
                : "Delete Channel"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {confirmAction?.type === "disconnect" ? (
                <>
                  <span className="block">
                    Are you sure you want to disconnect <strong>{confirmAction?.channel.name || confirmAction?.channel.phoneNumber}</strong>?
                  </span>
                  <span className="block">
                    This will deactivate the channel and deregister it from WhatsApp. The user's data (contacts, conversations, templates) will be preserved and they can reconnect later.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">
                    Are you sure you want to delete <strong>{confirmAction?.channel.name || confirmAction?.channel.phoneNumber}</strong>?
                  </span>
                  <span className="block text-red-600 font-medium">
                    This will permanently delete the channel and ALL associated data including contacts, conversations, messages, templates, campaigns, and automations. This action cannot be undone.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleChannelAction}
              disabled={actionLoading}
              className={
                confirmAction?.type === "disconnect"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {actionLoading
                ? "Processing..."
                : confirmAction?.type === "disconnect"
                  ? "Disconnect"
                  : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
