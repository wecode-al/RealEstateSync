import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { distributionSites } from "@shared/schema";

interface SiteConfig {
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  additionalConfig?: Record<string, string>;
}

type SiteSettings = Record<string, SiteConfig>;

export default function Settings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SiteSettings>({});

  // Initialize settings for all sites
  useEffect(() => {
    const initialSettings: SiteSettings = {};
    distributionSites.forEach(site => {
      initialSettings[site] = {
        enabled: false,
        apiKey: '',
        apiSecret: '',
        additionalConfig: site === "WordPress Site" ? {
          username: '',
          password: '',
          apiUrl: ''
        } : undefined
      };
    });
    setSettings(initialSettings);
  }, []);

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/settings"],
    onSuccess: (data) => {
      if (data) {
        setSettings(prev => ({
          ...prev,
          ...data
        }));
      }
    }
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (newSettings: SiteSettings) => {
      console.log('Sending settings update:', {
        ...newSettings,
        "WordPress Site": newSettings["WordPress Site"] ? {
          ...newSettings["WordPress Site"],
          additionalConfig: {
            ...newSettings["WordPress Site"].additionalConfig,
            password: '[REDACTED]'
          }
        } : undefined
      });

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save settings");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings have been saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async (site: string) => {
      const siteSettings = settings[site];
      console.log(`Testing connection for ${site}:`, {
        enabled: siteSettings.enabled,
        hasApiKey: !!siteSettings.apiKey,
        hasApiSecret: !!siteSettings.apiSecret,
        hasAdditionalConfig: !!siteSettings.additionalConfig
      });

      const res = await fetch(`/api/settings/test/${site}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings[site])
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Connection test failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Connection test successful",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Distribution Settings</h1>

      <div className="grid gap-6">
        {distributionSites.map((site) => (
          <Card key={site}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{site}</span>
                <Switch
                  checked={settings[site]?.enabled ?? false}
                  onCheckedChange={(checked) => {
                    setSettings(prev => ({
                      ...prev,
                      [site]: { ...prev[site], enabled: checked }
                    }));
                  }}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {site === "WordPress Site" ? (
                  <>
                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor={`${site}-username`}>Username</Label>
                      <Input
                        id={`${site}-username`}
                        value={settings[site]?.additionalConfig?.username ?? ""}
                        onChange={(e) => {
                          setSettings(prev => ({
                            ...prev,
                            [site]: {
                              ...prev[site],
                              additionalConfig: {
                                ...prev[site]?.additionalConfig,
                                username: e.target.value
                              }
                            }
                          }));
                        }}
                      />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor={`${site}-password`}>Application Password</Label>
                      <Input
                        id={`${site}-password`}
                        type="password"
                        value={settings[site]?.additionalConfig?.password ?? ""}
                        onChange={(e) => {
                          setSettings(prev => ({
                            ...prev,
                            [site]: {
                              ...prev[site],
                              additionalConfig: {
                                ...prev[site]?.additionalConfig,
                                password: e.target.value
                              }
                            }
                          }));
                        }}
                      />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor={`${site}-url`}>API URL</Label>
                      <Input
                        id={`${site}-url`}
                        placeholder="https://your-wordpress-site.com"
                        value={settings[site]?.additionalConfig?.apiUrl ?? ""}
                        onChange={(e) => {
                          setSettings(prev => ({
                            ...prev,
                            [site]: {
                              ...prev[site],
                              additionalConfig: {
                                ...prev[site]?.additionalConfig,
                                apiUrl: e.target.value
                              }
                            }
                          }));
                        }}
                      />
                      <p className="text-sm text-muted-foreground">
                        Enter your WordPress site URL including http:// or https://
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor={`${site}-apiKey`}>API Key</Label>
                      <Input
                        id={`${site}-apiKey`}
                        type="password"
                        value={settings[site]?.apiKey ?? ""}
                        onChange={(e) => {
                          setSettings(prev => ({
                            ...prev,
                            [site]: { ...prev[site], apiKey: e.target.value }
                          }));
                        }}
                      />
                    </div>
                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor={`${site}-apiSecret`}>API Secret</Label>
                      <Input
                        id={`${site}-apiSecret`}
                        type="password"
                        value={settings[site]?.apiSecret ?? ""}
                        onChange={(e) => {
                          setSettings(prev => ({
                            ...prev,
                            [site]: { ...prev[site], apiSecret: e.target.value }
                          }));
                        }}
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-4">
                  <Button
                    variant="outline"
                    onClick={() => testMutation.mutate(site)}
                    disabled={!settings[site]?.enabled || testMutation.isPending}
                  >
                    {testMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test Connection"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-end mt-6">
          <Button
            onClick={() => updateMutation.mutate(settings)}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}