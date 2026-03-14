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
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loading } from "@/components/ui/loading";
import {
  Search,
  Send,
  Paperclip,
  FileText,
  AlertCircle,
  Phone,
  Video,
  Reply,
  ExternalLink,
  Clipboard,
  FileDown,
  MousePointerClick,
  Megaphone,
  Wrench,
  ShieldCheck,
  Globe,
  Image,
} from "lucide-react";
import { api } from "@/lib/api";
import { WHATSAPP_LANGUAGES } from "@/lib/template-constants";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Conversation } from "@shared/schema";

const templateCategoryConfig: Record<string, { label: string; className: string; icon: any }> = {
  MARKETING: {
    label: "Marketing",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Megaphone,
  },
  UTILITY: {
    label: "Utility",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Wrench,
  },
  AUTHENTICATION: {
    label: "Authentication",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: ShieldCheck,
  },
};

const templateButtonTypeIcons: Record<string, any> = {
  PHONE_NUMBER: Phone,
  URL: ExternalLink,
  QUICK_REPLY: Reply,
  COPY_CODE: Clipboard,
};

const templateLanguageMap = Object.fromEntries(
  WHATSAPP_LANGUAGES.map((l) => [l.code, l.label])
);

function getTemplateLanguageLabel(code: string): string {
  return templateLanguageMap[code] || templateLanguageMap[code?.replace("-", "_")] || code || "English";
}

function getTemplateMediaIcon(mediaType: string | null | undefined) {
  switch (mediaType?.toLowerCase()) {
    case "image": return Image;
    case "video": return Video;
    case "document": return FileDown;
    default: return null;
  }
}

function getTemplateButtons(template: any) {
  const buttons: Array<{ type: string; text: string }> = [];
  if (template.buttons && Array.isArray(template.buttons)) {
    for (const btn of template.buttons) {
      buttons.push({ type: btn.type || "QUICK_REPLY", text: btn.text || "" });
    }
  }
  if (buttons.length === 0 && template.components && Array.isArray(template.components)) {
    for (const comp of template.components) {
      if (comp.type === "BUTTONS" && Array.isArray(comp.buttons)) {
        for (const btn of comp.buttons) {
          buttons.push({ type: btn.type || "QUICK_REPLY", text: btn.text || "" });
        }
      }
    }
  }
  return buttons;
}

const TemplateDialog = ({
  channelId,
  onSelectTemplate,
}: {
  channelId?: string;
  onSelectTemplate: (template: any, variables: { type?: string; value?: string }[], mediaId?: string, headerType?: string | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [variables, setVariables] = useState<
  { type?: "fullName" | "phone" | "custom"; value?: string }[]
>([]);

  const [mediaId, setMediaId] = useState("");
  const {toast} = useToast();
  const [requiresHeaderImage, setRequiresHeaderImage] = useState(false);
  const [headerType, setHeaderType] = useState<string | null>(null);
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
  const [uploadedMediaId, setUploadedMediaId] = useState<string | null>(null);
  const [templateSampleValues, setTemplateSampleValues] = useState<Record<string, string>>({});
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>("ALL");
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/templates", channelId],
    queryFn: async () => {
      const response = await api.getTemplates(channelId);
      const data = await response.json();
      return Array.isArray(data.data) ? data.data : [];
    },
    enabled: !!channelId && open
  });


  const approvedTemplates = Array.isArray(templates)
  ? templates.filter((t: any) =>
      t?.status?.toLowerCase().includes("approve")
    )
  : [];


  const getVariableCount = (body: string) => {
    const matches = body.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  };

  const handleTemplateSelect = async(template: any) => {
    const varCount = getVariableCount(template.body);
    setSelectedTemplate(template);
    setVariables(
  Array.from({ length: varCount }, () => ({
    type: undefined,
    value: "",
  }))
);

    const meta = await fetchTemplateMeta(template.whatsappTemplateId);

    
    const header = meta.headerType?.toLowerCase() ?? null;

setHeaderType(header);
setRequiresHeaderImage(
  ["image", "video", "document"].includes(header)
);

const MEDIA_HEADERS = ["IMAGE", "VIDEO", "DOCUMENT"];

    
    const hasMediaHeader = template.components?.some(
  (c: any) =>
    c.type === "HEADER" &&
    MEDIA_HEADERS.includes(c.format)
);

if (!hasMediaHeader) {
  setMediaId("");
  setUploadedMediaId(null);
}

  };


  useEffect(() => {
    if (!selectedTemplate?.variables) return;
  
    const samples: Record<string, string> = {};
    selectedTemplate.variables.forEach((val: string, index: number) => {
      samples[String(index + 1)] = val;
    });
  
    setTemplateSampleValues(samples);
  }, [selectedTemplate]);

  const handleSend = () => {
  if (!selectedTemplate) return;

  onSelectTemplate(
    selectedTemplate,
    variables,
    uploadedMediaId || undefined,
    headerType,
  );

  setOpen(false);
  setSelectedTemplate(null);
  setVariables([]);
  setUploadedMediaId(null);
  setRequiresHeaderImage(false);
};

  const fetchTemplateMeta = async (templateWhatsappId: string) => {
  const res = await fetch(
    `/api/whatsapp/templates/${templateWhatsappId}/meta?channelId=${channelId}`
  );

  const data = await res.json();
  console.log("✅ TEMPLATE META:", data);
  return data;
};


const uploadHeaderImage = async (file: File) => {
  if (!channelId) {
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
    formData.append("templateId", selectedTemplate?.id);

    const res = await fetch(
      `/api/whatsapp/channels/${channelId}/upload-image`,
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


const getAcceptByHeaderType = (type: string | null) => {
  switch (type) {
    case "image":
      return "image/*";
    case "video":
      return "video/*";
    case "document":
      return ".pdf,.doc,.docx";
    default:
      return "";
  }
};

const getUploadLabel = (type: string | null) => {
  switch (type) {
    case "image":
      return "Header Image (Required) *";
    case "video":
      return "Header Video (Required) *";
    case "document":
      return "Header Document (Required) *";
    default:
      return "Header File (Required) *";
  }
};

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) {
        setTemplateSearchQuery("");
        setTemplateCategoryFilter("ALL");
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {selectedTemplate ? "Configure Template" : "Select Template"}
          </DialogTitle>
          {!selectedTemplate && (
            <DialogDescription>
              Choose an approved template to send
            </DialogDescription>
          )}
        </DialogHeader>

        {!selectedTemplate && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={templateSearchQuery}
                onChange={(e) => setTemplateSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: "ALL", label: "All" },
                { key: "MARKETING", label: "Marketing", icon: Megaphone },
                { key: "UTILITY", label: "Utility", icon: Wrench },
                { key: "AUTHENTICATION", label: "Auth", icon: ShieldCheck },
              ].map((cat) => (
                <Button
                  key={cat.key}
                  variant={templateCategoryFilter === cat.key ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs px-2.5",
                    templateCategoryFilter === cat.key && "bg-green-600 hover:bg-green-700 text-white"
                  )}
                  onClick={() => setTemplateCategoryFilter(cat.key)}
                >
                  {cat.icon && <cat.icon className="w-3 h-3 mr-1" />}
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <ScrollArea className="h-[400px] pr-4">
          {!selectedTemplate ? (
            (() => {
              const filtered = approvedTemplates.filter((t: any) => {
                const matchesSearch =
                  !templateSearchQuery ||
                  t.name?.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
                  t.body?.toLowerCase().includes(templateSearchQuery.toLowerCase());
                const matchesCategory =
                  templateCategoryFilter === "ALL" ||
                  t.category?.toUpperCase() === templateCategoryFilter;
                return matchesSearch && matchesCategory;
              });

              return isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loading />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                  <p className="font-medium">No templates found</p>
                  <p className="text-sm mt-1">
                    {templateSearchQuery || templateCategoryFilter !== "ALL"
                      ? "Try adjusting your search or filter"
                      : "No approved templates available"}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filtered.map((template: any) => {
                    const cat = templateCategoryConfig[template.category?.toUpperCase()] || templateCategoryConfig.MARKETING;
                    const CatIcon = cat.icon;
                    const MediaIcon = getTemplateMediaIcon(template.mediaType);
                    const buttons = getTemplateButtons(template);
                    const langLabel = getTemplateLanguageLabel(template.language);

                    return (
                      <div
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className="border rounded-lg p-3.5 cursor-pointer hover:shadow-md hover:border-green-300 transition-all bg-white group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm text-gray-900 truncate flex-1 mr-2">
                            {template.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${cat.className}`}>
                            <CatIcon className="w-3 h-3 mr-1" />
                            {cat.label}
                          </Badge>
                          <span className="inline-flex items-center text-[11px] text-gray-500">
                            <Globe className="w-3 h-3 mr-0.5" />
                            {langLabel}
                          </span>
                          {MediaIcon && (
                            <span className="inline-flex items-center text-[11px] text-gray-500">
                              <MediaIcon className="w-3 h-3 mr-0.5" />
                              {template.mediaType}
                            </span>
                          )}
                        </div>
                        {template.header && (
                          <p className="text-sm font-medium text-gray-800 truncate mb-0.5">
                            {template.header}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {template.body}
                        </p>
                        {template.footer && (
                          <p className="text-xs text-gray-400 italic mt-1">{template.footer}</p>
                        )}
                        {buttons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {buttons.map((button, idx) => {
                              const BtnIcon = templateButtonTypeIcons[button.type] || MousePointerClick;
                              return (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-600 border-gray-200"
                                >
                                  <BtnIcon className="w-2.5 h-2.5 mr-0.5" />
                                  {button.text || button.type}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">{selectedTemplate.name}</h4>
                <p className="text-sm text-gray-600">{selectedTemplate.body}</p>
              </div>

              {requiresHeaderImage && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-red-600">
                Header {headerType}  (Required) *
              </label>
              <input
                type="file"
                accept={getAcceptByHeaderType(headerType)}
                required
                className="w-full p-2 border rounded-md"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  toast({
      title: `Uploading ${headerType}...`,
      description: "Please wait while we upload your file.",
    });

                  await uploadHeaderImage(file);

                  toast({
      title: "Upload successful",
      description: `Header ${headerType} uploaded successfully.`,
    });
                }}
              />
              {uploadedMediaId && (
                <p className="text-xs text-green-600">
                  ✓ {headerType} uploaded successfully (ID: {uploadedMediaId})
                </p>
              )}
            </div>
          )}

             {variables.map((v, index) => {
  const sampleValue = selectedTemplate?.variables?.[index];

  return (
    <div key={index} className="space-y-2">
      <label className="text-sm font-medium block">
        Value for {"{{" + (index + 1) + "}}"}
      </label>

      <select
        className="w-full border rounded-md px-3 py-2 text-sm"
        value={v.type ?? ""}
        onChange={(e) => {
          const updated = [...variables];
          updated[index] = {
            type: e.target.value as "fullName" | "phone" | "custom",
            value: "",
          };
          setVariables(updated);
        }}
      >
        <option value="" disabled>
          Select value type
        </option>
        <option value="fullName">Full Name</option>
        <option value="phone">Phone</option>
        <option value="custom">Custom</option>
      </select>

      {v.type === "custom" && (
        <Input
          placeholder={`Enter value for {{${index + 1}}}`}
          value={v.value || ""}
          onChange={(e) => {
            const updated = [...variables];
            updated[index] = { ...updated[index], value: e.target.value };
            setVariables(updated);
          }}
        />
      )}

      {sampleValue && (
        <p className="text-xs text-gray-500">
          Sample: <span className="font-medium">{sampleValue}</span>
        </p>
      )}
    </div>
  );
})}



              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setVariables([]);
                    setMediaId("");
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={variables.some(
  (v) => !v.type || (v.type === "custom" && !v.value?.trim())
)}

                >
                  Send Template
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

interface MessageComposerProps {
  selectedConversation: Conversation;
  messageText: string;
  onTyping: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  onFileAttachment: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectTemplate: (template: any, variables: { type?: string; value?: string }[], mediaId?: string, headerType?: string | null) => void;
  is24HourWindowExpired: boolean;
  activeChannelId?: string;
  sendMessagePending: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const MessageComposer = ({
  selectedConversation,
  messageText,
  onTyping,
  onSendMessage,
  onFileAttachment,
  onFileChange,
  onSelectTemplate,
  is24HourWindowExpired,
  activeChannelId,
  sendMessagePending,
  fileInputRef,
}: MessageComposerProps) => {
  return (
    <div className="bg-white border-t border-gray-200 p-3 md:p-4">
      {is24HourWindowExpired &&
        selectedConversation.type === "whatsapp" && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">
                  24-hour window expired
                </p>
                <p className="text-yellow-700">
                  You can only send template messages now
                </p>
              </div>
            </div>
          </div>
        )}

      <div className="flex items-end gap-1 md:gap-2">
        <div className="flex gap-1">
          {selectedConversation.type === "whatsapp" && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 md:h-9 md:w-9"
                      onClick={onFileAttachment}
                      disabled={false}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach File</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={onFileChange}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              />

                <TemplateDialog
                  channelId={activeChannelId}
                  onSelectTemplate={onSelectTemplate}
                />
            </>
          )}


          
        </div>

        

        <textarea
          placeholder={
            is24HourWindowExpired &&
            selectedConversation.type === "whatsapp"
              ? "Templates only"
              : "Type a message..."
          }
          value={messageText}
          onChange={onTyping}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 120) + "px";
          }}
          disabled={
            is24HourWindowExpired &&
            selectedConversation.type === "whatsapp"
          }
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: "36px", maxHeight: "120px" }}
        />

        <Button
          onClick={onSendMessage}
          disabled={
            !messageText.trim() ||
                (is24HourWindowExpired &&
                  selectedConversation.type === "whatsapp") ||
                sendMessagePending
          }
          size="icon"
          className="h-8 w-8 md:h-9 md:w-9 bg-emerald-500 hover:bg-emerald-600"
          data-testid="button-send-message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MessageComposer;
