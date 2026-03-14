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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone } from "lucide-react";
import { type Contact, type TemplateVariables } from "./types";
import { getAcceptByHeaderType } from "./utils";

interface TemplateMessageDialogProps {
  showMessageDialog: boolean;
  setShowMessageDialog: (show: boolean) => void;
  selectedContact: Contact | null;
  activeChannel: any;
  messageType: string;
  setMessageType: (type: string) => void;
  messageText: string;
  setMessageText: (text: string) => void;
  selectedTemplateName: string;
  setSelectedTemplateName: (name: string) => void;
  templateVariables: TemplateVariables;
  setTemplateVariables: React.Dispatch<React.SetStateAction<TemplateVariables>>;
  templateMetaVars: string[];
  templateSampleValues: Record<string, string>;
  availableTemplates: any[];
  requiresHeaderImage: boolean;
  setRequiresHeaderImage: (requires: boolean) => void;
  headerType: string | null;
  setHeaderType: (type: string | null) => void;
  uploadedMediaId: string | null;
  setUploadedMediaId: (id: string | null) => void;
  headerImageFile: File | null;
  setHeaderImageFile: (file: File | null) => void;
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  setSelectedTemplate: (template: any) => void;
  fetchTemplateMeta: (templateWhatsappId: string) => Promise<any>;
  uploadHeaderImage: (file: File) => Promise<string | undefined>;
  sendMessageMutation: any;
  user: any;
  toast: any;
}

export function TemplateMessageDialog({
  showMessageDialog,
  setShowMessageDialog,
  selectedContact,
  activeChannel,
  messageType,
  setMessageType,
  messageText,
  setMessageText,
  selectedTemplateName,
  setSelectedTemplateName,
  templateVariables,
  setTemplateVariables,
  templateMetaVars,
  templateSampleValues,
  availableTemplates,
  requiresHeaderImage,
  setRequiresHeaderImage,
  headerType,
  setHeaderType,
  uploadedMediaId,
  setUploadedMediaId,
  headerImageFile,
  setHeaderImageFile,
  selectedTemplateId,
  setSelectedTemplateId,
  setSelectedTemplate,
  fetchTemplateMeta,
  uploadHeaderImage,
  sendMessageMutation,
  user,
  toast,
}: TemplateMessageDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("contacts.sendMessage.title")}</DialogTitle>
          <DialogDescription>
            {t("contacts.sendMessage.description")} {selectedContact?.name} (
            {selectedContact?.phone})
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
          {activeChannel && (
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-600" />
                <div className="text-sm">
                  <span className="font-medium">
                    {t("contacts.sendMessage.activeChannel")}
                  </span>{" "}
                  <span className="text-gray-700">{activeChannel.name}</span>
                </div>
              </div>
            </div>
          )}

          {!activeChannel && (
            <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
              <p className="text-sm text-yellow-800">
                {t("contacts.sendMessage.noChannel")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("contacts.sendMessage.messageType")}
            </label>
            <select
              className="w-full p-2 border rounded-md"
              value={messageType}
              onChange={(e) => {
                setMessageType(e.target.value);
                setSelectedTemplateName("");
                setTemplateVariables({});
                setUploadedMediaId(null);
                setHeaderImageFile(null);
                setRequiresHeaderImage(false);
              }}
            >
              <option value="template">
                {t("contacts.sendMessage.templateMessage")}
              </option>
            </select>
          </div>

          {messageType === "template" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Template</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedTemplateName}
                  onChange={async (e) => {
                    const templateName = e.target.value;
                    setSelectedTemplateName(templateName);

                    const tpl = availableTemplates.find(
                      (t: any) => t.name === templateName
                    );

                    if (!tpl) {
                      console.error("❌ Template not found in DB", templateName);
                      return;
                    }

                    const meta = await fetchTemplateMeta(tpl.whatsappTemplateId);
                    setSelectedTemplateId(tpl?.id);
                    setSelectedTemplate(tpl);
                    setHeaderType(meta.headerType?.toLowerCase() ?? null);

                    setRequiresHeaderImage(
                      meta.headerType === "IMAGE" ||
                      meta.headerType === "DOCUMENT" ||
                      meta.headerType === "VIDEO"
                    );

                    const vars: TemplateVariables = {};

                    for (let i = 1; i <= meta.bodyVariables; i++) {
                      vars[String(i)] = {
                        type: undefined,
                        value: "",
                      };
                    }

                    setTemplateVariables(vars);
                  }}
                >
                  <option value="">Select template</option>
                  {availableTemplates.map((t: any) => (
                    <option key={t.whatsappTemplateId} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {requiresHeaderImage && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-red-600">
                    Header {headerType} (Required) *
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
                        title: `Uploading ${headerType?.toLowerCase()}...`,
                        description: "Please wait while we upload your file.",
                      });

                      await uploadHeaderImage(file);

                      toast({
                        title: "Upload successful",
                        description: `Header ${headerType?.toLowerCase()} uploaded successfully.`,
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

              {templateMetaVars.map((key) => {
                const current = templateVariables[key];
                const sampleValue = templateSampleValues[key];

                return (
                  <div key={key} className="space-y-1">
                    <label className="text-sm font-medium">
                      Value for {"{{" + key + "}}"}
                    </label>

                    <Select
                      value={current?.type ?? ""}
                      onValueChange={(type) =>
                        setTemplateVariables((prev) => ({
                          ...prev,
                          [key]: {
                            type: type as "fullName" | "phone" | "custom",
                            value: "",
                          },
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select value type" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="fullName">Full Name</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>

                    {current?.type === "custom" && (
                      <Input
                        placeholder="Enter value"
                        value={current.value || ""}
                        onChange={(e) =>
                          setTemplateVariables((prev) => ({
                            ...prev,
                            [key]: {
                              ...prev[key],
                              value: e.target.value,
                            },
                          }))
                        }
                      />
                    )}

                    {sampleValue && (
                      <p className="text-xs text-gray-500 mt-1">
                        Sample value: <span className="font-medium">{sampleValue}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowMessageDialog(false);
                setMessageText("");
                setMessageType("text");
                setSelectedTemplateName("");
                setTemplateVariables({});
                setUploadedMediaId(null);
                setHeaderImageFile(null);
                setRequiresHeaderImage(false);
              }}
            >
              {t("contacts.addContact.cancel")}
            </Button>

            <Button
              disabled={
                user?.username === "demouser"
                  ? true
                  : !activeChannel ||
                    sendMessageMutation.isPending ||
                    (messageType === "text" && !messageText.trim()) ||
                    (messageType === "text" && !messageText.trim()) ||
                    (messageType === "template" && !selectedTemplateName) ||
                    (messageType === "template" &&
                      requiresHeaderImage &&
                      !uploadedMediaId) ||
                    (messageType === "template" &&
                      Object.values(templateVariables).some(
                        (v) =>
                          !v.type || (v.type === "custom" && !v.value?.trim())
                      ))
              }
              onClick={() => {
                console.log("🚀 SEND CLICKED");

                if (!selectedContact || !activeChannel) {
                  console.error("❌ Missing contact or channel");
                  return;
                }

                if (messageType === "template") {
                  console.log("📝 Template Name:", selectedTemplateName);
                  console.log("🖼️ Header Media ID:", uploadedMediaId);
                  console.log("📋 Vars:", templateVariables);

                  if (!selectedTemplateName) {
                    toast({
                      title: "Error",
                      description: "Please select a template",
                      variant: "destructive",
                    });
                    return;
                  }

                  if (requiresHeaderImage && !uploadedMediaId) {
                    toast({
                      title: "Image Required",
                      description: "This template requires a header image. Please upload one.",
                      variant: "destructive",
                    });
                    return;
                  }

                  sendMessageMutation.mutate({
                    phone: selectedContact.phone,
                    type: "template",
                    templateName: selectedTemplateName,
                    templateLanguage: "en_US",
                    templateVariables: Object.values(templateVariables),
                    headerMediaId: uploadedMediaId || undefined,
                  });
                } else {
                  console.log("📝 Text Message:", messageText);

                  sendMessageMutation.mutate({
                    phone: selectedContact.phone,
                    type: "text",
                    message: messageText,
                  });
                }
              }}
            >
              {sendMessageMutation.isPending
                ? `${t("contacts.sendMessage.sending")}`
                : `${t("contacts.sendMessage.send")}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
