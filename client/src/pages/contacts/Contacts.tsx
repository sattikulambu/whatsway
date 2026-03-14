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

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Loading } from "@/components/ui/loading";
import { useTranslation } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertContactSchema,
  type Contact,
  type InsertContact,
} from "@shared/schema";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

import { type ContactsResponse, type TemplateVariables } from "./types";
import { exportToExcel } from "./utils";
import { ContactsToolbar } from "./ContactsToolbar";
import { ContactsTable } from "./ContactsTable";
import { ContactDialogs } from "./ContactDialogs";
import { TemplateMessageDialog } from "./TemplateMessageDialog";

const ITEMS_PER_PAGE = 10;

export default function Contacts() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showAssignGroupDialog, setShowAssignGroupDialog] = useState(false);
  const [assignGroupContactIds, setAssignGroupContactIds] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [templateVariables, setTemplateVariables] = useState<TemplateVariables>({});

  const [templateSampleValues, setTemplateSampleValues] =
    useState<Record<string, string>>({});

  const templateMetaVars = Object.keys(templateVariables);

  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [requiresHeaderImage, setRequiresHeaderImage] = useState(false);
  const [headerType, setHeaderType] = useState<string | null>(null);
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
  const [uploadedMediaId, setUploadedMediaId] = useState<string | null>(null);

  const [selectedTemplateWhatsappId, setSelectedTemplateWhatsappId] = useState("");
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const fetchTemplateMeta = async (templateWhatsappId: string) => {
    const res = await fetch(
      `/api/whatsapp/templates/${templateWhatsappId}/meta?channelId=${activeChannel.id}`
    );

    const data = await res.json();
    console.log("✅ TEMPLATE META:", data);
    return data;
  };

  useEffect(() => {
    if (!selectedTemplate?.variables) return;

    const samples: Record<string, string> = {};
    selectedTemplate.variables.forEach((val: string, index: number) => {
      samples[String(index + 1)] = val;
    });

    setTemplateSampleValues(samples);
  }, [selectedTemplate]);

  const uploadHeaderImage = async (file: File) => {
    if (!activeChannel?.id) {
      toast({
        title: "Error",
        description: "No active channel found",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("mediaFile", file);
      formData.append("templateId", selectedTemplateId);
      const res = await fetch(
        `/api/whatsapp/channels/${activeChannel.id}/upload-image`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      console.log("✅ Image uploaded, media ID:", data.mediaId);

      setUploadedMediaId(data.mediaId);
      setHeaderImageFile(file);

      return data.mediaId;
    } catch (error) {
      console.error("❌ Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phone = params.get("phone");
    if (phone) {
      setSearchQuery(phone);
    }
    console.log("Initial search query from URL:", phone);
  }, []);

  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      groups: [],
      tags: [],
    },
  });

  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  const { data: groupsFormateData } = useQuery({
    queryKey: ["/api/groups", activeChannel?.id],
    queryFn: async () => {
      const response = await fetch(`/api/groups?channelId=${activeChannel?.id}`);
      return await response.json();
    },
    enabled: !!activeChannel?.id,
  });

  const groupsData = groupsFormateData?.groups || [];

  const userIdNew = user?.role === "team" ? user?.createdBy : user?.id;

  const { data: contactsResponse, isLoading } = useQuery<ContactsResponse>({
    queryKey: [
      "/api/contacts",
      activeChannel?.id,
      currentPage,
      limit,
      selectedGroup,
      selectedStatus,
      searchQuery,
      userIdNew,
    ],

    queryFn: async () => {
      if (!user?.id) return { data: [], pagination: {} } as any;

      const response = await api.getContacts(
        searchQuery || undefined,
        activeChannel?.id,
        currentPage,
        limit,
        selectedGroup !== "all" && selectedGroup ? selectedGroup : undefined,
        selectedStatus !== "all" && selectedStatus ? selectedStatus : undefined,
        userIdNew
      );

      return (await response.json()) as ContactsResponse;
    },

    placeholderData: (prev) => prev,
  });

  const contacts = contactsResponse?.data || [];
  const pagination = contactsResponse?.pagination || {
    page: 1,
    limit: limit,
    count: 0,
    total: 0,
    totalPages: 1,
  };

  const { page, totalPages, total, count } = pagination;

  const goToPage = (p: number) => setCurrentPage(p);
  const goToPreviousPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const halfRange = Math.floor(maxPagesToShow / 2);

    let startPage = Math.max(1, page - halfRange);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const uniqueGroups = useMemo(() => {
    if (!contacts.length) return [];
    const groups = new Set<string>();
    contacts.forEach((contact: Contact) => {
      if (Array.isArray(contact.groups)) {
        contact.groups.forEach((group: string) => groups.add(group));
      }
    });
    return Array.from(groups).sort();
  }, [contacts]);

  const uniqueStatuses = useMemo(() => {
    if (!contacts.length) return [];
    const statuses = new Set<string>();
    contacts.forEach((contact: Contact) => {
      if (contact.status) {
        statuses.add(contact.status);
      }
    });
    return Array.from(statuses).sort();
  }, [contacts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGroup, selectedStatus]);

  const allSelected =
    contacts.length > 0 &&
    contacts.every((contact: Contact) =>
      selectedContactIds.includes(contact.id)
    );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedContactIds((prev) =>
        prev.filter((id) => !contacts.some((contact) => contact.id === id))
      );
    } else {
      setSelectedContactIds((prev) => [
        ...prev,
        ...contacts
          .map((contact) => contact.id)
          .filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedGroup(null);
    setSelectedStatus(null);
    setCurrentPage(1);
  };

  const { data: channels } = useQuery({
    queryKey: ["/api/whatsapp/channels"],
    queryFn: async () => {
      const response = await fetch("/api/whatsapp/channels");
      return await response.json();
    },
  });

  console.log("activeChannel?.id", activeChannel?.id);

  const {
    data: tempData,
    isFetching: isTemplatesLoading,
    refetch: fetchTemplates,
  } = useQuery({
    queryKey: ["/api/templates", activeChannel?.id],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/templates?channelId=${activeChannel!.id}&page=1&limit=100`
      );
      return response.json();
    },
    enabled: showMessageDialog && !!activeChannel?.id,
    staleTime: 0,
  });

  useEffect(() => {
    if (showMessageDialog) {
      setMessageType("template");
      setSelectedTemplateName("");
    }
  }, [showMessageDialog]);

  useEffect(() => {
    if (showMessageDialog && activeChannel?.id) {
      fetchTemplates();
    }
  }, [showMessageDialog, activeChannel?.id]);

  const availableTemplates = Array.isArray(tempData)
    ? tempData
    : Array.isArray(tempData?.data)
    ? tempData.data
    : [];

  const createContactMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      if (!activeChannel?.id) {
        throw new Error("Please create a channel first.");
      }

      const response = await fetch(`/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          channelId: activeChannel.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.error || errorData?.message || "Failed to create contact";
        throw new Error(message);
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact created",
        description: "The contact has been successfully added.",
      });
      setShowAddDialog(false);
      form.reset();
    },

    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create contact.",
        variant: "destructive",
      });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete contact");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contact deleted",
        description: "The contact has been successfully deleted.",
      });
      setShowDeleteDialog(false);
      setContactToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBulkContactsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await fetch(`/api/contacts-bulk`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete contacts");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contacts deleted",
        description: "The selected contacts have been successfully deleted.",
      });
      setSelectedContactIds([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contacts. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const {
        phone,
        type,
        message,
        templateName,
        templateLanguage,
        templateVariables,
        headerMediaId,
      } = data;

      if (!activeChannel?.id) {
        throw new Error("No active channel selected");
      }

      const payload =
        type === "template"
          ? {
              to: phone,
              type: "template",
              templateName,
              templateLanguage,
              templateVariables,
              headerType,
              ...(headerMediaId && { headerMediaId }),
            }
          : {
              to: phone,
              type: "text",
              message,
            };

      console.log("📤 Sending payload to backend:", payload);

      const response = await fetch(
        `/api/whatsapp/channels/${activeChannel.id}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to send message");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your WhatsApp message has been sent successfully.",
      });
      setShowMessageDialog(false);
      setMessageText("");
      setMessageType("text");
      setSelectedTemplateName("");
      setTemplateVariables({});
      setUploadedMediaId(null);
      setHeaderImageFile(null);
      setRequiresHeaderImage(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send message. Please check your WhatsApp configuration and template settings.",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutationOLD = useMutation({
    mutationFn: async (data: any) => {
      const {
        phone,
        type,
        message,
        templateName,
        templateLanguage,
        templateVariables,
      } = data;

      if (!activeChannel?.id) {
        throw new Error("No active channel selected");
      }

      const payload =
        type === "template"
          ? {
              to: phone,
              type: "template",
              templateName,
              templateLanguage,
              templateVariables,
            }
          : {
              to: phone,
              type: "text",
              message,
            };

      const response = await fetch(
        `/api/whatsapp/channels/${activeChannel.id}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your WhatsApp message has been sent successfully.",
      });
      setShowMessageDialog(false);
      setMessageText("");
      setMessageType("text");
      setSelectedTemplateId("");
      setTemplateVariables({});
    },
    onError: () => {
      toast({
        title: "Error",
        description:
          "Failed to send message. Please check your WhatsApp configuration and template settings.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteContact = (id: string) => {
    setContactToDelete(id);
    setShowDeleteDialog(true);
  };

  const importContactsMutation = useMutation({
    mutationFn: async (contacts: InsertContact[]) => {
      const response = await fetch(
        `/api/contacts/import${
          activeChannel?.id ? `?channelId=${activeChannel.id}` : ""
        }`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contacts }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.error || errorData?.message || "Failed to create contact";
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Import Completed",
        description: `Imported: ${data.created}, Duplicates: ${data.duplicates}, Failed: ${data.failed}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import contacts. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleContactStatusMutation = useMutation({
    mutationFn: async ({
      id,
      newStatus,
    }: {
      id: string;
      newStatus: "active" | "blocked";
    }) => {
      const response = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok)
        throw new Error(
          `Failed to ${newStatus === "blocked" ? "block" : "unblock"} contact`
        );
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: `Contact ${newStatus === "blocked" ? "blocked" : "unblocked"}`,
        description: `The contact has been ${
          newStatus === "blocked" ? "blocked" : "unblocked"
        } successfully.`,
      });
    },
    onError: (_, { newStatus }) => {
      toast({
        title: "Error",
        description: `Failed to ${
          newStatus === "blocked" ? "block" : "unblock"
        } contact. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const handleToggleContactStatus = (
    id: string,
    currentStatus: string | null
  ): void => {
    const newStatus = currentStatus === "active" ? "blocked" : "active";
    toggleContactStatusMutation.mutate({ id, newStatus });
  };

  const addToGroupMutation = useMutation({
    mutationFn: async ({ contactIds, groupName }: { contactIds: string[]; groupName: string }) => {
      const response = await fetch("/api/groups/add-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds, groupName, channelId: activeChannel?.id }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to add contacts to group");
      return response.json();
    },
    onSuccess: (data, { groupName }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contacts added to group",
        description: `${data.updatedCount} contact${data.updatedCount !== 1 ? "s" : ""} added to "${groupName}"`,
      });
      setShowAssignGroupDialog(false);
      setAssignGroupContactIds([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add contacts to group",
        variant: "destructive",
      });
    },
  });

  const removeFromGroupMutation = useMutation({
    mutationFn: async ({ contactIds, groupName }: { contactIds: string[]; groupName: string }) => {
      const response = await fetch("/api/groups/remove-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds, groupName, channelId: activeChannel?.id }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to remove contacts from group");
      return response.json();
    },
    onSuccess: (data, { groupName }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Contacts removed from group",
        description: `${data.updatedCount} contact${data.updatedCount !== 1 ? "s" : ""} removed from "${groupName}"`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove contacts from group",
        variant: "destructive",
      });
    },
  });

  const handleOpenAssignGroup = (contactIds: string[]) => {
    setAssignGroupContactIds(contactIds);
    setShowAssignGroupDialog(true);
  };

  type LocalInsertContact = {
    name: string;
    phone: string;
    email: string;
    groups: string[];
    tags: string[];
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedContacts: LocalInsertContact[] = (results.data as any[])
            .filter((row) => row && Object.keys(row).length > 0)
            .map((row: any) => ({
              name: row?.name?.toString().trim() || "",
              phone: row?.phone ? String(row.phone).trim() : "",
              email: row?.email?.toString().trim() || "",
              groups: row?.groups
                ? row.groups.split(",").map((g: string) => g.trim())
                : [],
              tags: row?.tags
                ? row.tags.split(",").map((t: string) => t.trim())
                : [],
            }))
            .filter((c) => c.name || c.phone);

          if (parsedContacts.length === 0) {
            toast({
              title: "CSV Error",
              description: "No valid contacts found in the file.",
              variant: "destructive",
            });
            return;
          }

          importContactsMutation.mutate(parsedContacts);
        } catch (err: any) {
          toast({
            title: "CSV Parse Error",
            description: err.message || "Failed to parse CSV file.",
            variant: "destructive",
          });
        }
      },
      error: (err) => {
        toast({
          title: "CSV Error",
          description: err.message,
          variant: "destructive",
        });
      },
    });

    event.target.value = "";
  };

  const handleExcelUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        alert("No worksheet found in Excel file.");
        return;
      }

      const rows: Record<string, string>[] = [];

      const headerRow = worksheet.getRow(1);
      if (!headerRow || !headerRow.values) {
        alert("No header row found in Excel file.");
        return;
      }

      const headerValues = Array.isArray(headerRow.values)
        ? headerRow.values
            .slice(1)
            .map((h: ExcelJS.CellValue | undefined) =>
              typeof h === "string"
                ? h.trim().toLowerCase()
                : typeof h === "number"
                ? String(h)
                : ""
            )
        : [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const rowData: Record<string, string> = {};
        if (row.values && Array.isArray(row.values)) {
          row.values
            .slice(1)
            .forEach((cell: ExcelJS.CellValue | undefined, idx: number) => {
              const key = headerValues[idx];
              if (key) {
                if (typeof cell === "string") rowData[key] = cell.trim();
                else if (typeof cell === "number") rowData[key] = String(cell);
                else rowData[key] = "";
              }
            });
        }

        rows.push(rowData);
      });

      const parsedContacts: LocalInsertContact[] = rows.map((row) => ({
        name: row["name"] || "",
        phone: row["phone"] || "",
        email: row["email"] || "",
        groups: row["groups"]
          ? row["groups"].split(",").map((g) => g.trim())
          : [],
        tags: row["tags"] ? row["tags"].split(",").map((t) => t.trim()) : [],
      }));

      importContactsMutation.mutate(parsedContacts);
    } catch (error) {
      console.error("Error reading Excel file:", error);
      alert("Failed to read Excel file. Please check the format.");
    }

    event.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="flex-1 dots-bg">
        <Header title="Contacts" subtitle="Loading contacts..." />
        <div className="p-6">
          <Loading size="lg" text="Loading contacts..." />
        </div>
      </div>
    );
  }

  const handleExportSelectedContacts = () => {
    const selectedContacts = contacts.filter((contact) =>
      selectedContactIds.includes(contact.id)
    );

    if (selectedContacts.length === 0) {
      alert("No contacts selected.");
      return;
    }

    exportToExcel(selectedContacts, "selected_contacts.xlsx");
  };

  const handleExportAllContacts = async () => {
    try {
      const response = await fetch(
        `/api/contacts-all?channelId=${activeChannel?.id}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }

      const allContacts: Contact[] = await response.json();

      if (!allContacts || allContacts.length === 0) {
        alert("No contacts available.");
        return;
      }

      exportToExcel(allContacts, "all_contacts.xlsx");
    } catch (error) {
      console.error("Error exporting contacts:", error);
      alert("Failed to export contacts. Please try again.");
    }
  };

  const handleExcelDownload = () => {
    const sampleContacts = [
      {
        name: "Alice Smith",
        phone: "1234567890",
        email: "alice@example.com",
        groups: "Friends, Work",
        tags: "VIP, Newsletter",
      },
      {
        name: "Bob Johnson",
        phone: "9876543210",
        email: "bob@example.com",
        groups: "Family",
        tags: "New",
      },
      {
        name: "Charlie Brown",
        phone: "5555555555",
        email: "charlie@example.com",
        groups: "Customers, Support",
        tags: "Premium, Active",
      },
    ];

    exportToExcel(sampleContacts, "sample_contacts.xlsx");
  };

  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header
        title={t("contacts.title")}
        subtitle={t("contacts.subtitle")}
        action={{
          label: `${t("contacts.addContact.title")}`,
          onClick: () => {
            setShowAddDialog(true);
          },
        }}
      />

      <main className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <ContactsToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          groupsData={groupsData}
          handleExportAllContacts={handleExportAllContacts}
          handleCSVUpload={handleCSVUpload}
          handleExcelUpload={handleExcelUpload}
          handleExcelDownload={handleExcelDownload}
          handleExportSelectedContacts={handleExportSelectedContacts}
          handleOpenAssignGroup={handleOpenAssignGroup}
          setShowBulkDeleteDialog={setShowBulkDeleteDialog}
          selectedContactIds={selectedContactIds}
          user={user}
          setLocation={setLocation}
        />

        <ContactsTable
          contacts={contacts}
          selectedContactIds={selectedContactIds}
          allSelected={allSelected}
          toggleSelectAll={toggleSelectAll}
          toggleSelectOne={toggleSelectOne}
          searchQuery={searchQuery}
          selectedGroup={selectedGroup}
          selectedStatus={selectedStatus}
          clearAllFilters={clearAllFilters}
          setShowAddDialog={setShowAddDialog}
          setSelectedContact={setSelectedContact}
          setShowMessageDialog={setShowMessageDialog}
          setShowEditDialog={setShowEditDialog}
          handleDeleteContact={handleDeleteContact}
          handleToggleContactStatus={handleToggleContactStatus}
          handleOpenAssignGroup={handleOpenAssignGroup}
          fetchTemplates={fetchTemplates}
          activeChannel={activeChannel}
          channels={channels}
          user={user}
          deleteContactMutation={deleteContactMutation}
          toast={toast}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          setLimit={setLimit}
          setCurrentPage={setCurrentPage}
          goToPreviousPage={goToPreviousPage}
          goToNextPage={goToNextPage}
          getPageNumbers={getPageNumbers}
          goToPage={goToPage}
        />
      </main>

      <ContactDialogs
        showAddDialog={showAddDialog}
        setShowAddDialog={setShowAddDialog}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        showBulkDeleteDialog={showBulkDeleteDialog}
        setShowBulkDeleteDialog={setShowBulkDeleteDialog}
        showEditDialog={showEditDialog}
        setShowEditDialog={setShowEditDialog}
        showGroupDialog={showGroupDialog}
        setShowGroupDialog={setShowGroupDialog}
        showAssignGroupDialog={showAssignGroupDialog}
        setShowAssignGroupDialog={setShowAssignGroupDialog}
        selectedContact={selectedContact}
        setSelectedContact={setSelectedContact}
        contactToDelete={contactToDelete}
        setContactToDelete={setContactToDelete}
        selectedContactIds={selectedContactIds}
        setSelectedContactIds={setSelectedContactIds}
        assignGroupContactIds={assignGroupContactIds}
        setAssignGroupContactIds={setAssignGroupContactIds}
        contacts={contacts}
        groupsData={groupsData}
        activeChannel={activeChannel}
        user={user}
        form={form}
        createContactMutation={createContactMutation}
        deleteContactMutation={deleteContactMutation}
        deleteBulkContactsMutation={deleteBulkContactsMutation}
        addToGroupMutation={addToGroupMutation}
        removeFromGroupMutation={removeFromGroupMutation}
        queryClient={queryClient}
        toast={toast}
        groupName={groupName}
        setGroupName={setGroupName}
        groupDescription={groupDescription}
        setGroupDescription={setGroupDescription}
      />

      <TemplateMessageDialog
        showMessageDialog={showMessageDialog}
        setShowMessageDialog={setShowMessageDialog}
        selectedContact={selectedContact}
        activeChannel={activeChannel}
        messageType={messageType}
        setMessageType={setMessageType}
        messageText={messageText}
        setMessageText={setMessageText}
        selectedTemplateName={selectedTemplateName}
        setSelectedTemplateName={setSelectedTemplateName}
        templateVariables={templateVariables}
        setTemplateVariables={setTemplateVariables}
        templateMetaVars={templateMetaVars}
        templateSampleValues={templateSampleValues}
        availableTemplates={availableTemplates}
        requiresHeaderImage={requiresHeaderImage}
        setRequiresHeaderImage={setRequiresHeaderImage}
        headerType={headerType}
        setHeaderType={setHeaderType}
        uploadedMediaId={uploadedMediaId}
        setUploadedMediaId={setUploadedMediaId}
        headerImageFile={headerImageFile}
        setHeaderImageFile={setHeaderImageFile}
        selectedTemplateId={selectedTemplateId}
        setSelectedTemplateId={setSelectedTemplateId}
        setSelectedTemplate={setSelectedTemplate}
        fetchTemplateMeta={fetchTemplateMeta}
        uploadHeaderImage={uploadHeaderImage}
        sendMessageMutation={sendMessageMutation}
        user={user}
        toast={toast}
      />
    </div>
  );
}
