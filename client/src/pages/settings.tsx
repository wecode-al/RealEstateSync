import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { distributionSites } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface SiteConfig {
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  additionalConfig?: Record<string, string>;
  lastTestResult?: {
    success: boolean;
    message?: string;
  };
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
          username: import.meta.env.VITE_WORDPRESS_USERNAME || '',
          password: import.meta.env.VITE_WORDPRESS_APP_PASSWORD || '',
          apiUrl: import.meta.env.VITE_WORDPRESS_API_URL || ''
        } : undefined
      };
    });
    setSettings(initialSettings);
  }, []);

  const { data: currentSettings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/settings"],
    onSuccess: (data) => {
      if (data) {
        const mergedSettings = { ...settings };
        Object.entries(data).forEach(([site, config]) => {
          if (site === "WordPress Site") {
            // Keep the environment variable values if no saved values exist
            mergedSettings[site] = {
              ...config,
              additionalConfig: {
                username: config.additionalConfig?.username || import.meta.env.VITE_WORDPRESS_USERNAME || '',
                password: config.additionalConfig?.password || import.meta.env.VITE_WORDPRESS_APP_PASSWORD || '',
                apiUrl: config.additionalConfig?.apiUrl || import.meta.env.VITE_WORDPRESS_API_URL || ''
              }
            };
          } else {
            mergedSettings[site] = config;
          }
        });
        setSettings(mergedSettings);
      }
    }
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (newSettings: SiteSettings) => {
      const res = await apiRequest("POST", "/api/settings", newSettings);
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
      const res = await apiRequest("POST", `/api/settings/test/${site}`, settings[site]);
      return res.json();
    },
    onSuccess: (_, site) => {
      toast({
        title: "Success",
        description: "Connection test successful",
      });
      setSettings(prev => ({
        ...prev,
        [site]: {
          ...prev[site],
          lastTestResult: { success: true }
        }
      }));
    },
    onError: (error, site) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setSettings(prev => ({
        ...prev,
        [site]: {
          ...prev[site],
          lastTestResult: { success: false, message: error.message }
        }
      }));
    }
  });

  // Helper to check if WordPress fields are filled
  const areWordPressFieldsFilled = (config: SiteConfig) => {
    return config.additionalConfig?.username &&
           config.additionalConfig?.password &&
           config.additionalConfig?.apiUrl;
  };

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
          <Card key={site} className={settings[site]?.enabled ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{site}</span>
                  {settings[site]?.lastTestResult && (
                    settings[site].lastTestResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )
                  )}
                </div>
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
                        className={settings[site]?.enabled && !settings[site]?.additionalConfig?.username ? "border-red-500" : ""}
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
                        className={settings[site]?.enabled && !settings[site]?.additionalConfig?.password ? "border-red-500" : ""}
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
                        className={settings[site]?.enabled && !settings[site]?.additionalConfig?.apiUrl ? "border-red-500" : ""}
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

                {settings[site]?.enabled && site === "WordPress Site" && !areWordPressFieldsFilled(settings[site]) && (
                  <p className="text-sm text-red-500">
                    Please fill in all required fields to enable WordPress integration
                  </p>
                )}

                <div className="flex justify-end gap-4">
                  <Button
                    variant="outline"
                    onClick={() => testMutation.mutate(site)}
                    disabled={
                      !settings[site]?.enabled ||
                      testMutation.isPending ||
                      (site === "WordPress Site" && !areWordPressFieldsFilled(settings[site]))
                    }
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