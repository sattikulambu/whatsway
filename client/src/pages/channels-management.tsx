import React, { useEffect, useState } from "react";
import { PageNumbers } from "@/components/ui/page-numbers";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FaSearch } from "react-icons/fa";
import Header from "@/components/layout/header";
import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { isDemoUser, maskPhone, maskEmail, maskName } from "@/utils/maskUtils";
import { MoreHorizontal, Unplug, Trash2, Lightbulb, AlertCircle } from "lucide-react";
import { getOAuthError, getWhatsAppError } from "@shared/whatsapp-error-codes";
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

interface ChannelType {
  id: string;
  name: string;
  phoneNumber: string;
  phoneNumberId?: string;
  whatsappBusinessAccountId?: string;
  isActive: boolean;
  isCoexistence?: boolean;
  healthStatus?: string;
  lastHealthCheck?: string;
  healthDetails?: any;
  connectionMethod?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  ownerUsername?: string;
  ownerEmail?: string;
}

interface SignupLogType {
  id: string;
  userId: string;
  status: string;
  step: string;
  errorMessage?: string;
  errorDetails?: any;
  phoneNumber?: string;
  wabaId?: string;
  channelId?: string;
  createdAt: string;
  username?: string;
  email?: string;
}

interface PaginationType {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const healthColors: Record<string, string> = {
  healthy: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  unknown: "bg-gray-100 text-gray-800",
};

const statusBadgeColors: Record<string, string> = {
  success: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  incomplete: "bg-yellow-100 text-yellow-800",
};

const ChannelsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"channels" | "signup-logs">("channels");
  const { toast } = useToast();
  const { user } = useAuth();
  const _isDemo = isDemoUser(user?.username);

  const [channels, setChannels] = useState<ChannelType[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const [channelStatusFilter, setChannelStatusFilter] = useState("");
  const [channelHealthFilter, setChannelHealthFilter] = useState("");
  const [channelPagination, setChannelPagination] = useState<PaginationType>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [logs, setLogs] = useState<SignupLogType[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [logPagination, setLogPagination] = useState<PaginationType>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const fetchChannels = async (
    page = 1,
    searchTerm = "",
    limit = channelPagination.limit,
    status = channelStatusFilter,
    health = channelHealthFilter
  ) => {
    try {
      setChannelsLoading(true);
      let url = `/api/admin/channels?page=${page}&limit=${limit}&search=${encodeURIComponent(searchTerm)}`;
      if (status) {
        url += `&status=${status}`;
      }
      if (health) {
        url += `&health=${health}`;
      }
      const response = await apiRequest(
        "GET",
        url
      );
      const data = await response.json();
      if (data.success) {
        setChannels(data.data);
        setChannelPagination(data.pagination);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch channels",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch channels",
        variant: "destructive",
      });
    } finally {
      setChannelsLoading(false);
    }
  };

  const fetchLogs = async (
    page = 1,
    statusFilter = logStatusFilter,
    limit = logPagination.limit
  ) => {
    try {
      setLogsLoading(true);
      let url = `/api/admin/channel-signup-logs?page=${page}&limit=${limit}`;
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      const response = await apiRequest("GET", url);
      const data = await response.json();
      if (data.success) {
        setLogs(data.data);
        setLogPagination(data.pagination);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch signup logs",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch signup logs",
        variant: "destructive",
      });
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "channels") {
      fetchChannels(channelPagination.page, channelSearch, channelPagination.limit, channelStatusFilter, channelHealthFilter);
    }
  }, [activeTab, channelPagination.page, channelPagination.limit]);

  useEffect(() => {
    if (activeTab === "signup-logs") {
      fetchLogs(logPagination.page, logStatusFilter, logPagination.limit);
    }
  }, [activeTab, logPagination.page, logPagination.limit, logStatusFilter]);

  const handleChannelSearch = (e: any) => {
    e.preventDefault();
    setChannelPagination((prev) => ({ ...prev, page: 1 }));
    fetchChannels(1, channelSearch, channelPagination.limit);
  };

  const handleChannelPageChange = (p: number) => {
    if (p >= 1 && p <= channelPagination.totalPages) {
      setChannelPagination((prev) => ({ ...prev, page: p }));
    }
  };

  const handleLogPageChange = (p: number) => {
    if (p >= 1 && p <= logPagination.totalPages) {
      setLogPagination((prev) => ({ ...prev, page: p }));
    }
  };

  const [confirmAction, setConfirmAction] = useState<{
    type: "disconnect" | "delete";
    channel: ChannelType;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
      fetchChannels(channelPagination.page, channelSearch, channelPagination.limit, channelStatusFilter, channelHealthFilter);
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

  const getHealthLabel = (status?: string) => {
    if (!status) return "unknown";
    return status.toLowerCase();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  const getEnrichedLogError = (log: SignupLogType) => {
    let errCode: number | undefined;
    let errType: string | undefined;
    let errMessage: string | undefined;
    let serverDescription: string | undefined;
    let serverSuggestion: string | undefined;

    if (log.errorDetails) {
      let details = log.errorDetails;
      if (typeof details === "string") {
        try { details = JSON.parse(details); } catch {}
      }
      if (typeof details === "object" && details !== null) {
        errCode = details.code;
        errType = details.type;
        errMessage = details.message || details.error_user_msg;
        serverDescription = details.description;
        serverSuggestion = details.suggestion;
      }
    }

    if (!errCode && log.errorMessage) {
      const codeMatch = log.errorMessage.match(/code[:\s]+(\d+)/i);
      if (codeMatch) errCode = parseInt(codeMatch[1], 10);
    }

    if (serverDescription && serverSuggestion) {
      return {
        code: errCode || 0,
        title: errType || "Error",
        description: serverDescription,
        suggestion: serverSuggestion,
        category: "server",
      };
    }

    if (errCode || errType) {
      if (errType === "OAuthException" || errType === "GraphMethodException") {
        return getOAuthError(errCode, errType, errMessage || log.errorMessage);
      }
      return getWhatsAppError(errCode);
    }

    if (log.errorMessage && log.status === "failed") {
      return {
        code: 0,
        title: "Error",
        description: log.errorMessage,
        suggestion: "Check the error details and try again. If the issue persists, contact support.",
        category: "general",
      };
    }

    return null;
  };

  const renderPagination = (
    pagination: PaginationType,
    setPaginationFn: React.Dispatch<React.SetStateAction<PaginationType>>,
    handlePageChangeFn: (p: number) => void,
    label: string
  ) => (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
      <div className="flex items-center gap-4 order-2 sm:order-1">
        <span className="text-sm text-gray-700">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
          {pagination.total} {label}
        </span>
        <select
          value={pagination.limit}
          onChange={(e) =>
            setPaginationFn((p) => ({
              ...p,
              limit: Number(e.target.value),
              page: 1,
            }))
          }
          className="border px-2 py-1 rounded text-sm"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
      <div className="flex items-center gap-2 order-1 sm:order-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page === 1}
          onClick={() => handlePageChangeFn(pagination.page - 1)}
        >
          Previous
        </Button>
        <PageNumbers
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChangeFn}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page === pagination.totalPages}
          onClick={() => handlePageChangeFn(pagination.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dots-bg">
      <Header title="Channels Management" subtitle="Manage all channels and signup attempts" />

      <div className="p-4 md:p-6">
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("channels")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "channels"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Channels
          </button>
          <button
            onClick={() => setActiveTab("signup-logs")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "signup-logs"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Signup Logs
          </button>
        </div>

        {activeTab === "channels" && (
          <>
            <form
              onSubmit={handleChannelSearch}
              className="flex flex-col sm:flex-row gap-3 mb-6 w-full"
            >
              <div className="relative flex-1">
                <Input
                  placeholder="Search by channel name, phone number, or owner..."
                  value={channelSearch}
                  onChange={(e) => setChannelSearch(e.target.value)}
                  className="pl-10 w-full"
                />
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <select
                value={channelStatusFilter}
                onChange={(e) => {
                  setChannelStatusFilter(e.target.value);
                  setChannelPagination((prev) => ({ ...prev, page: 1 }));
                  fetchChannels(1, channelSearch, channelPagination.limit, e.target.value, channelHealthFilter);
                }}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white w-full sm:w-auto"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={channelHealthFilter}
                onChange={(e) => {
                  setChannelHealthFilter(e.target.value);
                  setChannelPagination((prev) => ({ ...prev, page: 1 }));
                  fetchChannels(1, channelSearch, channelPagination.limit, channelStatusFilter, e.target.value);
                }}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white w-full sm:w-auto"
              >
                <option value="">All Health</option>
                <option value="healthy">Healthy</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="unknown">Unknown</option>
              </select>
              <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setChannelSearch("");
                  setChannelStatusFilter("");
                  setChannelHealthFilter("");
                  setChannelPagination((prev) => ({ ...prev, page: 1 }));
                  fetchChannels(1, "", channelPagination.limit, "", "");
                }}
                className="w-full sm:w-auto"
              >
                Clear
              </Button>
            </form>

            <div className="mb-4 text-sm text-gray-700">
              Showing {channels.length} of {channelPagination.total} channels
            </div>

            <div className="hidden md:block bg-white border rounded-lg shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Channel Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Phone Number</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Owner</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Health</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Connection</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {channelsLoading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-500">
                        Loading channels...
                      </td>
                    </tr>
                  ) : channels.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-500">
                        No channels found
                      </td>
                    </tr>
                  ) : (
                    channels.map((ch) => (
                      <tr key={ch.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{_isDemo ? maskName(ch.name || "Unnamed") : (ch.name || "Unnamed")}</td>
                        <td className="px-4 py-3 text-sm">{_isDemo ? maskPhone(ch.phoneNumber) : (ch.phoneNumber || "N/A")}</td>
                        <td className="px-4 py-3">
                          <div>
                            {ch.createdBy ? (
                              <Link
                                href={`/users/${ch.createdBy}`}
                                className="text-sm font-medium hover:text-green-600"
                              >
                                {ch.ownerUsername || "Unknown"}
                              </Link>
                            ) : (
                              <span className="text-sm text-gray-500">Unknown</span>
                            )}
                            {ch.ownerEmail && (
                              <p className="text-xs text-gray-500">{_isDemo ? maskEmail(ch.ownerEmail) : ch.ownerEmail}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              ch.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {ch.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              healthColors[getHealthLabel(ch.healthStatus)] || healthColors.unknown
                            }`}
                          >
                            {(ch.healthStatus || "unknown").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {ch.connectionMethod || "N/A"}
                        </td>
                        <td className="px-4 py-3 text-sm">{formatDate(ch.createdAt)}</td>
                        <td className="px-4 py-3">
                          {_isDemo ? (
                            <span className="text-xs text-gray-400">Disabled</span>
                          ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {ch.isActive && (
                                <DropdownMenuItem
                                  className="text-orange-600 focus:text-orange-600"
                                  onClick={() => setConfirmAction({ type: "disconnect", channel: ch })}
                                >
                                  <Unplug className="mr-2 h-4 w-4" />
                                  Disconnect
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => setConfirmAction({ type: "delete", channel: ch })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {channelsLoading ? (
                <p className="text-center text-gray-500 py-10">Loading channels...</p>
              ) : channels.length === 0 ? (
                <p className="text-center text-gray-500 py-10">No channels found</p>
              ) : (
                channels.map((ch) => (
                  <div
                    key={ch.id}
                    className="bg-white shadow-sm rounded-lg p-4 border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{_isDemo ? maskName(ch.name || "Unnamed") : (ch.name || "Unnamed")}</p>
                        <p className="text-xs text-gray-500">{_isDemo ? maskPhone(ch.phoneNumber) : (ch.phoneNumber || "N/A")}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          ch.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {ch.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>Owner:</strong>{" "}
                        {ch.createdBy ? (
                          <Link
                            href={`/users/${ch.createdBy}`}
                            className="hover:text-green-600"
                          >
                            {ch.ownerUsername || "Unknown"}
                          </Link>
                        ) : (
                          "Unknown"
                        )}
                        {ch.ownerEmail && (
                          <span className="text-xs text-gray-500 ml-1">({_isDemo ? maskEmail(ch.ownerEmail) : ch.ownerEmail})</span>
                        )}
                      </p>
                      <p>
                        <strong>Health:</strong>{" "}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            healthColors[getHealthLabel(ch.healthStatus)] || healthColors.unknown
                          }`}
                        >
                          {(ch.healthStatus || "unknown").toUpperCase()}
                        </span>
                      </p>
                      <p>
                        <strong>Connection:</strong> {ch.connectionMethod || "N/A"}
                      </p>
                      <p>
                        <strong>Created:</strong> {formatDate(ch.createdAt)}
                      </p>
                    </div>
                    {!_isDemo && (
                    <div className="flex gap-2 pt-2 border-t">
                      {ch.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50 flex-1"
                          onClick={() => setConfirmAction({ type: "disconnect", channel: ch })}
                        >
                          <Unplug className="mr-1.5 h-3.5 w-3.5" />
                          Disconnect
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50 flex-1"
                        onClick={() => setConfirmAction({ type: "delete", channel: ch })}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {renderPagination(
              channelPagination,
              setChannelPagination,
              handleChannelPageChange,
              "channels"
            )}
          </>
        )}

        {activeTab === "signup-logs" && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <select
                value={logStatusFilter}
                onChange={(e) => {
                  setLogStatusFilter(e.target.value);
                  setLogPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="border px-3 py-2 rounded text-sm w-full sm:w-auto"
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="incomplete">Incomplete</option>
              </select>
            </div>

            <div className="mb-4 text-sm text-gray-700">
              Showing {logs.length} of {logPagination.total} logs
            </div>

            <div className="hidden md:block bg-white border rounded-lg shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Step Reached</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Error Message</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Phone Number</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-500">
                        Loading logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-500">
                        No signup logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const hasDetails = log.errorMessage || log.errorDetails || log.wabaId;
                      const isExpanded = expandedLogId === log.id;
                      return (
                        <React.Fragment key={log.id}>
                          <tr
                            className={`hover:bg-gray-50 ${hasDetails ? "cursor-pointer" : ""} ${isExpanded ? "bg-gray-50" : ""}`}
                            onClick={() => hasDetails && setExpandedLogId(isExpanded ? null : log.id)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {hasDetails && (
                                  <span className="text-gray-400 text-xs">{isExpanded ? "▼" : "▶"}</span>
                                )}
                                <div>
                                  <p className="text-sm font-medium">{log.username || "Unknown"}</p>
                                  {log.email && (
                                    <p className="text-xs text-gray-500">{_isDemo ? maskEmail(log.email) : log.email}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  statusBadgeColors[log.status] || "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {log.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{log.step || "N/A"}</td>
                            <td className="px-4 py-3 text-sm max-w-xs">
                              {log.errorMessage ? (
                                <span className="truncate block max-w-[200px]">
                                  {log.errorMessage}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {log.phoneNumber ? (_isDemo ? maskPhone(log.phoneNumber) : log.phoneNumber) : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-sm">{formatDate(log.createdAt)}</td>
                          </tr>
                          {isExpanded && (() => {
                            const enriched = getEnrichedLogError(log);
                            return (
                            <tr>
                              <td colSpan={6} className="px-0 py-0">
                                <div className={`mx-4 my-2 p-4 rounded-lg text-sm space-y-3 ${log.status === "failed" ? "bg-red-50 border border-red-200" : log.status === "incomplete" ? "bg-yellow-50 border border-yellow-200" : "bg-green-50 border border-green-200"}`}>
                                  {enriched && (
                                    <div className="space-y-2">
                                      <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs font-mono font-semibold">
                                              Error {enriched.code}
                                            </span>
                                            <span className="text-sm font-medium text-red-800">{enriched.title}</span>
                                          </div>
                                          <p className="text-sm text-red-700 mt-1">{enriched.description}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                                        <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                                        <div>
                                          <span className="text-xs font-semibold text-amber-800">Suggested Fix:</span>
                                          <p className="text-xs text-amber-700 mt-0.5">{enriched.suggestion}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {log.errorMessage && (
                                    <div>
                                      <span className="font-semibold text-gray-700">Error Message:</span>
                                      <p className="text-red-700 mt-1">{log.errorMessage}</p>
                                    </div>
                                  )}
                                  {log.wabaId && (
                                    <div>
                                      <span className="font-semibold text-gray-700">WABA ID:</span>{" "}
                                      <span className="font-mono text-gray-600">{log.wabaId}</span>
                                    </div>
                                  )}
                                  {log.channelId && (
                                    <div>
                                      <span className="font-semibold text-gray-700">Channel ID:</span>{" "}
                                      <span className="font-mono text-gray-600">{log.channelId}</span>
                                    </div>
                                  )}
                                  {log.errorDetails && (
                                    <div>
                                      <span className="font-semibold text-gray-700">Raw Error Details (Meta API):</span>
                                      <pre className="mt-1 p-3 bg-white border rounded text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap">
                                        {JSON.stringify(log.errorDetails, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                            );
                          })()}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {logsLoading ? (
                <p className="text-center text-gray-500 py-10">Loading logs...</p>
              ) : logs.length === 0 ? (
                <p className="text-center text-gray-500 py-10">No signup logs found</p>
              ) : (
                logs.map((log) => {
                  const hasDetails = log.errorMessage || log.errorDetails || log.wabaId;
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <div
                      key={log.id}
                      className={`bg-white shadow-sm rounded-lg p-4 border space-y-3 ${hasDetails ? "cursor-pointer" : ""}`}
                      onClick={() => hasDetails && setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {hasDetails && (
                            <span className="text-gray-400 text-xs">{isExpanded ? "▼" : "▶"}</span>
                          )}
                          <div>
                            <p className="font-semibold text-gray-800">
                              {log.username || "Unknown"}
                            </p>
                            {log.email && (
                              <p className="text-xs text-gray-500">{_isDemo ? maskEmail(log.email) : log.email}</p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            statusBadgeColors[log.status] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>Step:</strong> {log.step || "N/A"}
                        </p>
                        {log.errorMessage && (
                          <p>
                            <strong>Error:</strong>{" "}
                            <span className="text-red-600">{log.errorMessage}</span>
                          </p>
                        )}
                        <p>
                          <strong>Phone:</strong> {_isDemo ? maskPhone(log.phoneNumber || "") || "N/A" : (log.phoneNumber || "N/A")}
                        </p>
                        <p>
                          <strong>Date:</strong> {formatDate(log.createdAt)}
                        </p>
                      </div>
                      {isExpanded && (() => {
                        const enriched = getEnrichedLogError(log);
                        return (
                        <div className={`p-3 rounded-lg text-sm space-y-3 ${log.status === "failed" ? "bg-red-50 border border-red-200" : log.status === "incomplete" ? "bg-yellow-50 border border-yellow-200" : "bg-green-50 border border-green-200"}`}>
                          {enriched && (
                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs font-mono font-semibold">
                                      Error {enriched.code}
                                    </span>
                                    <span className="text-sm font-medium text-red-800">{enriched.title}</span>
                                  </div>
                                  <p className="text-sm text-red-700 mt-1">{enriched.description}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                                <div>
                                  <span className="text-xs font-semibold text-amber-800">Suggested Fix:</span>
                                  <p className="text-xs text-amber-700 mt-0.5">{enriched.suggestion}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          {log.errorMessage && (
                            <div>
                              <span className="font-semibold text-gray-700">Full Error:</span>
                              <p className="text-red-700 mt-1">{log.errorMessage}</p>
                            </div>
                          )}
                          {log.wabaId && (
                            <div>
                              <span className="font-semibold text-gray-700">WABA ID:</span>{" "}
                              <span className="font-mono text-gray-600">{log.wabaId}</span>
                            </div>
                          )}
                          {log.channelId && (
                            <div>
                              <span className="font-semibold text-gray-700">Channel ID:</span>{" "}
                              <span className="font-mono text-gray-600">{log.channelId}</span>
                            </div>
                          )}
                          {log.errorDetails && (
                            <div>
                              <span className="font-semibold text-gray-700">Raw Error Details (Meta API):</span>
                              <pre className="mt-1 p-2 bg-white border rounded text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(log.errorDetails, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                        );
                      })()}
                    </div>
                  );
                })
              )}
            </div>

            {renderPagination(
              logPagination,
              setLogPagination,
              handleLogPageChange,
              "logs"
            )}
          </>
        )}
      </div>

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
};

export default ChannelsManagement;
