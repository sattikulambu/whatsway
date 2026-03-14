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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    id: string;
    conversationId: string;
    contactId: string;
  }) => void;
  automationId: string;
}

export function TestAutomationModal({
  open,
  onClose,
  onSubmit,
  automationId,
}: Props) {
  // console.log("Modal rendered: open =", open, "id =", automationId); // Debug log cf31b81c-f8a2-4770-a4d4-9f8f2fbece0c
  const [conversationId, setConversationId] = useState("");
  const [contactId, setContactId] = useState("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Automation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Conversation ID"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
          />
          <Input
            placeholder="Contact ID"
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          />
          <Button
            onClick={() => {
              onSubmit({ id: automationId, conversationId, contactId });
              onClose();
            }}
          >
            Test Automation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
