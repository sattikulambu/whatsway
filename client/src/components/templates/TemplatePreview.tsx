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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Smartphone, 
  Type, 
  Image, 
  Video, 
  CheckCircle, 
  Clock, 
  XCircle,
  X,
  Copy,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import type { Template } from "@shared/schema";

interface TemplatePreviewProps {
  template: Template;
  onClose: () => void;
}

// WhatsApp text formatting function
function formatWhatsAppText(text: string): React.ReactNode {
  if (!text) return null;
  
  // Regular expressions for WhatsApp formatting
  const patterns = [
    { regex: /\*([^*]+)\*/g, replacement: '<strong>$1</strong>' }, // Bold
    { regex: /_([^_]+)_/g, replacement: '<em>$1</em>' }, // Italic
    { regex: /~([^~]+)~/g, replacement: '<del>$1</del>' }, // Strikethrough
    { regex: /```([^`]+)```/g, replacement: '<code>$1</code>' }, // Monospace
  ];
  
  let formattedText = text;
  patterns.forEach(({ regex, replacement }) => {
    formattedText = formattedText.replace(regex, replacement);
  });
  
  return <span dangerouslySetInnerHTML={{ __html: formattedText }} />;
}

export function TemplatePreview({ template, onClose }: TemplatePreviewProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "PENDING":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "REJECTED":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getMediaTypeIcon = () => {
    const mediaComponent = template.components?.find(c => c.type === "HEADER" && c.format !== "TEXT");
    
    if (!mediaComponent) return null;

    switch (mediaComponent.format) {
      case "IMAGE":
        return <Image className="w-4 h-4" />;
      case "VIDEO":
        return <Video className="w-4 h-4" />;
      case "DOCUMENT":
        return <FileText className="w-4 h-4" />;
      default:
        return <Type className="w-4 h-4" />;
    }
  };

  const getButtonComponent = () => {
    return template.components?.find(c => c.type === "BUTTONS");
  };

  const getHeaderComponent = () => {
    return template.components?.find(c => c.type === "HEADER");
  };

  const getBodyComponent = () => {
    return template.components?.find(c => c.type === "BODY");
  };

  const getFooterComponent = () => {
    return template.components?.find(c => c.type === "FOOTER");
  };

  const headerComponent = getHeaderComponent();
  const bodyComponent = getBodyComponent();
  const footerComponent = getFooterComponent();
  const buttonComponent = getButtonComponent();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Template Preview</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Template Details */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{template.name}</h2>
              <div className="flex items-center gap-2">
                {getStatusIcon(template.status)}
                <Badge variant={template.status === "APPROVED" ? "default" : "secondary"}>
                  {template.status}
                </Badge>
              </div>
            </div>

            {/* Rejection Reason */}
            {template.status === "REJECTED" && template.rejectionReason && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  <strong>Rejection Reason:</strong> {template.rejectionReason}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Category:</span>
                <span className="ml-2 font-medium">{template.category}</span>
              </div>
              <div>
                <span className="text-gray-500">Language:</span>
                <span className="ml-2 font-medium">{template.language || "en_US"}</span>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2 font-medium">
                  {format(new Date(template.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              {template.lastUsed && (
                <div>
                  <span className="text-gray-500">Last Used:</span>
                  <span className="ml-2 font-medium">
                    {format(new Date(template.lastUsed), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Preview */}
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5" />
              <span className="font-medium">WhatsApp Preview</span>
              {getMediaTypeIcon()}
            </div>

            <div className="bg-white rounded-lg shadow-sm max-w-sm mx-auto">
              {/* Header Media */}
              {headerComponent && headerComponent.format !== "TEXT" && (
                <div className="bg-gray-200 h-48 rounded-t-lg flex items-center justify-center">
                  {headerComponent.format === "IMAGE" && <Image className="w-16 h-16 text-gray-400" />}
                  {headerComponent.format === "VIDEO" && <Video className="w-16 h-16 text-gray-400" />}
                  {headerComponent.format === "DOCUMENT" && <FileText className="w-16 h-16 text-gray-400" />}
                </div>
              )}

              <div className="p-4 space-y-2">
                {/* Header Text */}
                {headerComponent && headerComponent.format === "TEXT" && (
                  <h3 className="font-semibold text-base">
                    {formatWhatsAppText(headerComponent.text || template.header || "")}
                  </h3>
                )}

                {/* Body */}
                <div className="text-sm whitespace-pre-wrap">
                  {formatWhatsAppText(bodyComponent?.text || template.body)}
                </div>

                {/* Footer */}
                {(footerComponent?.text || template.footer) && (
                  <div className="text-xs text-gray-500 pt-2">
                    {formatWhatsAppText(footerComponent?.text || template.footer || "")}
                  </div>
                )}

                {/* Buttons */}
                {buttonComponent && buttonComponent.buttons && (
                  <div className="pt-3 space-y-2">
                    {buttonComponent.buttons.map((button, idx) => (
                      <button
                        key={idx}
                        className="w-full py-2 px-4 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
                      >
                        {button.text}
                        {button.type === "URL" && " →"}
                        {button.type === "PHONE_NUMBER" && " 📞"}
                        {(button.type === "COPY_CODE" || button.type === "OTP") && " 📋"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Template Content for Copying */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Template Content</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(template.body)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Body
              </Button>
            </div>

            <div className="space-y-3">
              {(headerComponent?.text || template.header) && (
                <div>
                  <Label className="text-sm text-gray-500">Header</Label>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {headerComponent?.text || template.header}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm text-gray-500">Body</Label>
                <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                  {bodyComponent?.text || template.body}
                </div>
              </div>

              {(footerComponent?.text || template.footer) && (
                <div>
                  <Label className="text-sm text-gray-500">Footer</Label>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {footerComponent?.text || template.footer}
                  </div>
                </div>
              )}

              {buttonComponent && buttonComponent.buttons && (
                <div>
                  <Label className="text-sm text-gray-500">Buttons</Label>
                  <div className="bg-gray-50 p-3 rounded space-y-2">
                    {buttonComponent.buttons.map((button, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{button.type}:</span> {button.text}
                        {button.url && <span className="text-gray-500 ml-2">({button.url})</span>}
                        {button.phone_number && <span className="text-gray-500 ml-2">({button.phone_number})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`font-medium mb-1 ${className || ""}`}>{children}</div>;
}