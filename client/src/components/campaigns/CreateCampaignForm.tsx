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

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { AlertTriangle, Info, FileText, Settings, Clock, Eye } from "lucide-react";

interface CreateCampaignFormProps {
  onSubmit: (formData: any) => void;
  templates: any[];
  selectedTemplate: any;
  setSelectedTemplate: (template: any) => void;
  variableMapping: Record<string, string>;
  setVariableMapping: (mapping: Record<string, string>) => void;
  extractTemplateVariables: (template: any) => string[];
  scheduledTime: string;
  setScheduledTime: (time: string) => void;
  autoRetry: boolean;
  setAutoRetry: (retry: boolean) => void;
  isCreating: boolean;
  onCancel?: () => void;
  children: ReactNode;
  requiresHeaderImage: boolean;
  setRequiresHeaderImage: (v: boolean) => void;
  uploadedMediaId: string | null;
  setUploadedMediaId: (id: string | null) => void;
  channelId?: string;
  messagingLimit?: number | null;
  messagingTier?: string;
}

export function CreateCampaignForm({
  onSubmit,
  templates,
  selectedTemplate,
  setSelectedTemplate,
  variableMapping,
  setVariableMapping,
  extractTemplateVariables,
  scheduledTime,
  setScheduledTime,
  autoRetry,
  setAutoRetry,
  isCreating,
  onCancel,
  children,
  requiresHeaderImage,
  setRequiresHeaderImage,
  uploadedMediaId,
  setUploadedMediaId,
  channelId,
  messagingLimit,
  messagingTier,
}: CreateCampaignFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const campaignData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      variableMapping: variableMapping,
    };
    onSubmit(campaignData);
  };

  const activeTemplates = Array.isArray(templates)
    ? templates.filter((t: any) => t.status?.toLowerCase() === "approved")
    : [];

  const fetchTemplateMeta = async (templateWhatsappId: string) => {
    const res = await fetch(
      `/api/whatsapp/templates/${templateWhatsappId}/meta?channelId=${channelId}`,
    );
    return res.json();
  };

  const templateSampleMap: Record<string, string> = {};
  if (Array.isArray(selectedTemplate?.variables)) {
    selectedTemplate.variables.forEach((sample: string, index: number) => {
      templateSampleMap[String(index + 1)] = sample;
    });
  }

  const bodyVariables = extractTemplateVariables(selectedTemplate);
  const headerText = selectedTemplate?.header || "";
  const headerVarMatches = headerText.match(/\{\{\d+\}\}/g) || [];
  const hasHeaderVars = headerVarMatches.length > 0 && !selectedTemplate?.mediaUrl;
  const hasButtons = selectedTemplate?.buttons?.some(
    (b: any) => b.type === "COPY_CODE" || (b.type === "URL" && b.url?.includes("{{"))
  );
  const hasVariableConfig = bodyVariables.length > 0 || hasHeaderVars || requiresHeaderImage || hasButtons;

  const { user } = useAuth();

  return (
    <form onSubmit={handleSubmit} className="space-y-5 mt-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Campaign Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="name">Campaign Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Summer Sale Announcement" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Campaign objectives and notes..." rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Select Template</Label>
            <Select
              value={selectedTemplate?.id ?? ""}
              onValueChange={async (value) => {
                const template = templates.find(t => t.id === value);
                setSelectedTemplate(template);
                setVariableMapping({});
                setUploadedMediaId(null);
                setRequiresHeaderImage(false);

                if (template?.whatsappTemplateId) {
                  const meta = await fetchTemplateMeta(template.whatsappTemplateId);
                  setRequiresHeaderImage(meta.headerType === "IMAGE");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an approved template" />
              </SelectTrigger>
              <SelectContent>
                {activeTemplates.map((template: any) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.language})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
              {selectedTemplate.headerType === "text" && selectedTemplate.headerText && (
                <div className="font-semibold text-sm">{selectedTemplate.headerText}</div>
              )}
              <div className="whitespace-pre-wrap text-sm">{selectedTemplate.body}</div>
              {selectedTemplate.footerText && (
                <div className="text-xs text-muted-foreground">{selectedTemplate.footerText}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {hasVariableConfig && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Variable Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {requiresHeaderImage && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-red-600">
                  Header Image (Required)
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !channelId) return;
                    const formData = new FormData();
                    formData.append("mediaFile", file);
                    formData.append("templateId", selectedTemplate?.id);
                    const res = await fetch(
                      `/api/whatsapp/channels/${channelId}/upload-image`,
                      { method: "POST", body: formData }
                    );
                    const data = await res.json();
                    setUploadedMediaId(data.mediaId);
                  }}
                />
                {uploadedMediaId && (
                  <p className="text-xs text-green-600">Image uploaded successfully</p>
                )}
              </div>
            )}

            {bodyVariables.length > 0 && (
              <div className="space-y-3">
                {bodyVariables.length > 1 && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Body Variables</p>
                )}
                {bodyVariables.map((variable: string) => {
                  const sampleValue = templateSampleMap[variable];
                  return (
                    <div key={variable} className="space-y-1.5">
                      <Label className="text-sm font-normal">
                        Value for <strong>{"{{" + variable + "}}"}</strong>
                      </Label>
                      <Select
                        value={variableMapping[variable]?.type || ""}
                        onValueChange={(type) => {
                          setVariableMapping({
                            ...variableMapping,
                            [variable]: { type, value: "" },
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fullName">Full Name</SelectItem>
                          <SelectItem value="phone">Phone Number</SelectItem>
                          <SelectItem value="custom">Custom Value</SelectItem>
                        </SelectContent>
                      </Select>
                      {variableMapping[variable]?.type === "custom" && (
                        <Input
                          placeholder="Type custom value"
                          value={variableMapping[variable]?.value || ""}
                          onChange={(e) =>
                            setVariableMapping({
                              ...variableMapping,
                              [variable]: { ...variableMapping[variable], value: e.target.value },
                            })
                          }
                        />
                      )}
                      {sampleValue && (
                        <p className="text-xs text-muted-foreground">
                          Sample: <span className="font-medium">{sampleValue}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {hasHeaderVars && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Header Variables</p>
                {headerVarMatches.map((varText: string) => {
                  const idx = varText.replace(/\D/g, "");
                  return (
                    <div key={`header-${idx}`} className="space-y-1.5">
                      <Label className="text-sm font-normal">
                        Header variable <strong>{varText}</strong>
                      </Label>
                      <Select
                        value={(variableMapping as any)?.headerVars?.[idx]?.type || ""}
                        onValueChange={(type) =>
                          setVariableMapping({
                            ...variableMapping,
                            headerVars: {
                              ...(variableMapping as any)?.headerVars,
                              [idx]: { type, value: "" },
                            },
                          } as any)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fullName">Full Name</SelectItem>
                          <SelectItem value="phone">Phone Number</SelectItem>
                          <SelectItem value="custom">Custom Value</SelectItem>
                        </SelectContent>
                      </Select>
                      {(variableMapping as any)?.headerVars?.[idx]?.type === "custom" && (
                        <Input
                          placeholder="Type custom value"
                          value={(variableMapping as any)?.headerVars?.[idx]?.value || ""}
                          onChange={(e) =>
                            setVariableMapping({
                              ...variableMapping,
                              headerVars: {
                                ...(variableMapping as any)?.headerVars,
                                [idx]: { ...(variableMapping as any)?.headerVars?.[idx], value: e.target.value },
                              },
                            } as any)
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedTemplate?.buttons?.map((button: any, i: number) => {
              if (button.type === "COPY_CODE") {
                return (
                  <div key={`btn-${i}`} className="space-y-1.5">
                    <Label className="text-sm font-normal">
                      Coupon Code for <strong>{button.text || "Copy Code"}</strong>
                    </Label>
                    <Input
                      placeholder={button.example?.[0] || "e.g. SAVE20"}
                      value={(variableMapping as any)?.buttons?.[i]?.value || ""}
                      onChange={(e) =>
                        setVariableMapping({
                          ...variableMapping,
                          buttons: {
                            ...(variableMapping as any)?.buttons,
                            [i]: { type: "custom", value: e.target.value },
                          },
                        } as any)
                      }
                    />
                    {button.example?.[0] && (
                      <p className="text-xs text-muted-foreground">
                        Example: <span className="font-medium">{button.example[0]}</span>
                      </p>
                    )}
                  </div>
                );
              }
              if (button.type === "URL" && button.url?.includes("{{")) {
                return (
                  <div key={`btn-${i}`} className="space-y-1.5">
                    <Label className="text-sm font-normal">
                      URL parameter for <strong>{button.text}</strong>
                    </Label>
                    <Input
                      placeholder={button.example?.[0] || "e.g. tracking-id"}
                      value={(variableMapping as any)?.buttons?.[i]?.value || ""}
                      onChange={(e) =>
                        setVariableMapping({
                          ...variableMapping,
                          buttons: {
                            ...(variableMapping as any)?.buttons,
                            [i]: { type: "custom", value: e.target.value },
                          },
                        } as any)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      URL: <span className="font-medium">{button.url}</span>
                    </p>
                    {button.example?.[0] && (
                      <p className="text-xs text-muted-foreground">
                        Example: <span className="font-medium">{button.example[0]}</span>
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </CardContent>
        </Card>
      )}

      {messagingLimit != null && (
        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Your channel's WhatsApp messaging limit is{" "}
            <strong>
              {messagingLimit === Infinity
                ? "Unlimited"
                : messagingLimit.toLocaleString()}
            </strong>
            {messagingLimit !== Infinity ? " messages per 24 hours" : ""}
            {messagingTier ? ` (${messagingTier})` : ""}.
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scheduling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="scheduledTime">Schedule Campaign (Optional)</Label>
            <Input
              id="scheduledTime"
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoRetry"
              checked={autoRetry}
              onCheckedChange={(checked) => setAutoRetry(!!checked)}
            />
            <Label htmlFor="autoRetry" className="font-normal">
              Enable auto-retry for failed messages
            </Label>
          </div>
        </CardContent>
      </Card>

      {children}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={user?.username === 'demouser' ? true : isCreating}>
          {scheduledTime ? "Schedule Campaign" : "Start Campaign"}
        </Button>
      </div>
    </form>
  );
}