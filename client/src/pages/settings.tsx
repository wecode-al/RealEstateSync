import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertScraperConfigSchema } from "@shared/schema";
import type { ScraperConfig } from "@shared/schema";

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
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<SiteSettings>({});
  const [isScraperConfigOpen, setIsScraperConfigOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testUrl, setTestUrl] = useState("");

  // Get scraper configurations
  const { data: scraperConfig, isLoading: isLoadingConfig } = useQuery<ScraperConfig>({
    queryKey: ["/api/scraper-configs/current"],
  });

  // Update the scraper configuration form
  const scraperForm = useForm({
    resolver: zodResolver(insertScraperConfigSchema),
    defaultValues: {
      name: "",
      baseUrl: "",
      selectors: {
        title: "",
        description: "",
        price: "",
        bedrooms: "",
        bathrooms: "",
        squareMeters: "",
        address: "",
        images: "",
        features: ""
      }
    }
  });

  // Effect to update form when editing configuration
  useEffect(() => {
    if (scraperConfig && isScraperConfigOpen) {
      scraperForm.reset({
        name: scraperConfig.name,
        baseUrl: scraperConfig.baseUrl,
        selectors: scraperConfig.selectors
      });
    }
  }, [scraperConfig, isScraperConfigOpen]);

  // Scraper configuration mutation
  const scraperConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/scraper-configs", {
        ...data,
        fieldMapping: {
          title: "title",
          description: "description",
          price: "price",
          bedrooms: "bedrooms",
          bathrooms: "bathrooms",
          squareMeters: "squareMeters",
          address: "address",
          images: "images",
          features: "features"
        }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save configuration");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Scraper configuration saved successfully",
      });
      setIsScraperConfigOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/scraper-configs/current"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Test configuration mutation
  const testScraperMutation = useMutation({
    mutationFn: async ({ configId, url }: { configId: number; url: string }) => {
      const res = await apiRequest("POST", `/api/scraper-configs/${configId}/test`, { url });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to test configuration");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Test successful! Found property: ${data.data.title}`,
      });
      setIsTestDialogOpen(false);
      setTestUrl("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: SiteSettings) => {
      const res = await apiRequest("POST", "/api/settings", newSettings);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save settings");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Settings have been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const testMutation = useMutation({
    mutationFn: async (site: string) => {
      const res = await apiRequest("POST", `/api/settings/test/${site}`, settings[site]);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Connection test failed");
      }
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Settings</h1>
      </div>

      {/* Website Configuration Section */}
      <Card className="mb-8 border-none shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">Website Configuration</CardTitle>
            {!scraperConfig && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsScraperConfigOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Configuration
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoadingConfig ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : !scraperConfig ? (
            <div className="text-center py-8 text-muted-foreground">
              No website configuration added yet
            </div>
          ) : (
            <Card className="border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{scraperConfig.name}</h3>
                    <p className="text-sm text-muted-foreground">{scraperConfig.baseUrl}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        scraperForm.reset({
                          name: scraperConfig.name,
                          baseUrl: scraperConfig.baseUrl,
                          selectors: scraperConfig.selectors
                        });
                        setIsScraperConfigOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsTestDialogOpen(true)}
                    >
                      Test
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Selectors</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(scraperConfig.selectors).map(([field, selector]) => (
                      <div key={field} className="p-3 bg-muted/30 rounded-md">
                        <span className="text-sm font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <p className="text-sm font-mono text-muted-foreground break-all">{selector || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={isScraperConfigOpen} onOpenChange={setIsScraperConfigOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{scraperConfig ? 'Edit' : 'Add'} Website Configuration</DialogTitle>
          </DialogHeader>
          <Form {...scraperForm}>
            <form onSubmit={scraperForm.handleSubmit(data => scraperConfigMutation.mutate(data))} className="space-y-4">
              <FormField
                control={scraperForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Real Estate Website" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={scraperForm.control}
                name="baseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Selectors Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Enter CSS selectors to match property information on your website. Use multiple selectors separated by commas.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(scraperForm.getValues().selectors).map(([field]) => (
                    <FormField
                      key={field}
                      control={scraperForm.control}
                      name={`selectors.${field}`}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</FormLabel>
                          <FormControl>
                            <Input placeholder={`Enter CSS selector for ${field}`} {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsScraperConfigOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={scraperConfigMutation.isPending}
                >
                  {scraperConfigMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Test URL</Label>
              <Input
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="Enter a property URL to test"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Enter a property page URL from {scraperConfig?.baseUrl} to test if the selectors can extract the property details correctly.
              </p>
            </div>
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsTestDialogOpen(false);
                  setTestUrl("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (scraperConfig) {
                    testScraperMutation.mutate({
                      configId: scraperConfig.id,
                      url: testUrl
                    });
                  }
                }}
                disabled={testScraperMutation.isPending || !testUrl}
              >
                {testScraperMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Configuration'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* WordPress Settings */}
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">WordPress Integration</h2>
      <Card className="border-none shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 mb-8">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>WordPress Site</span>
              {settings["WordPress Site"]?.lastTestResult && (
                settings["WordPress Site"].lastTestResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )
              )}
            </div>
            <Switch
              checked={settings["WordPress Site"]?.enabled ?? false}
              onCheckedChange={(checked) => {
                setSettings(prev => ({
                  ...prev,
                  "WordPress Site": { ...prev["WordPress Site"], enabled: checked }
                }));
              }}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid w-full items-center gap-4">
              <Label htmlFor="wordpress-username">Username</Label>
              <Input
                id="wordpress-username"
                value={settings["WordPress Site"]?.additionalConfig?.username ?? ""}
                className={settings["WordPress Site"]?.enabled && !settings["WordPress Site"]?.additionalConfig?.username ? "border-red-500" : ""}
                onChange={(e) => {
                  setSettings(prev => ({
                    ...prev,
                    "WordPress Site": {
                      ...prev["WordPress Site"],
                      additionalConfig: {
                        ...prev["WordPress Site"]?.additionalConfig,
                        username: e.target.value
                      }
                    }
                  }));
                }}
              />
            </div>

            <div className="grid w-full items-center gap-4">
              <Label htmlFor="wordpress-password">Application Password</Label>
              <Input
                id="wordpress-password"
                type="password"
                value={settings["WordPress Site"]?.additionalConfig?.password ?? ""}
                className={settings["WordPress Site"]?.enabled && !settings["WordPress Site"]?.additionalConfig?.password ? "border-red-500" : ""}
                onChange={(e) => {
                  setSettings(prev => ({
                    ...prev,
                    "WordPress Site": {
                      ...prev["WordPress Site"],
                      additionalConfig: {
                        ...prev["WordPress Site"]?.additionalConfig,
                        password: e.target.value
                      }
                    }
                  }));
                }}
              />
            </div>

            <div className="grid w-full items-center gap-4">
              <Label htmlFor="wordpress-url">API URL</Label>
              <Input
                id="wordpress-url"
                placeholder="https://your-wordpress-site.com"
                value={settings["WordPress Site"]?.additionalConfig?.apiUrl ?? ""}
                className={settings["WordPress Site"]?.enabled && !settings["WordPress Site"]?.additionalConfig?.apiUrl ? "border-red-500" : ""}
                onChange={(e) => {
                  setSettings(prev => ({
                    ...prev,
                    "WordPress Site": {
                      ...prev["WordPress Site"],
                      additionalConfig: {
                        ...prev["WordPress Site"]?.additionalConfig,
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

            {settings["WordPress Site"]?.enabled && !areWordPressFieldsFilled(settings["WordPress Site"]) && (
              <p className="text-sm text-red-500">
                Please fill in all required fields to enable WordPress integration
              </p>
            )}

            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => testMutation.mutate("WordPress Site")}
                disabled={
                  !settings["WordPress Site"]?.enabled ||
                  testMutation.isPending ||
                  !areWordPressFieldsFilled(settings["WordPress Site"])
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

      {/* Save Settings Button */}
      <div className="flex justify-end pt-8">
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
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  );
}