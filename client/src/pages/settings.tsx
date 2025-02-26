import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { distributionSites } from "@shared/schema";
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
  const [selectedConfig, setSelectedConfig] = useState<ScraperConfig | null>(null);
  const [testUrl, setTestUrl] = useState("");
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);

  // Get scraper configurations
  const { data: scraperConfigs, isLoading: isLoadingConfigs } = useQuery<ScraperConfig[]>({
    queryKey: ["/api/scraper-configs"],
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
      },
      fieldMapping: {}
    }
  });

  // Mutation for creating/updating scraper config
  const scraperConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const formattedData = {
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
      };

      const res = await apiRequest("POST", "/api/scraper-configs", formattedData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save scraper configuration");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Scraper configuration saved successfully",
      });
      setIsScraperConfigOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/scraper-configs"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

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
        description: "Configuration test successful. Found property: " + data.data.title,
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

  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings");
      if (!res.ok) {
        throw new Error("Failed to fetch settings");
      }
      return res.json();
    }
  });

  // Update local settings when server data is fetched
  useEffect(() => {
    if (currentSettings) {
      const mergedSettings = { ...settings };
      Object.entries(currentSettings).forEach(([site, config]) => {
        if (site === "WordPress Site") {
          const storedConfig = config as SiteConfig;
          mergedSettings[site] = {
            ...storedConfig,
            additionalConfig: {
              username: storedConfig.additionalConfig?.username || import.meta.env.VITE_WORDPRESS_USERNAME || '',
              password: storedConfig.additionalConfig?.password || import.meta.env.VITE_WORDPRESS_APP_PASSWORD || '',
              apiUrl: storedConfig.additionalConfig?.apiUrl || import.meta.env.VITE_WORDPRESS_API_URL || ''
            }
          };
        } else {
          mergedSettings[site] = config as SiteConfig;
        }
      });
      setSettings(mergedSettings);
    }
  }, [currentSettings]);

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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Settings</h1>
      </div>

      {/* Scraper Configurations Section */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Website Scraper Configurations</CardTitle>
            <Dialog open={isScraperConfigOpen} onOpenChange={setIsScraperConfigOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Website Configuration</DialogTitle>
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
                        Enter CSS selectors to match property information on your website. You can use multiple selectors separated by commas.
                        Examples: ".price", "#property-title", "[data-price]"
                      </p>

                      {Object.entries(scraperForm.getValues().selectors).map(([field]) => (
                        <FormField
                          key={field}
                          control={scraperForm.control}
                          name={`selectors.${field}`}
                          render={({ field: formField }) => (
                            <FormItem>
                              <FormLabel className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={`Enter CSS selector for ${field}`}
                                  {...formField}
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                Example: {
                                  field === 'price' ? '.price, .property-price, [data-price]' :
                                    field === 'images' ? '.property-gallery img, .carousel img' :
                                      field === 'features' ? '.features li, .amenities li' :
                                        `.${field}, .property-${field}, [data-${field}]`
                                }
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingConfigs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : scraperConfigs?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No website configurations added yet
            </div>
          ) : (
            <div className="grid gap-4">
              {scraperConfigs?.map((config) => (
                <Card key={config.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{config.name}</h3>
                        <p className="text-sm text-muted-foreground">{config.baseUrl}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedConfig(config);
                            scraperForm.reset(config);
                            setIsScraperConfigOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedConfig(config);
                            setTestUrl("");
                            setIsTestDialogOpen(true);
                          }}
                        >
                          Test
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
            </div>
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setIsTestDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedConfig) {
                    testScraperMutation.mutate({
                      configId: selectedConfig.id,
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

      <h2 className="text-2xl font-bold mb-6">Distribution Settings</h2>
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
                      <AlertCircle className="h-5 w-5 text-red-500" title={settings[site].lastTestResult.message} />
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
                        className={settings[site]?.enabled && !settings[site]?.additionalConfig?.username ? "border-red-500" : ""}
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
                        className={settings[site]?.enabled && !settings[site]?.additionalConfig?.password ? "border-red-500" : ""}
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
                        className={settings[site]?.enabled && !settings[site]?.additionalConfig?.apiUrl ? "border-red-500" : ""}
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
      </div>

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
  );
}