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

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Pencil,
  Smartphone,
  FileText,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  FlaskConical,
} from "lucide-react";
import {
  apiRequest,
  queryClient,
} from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function EmbeddedSignupSettings() {
  const { toast } = useToast();

  const [form, setForm] = useState({
    appId: "",
    appSecret: "",
    configId: "",
  });

  const [showSecret, setShowSecret] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [testResults, setTestResults] = useState<{
    appCredentials: { valid: boolean; error?: string; appName?: string };
    configId: { valid: boolean; error?: string };
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const { data } = useQuery({
    queryKey: ["/api/embedded/config"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/embedded/config");
      return res.json();
    },
  });

  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform-settings"],
    queryFn: async () => {
      const res = await fetch("/api/platform-settings", { credentials: "include" });
      if (!res.ok) return { embeddedSignupEnabled: true };
      return res.json();
    },
  });

  const isCreated = !!data;

  useEffect(() => {
    if (data) {
      setForm({
        appId: data.appId || "",
        appSecret: data.appSecret || "",
        configId: data.configId || "",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/embedded/config", form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/embedded/config"] });
      setIsEditing(false);
      toast({
        title: isCreated ? "Updated" : "Created",
        description: "Configuration saved successfully",
      });
    },
  });

  const toggleEmbeddedSignup = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiRequest("PUT", "/api/platform-settings", {
        embeddedSignupEnabled: enabled,
      });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings"] });
      toast({
        title: enabled ? "Embedded Signup Enabled" : "Embedded Signup Disabled",
        description: enabled
          ? "Clients will use Meta Embedded Signup to add channels."
          : "Clients will manually enter WABA credentials to add channels.",
      });
    },
  });

  const runTestCredentials = async () => {
    setIsTesting(true);
    setTestResults(null);
    try {
      const res = await apiRequest("GET", "/api/whatsapp/test-credentials");
      const data = await res.json();
      setTestResults({
        appCredentials: data.appCredentials,
        configId: data.configId,
      });
    } catch (e: any) {
      toast({
        title: "Test failed",
        description: e.message || "Could not reach the test endpoint",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const embeddedEnabled = platformSettings?.embeddedSignupEnabled ?? true;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Smartphone className="w-5 h-5" />
            Channel Onboarding Mode
          </CardTitle>
          <CardDescription>
            Choose how your clients add WhatsApp channels. When Embedded Signup is enabled,
            clients connect through Meta's guided flow. When disabled, they enter credentials manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm">
                  {embeddedEnabled ? "Embedded Signup" : "Manual Setup"}
                </p>
                <Badge variant={embeddedEnabled ? "default" : "secondary"} className="text-xs">
                  {embeddedEnabled ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {embeddedEnabled
                  ? "Clients will connect via Meta's Embedded Signup flow. Manual channel adding is hidden."
                  : "Clients will manually enter WABA ID, Phone Number ID, and Access Token. Embedded Signup is hidden."}
              </p>
            </div>
            <Switch
              checked={embeddedEnabled}
              onCheckedChange={(checked) => toggleEmbeddedSignup.mutate(checked)}
              disabled={toggleEmbeddedSignup.isPending}
            />
          </div>

          {!embeddedEnabled && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md flex gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                With manual mode, clients need to provide their WABA ID, Phone Number ID, and a permanent Access Token.
                You don't need to configure Meta App credentials below when using manual mode.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {embeddedEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Meta App Credentials
                <Badge variant={isCreated ? "default" : "secondary"}>
                  {isCreated ? "Configured" : "Not Configured"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {isCreated && !isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={runTestCredentials}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <FlaskConical className="w-4 h-4 mr-1" />
                    )}
                    Test
                  </Button>
                )}
                {isCreated && !isEditing && (
                  <Button size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {testResults && (
              <div className="p-3 border rounded-lg space-y-2 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Credential Test Results</p>
                <div className="flex items-center gap-2">
                  {testResults.appCredentials.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className="text-sm">
                    {testResults.appCredentials.valid
                      ? `App credentials valid${testResults.appCredentials.appName ? ` — ${testResults.appCredentials.appName}` : ""}`
                      : `App credentials invalid — ${testResults.appCredentials.error}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {testResults.configId.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className="text-sm">
                    {testResults.configId.valid
                      ? "Config ID valid"
                      : `Config ID invalid — ${testResults.configId.error}`}
                  </span>
                </div>
              </div>
            )}

            {!isCreated && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                No configuration found. Please create credentials first.
              </div>
            )}

            <div className="space-y-2">
              <Label>Meta App ID</Label>
              <Input
                value={form.appId}
                disabled={isCreated && !isEditing}
                onChange={(e) => setForm({ ...form, appId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Meta App Secret</Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={form.appSecret}
                  disabled={isCreated && !isEditing}
                  onChange={(e) => setForm({ ...form, appSecret: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Embedded Signup Config ID</Label>
              <Input
                value={form.configId}
                disabled={isCreated && !isEditing}
                onChange={(e) => setForm({ ...form, configId: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              {(isEditing || !isCreated) && (
                <Button onClick={() => saveMutation.mutate()}>
                  {saveMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isCreated ? "Update" : "Create"}
                    </>
                  )}
                </Button>
              )}
              {isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
