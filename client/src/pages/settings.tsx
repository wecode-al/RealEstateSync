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
  const [testUrl, setTestUrl] = useState("");
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isFbPageDialogOpen, setIsFbPageDialogOpen] = useState(false);
  const [newFbPage, setNewFbPage] = useState({ name: "", pageId: "", accessToken: "" });

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
      },
      fieldMapping: {}
    }
  });

  // Initialize settings for WordPress site and Facebook
  useEffect(() => {
    const initialSettings: SiteSettings = {
      "WordPress Site": {
        enabled: false,
        additionalConfig: {
          username: '',
          password: '',
          apiUrl: ''
        }
      },
      "Facebook": {
        enabled: false,
        additionalConfig: {
          pages: JSON.stringify([])
        }
      }
    };
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
      const updatedSettings = { ...settings };

      // Handle WordPress settings
      if (currentSettings["WordPress Site"]) {
        const wpConfig = currentSettings["WordPress Site"] as SiteConfig;
        updatedSettings["WordPress Site"] = {
          ...wpConfig,
          additionalConfig: {
            username: wpConfig.additionalConfig?.username || import.meta.env.VITE_WORDPRESS_USERNAME || '',
            password: wpConfig.additionalConfig?.password || import.meta.env.VITE_WORDPRESS_APP_PASSWORD || '',
            apiUrl: wpConfig.additionalConfig?.apiUrl || import.meta.env.VITE_WORDPRESS_API_URL || ''
          }
        };
      }

      // Handle Facebook settings
      if (currentSettings["Facebook"]) {
        updatedSettings["Facebook"] = currentSettings["Facebook"];
      }

      setSettings(updatedSettings);
    }
  }, [currentSettings]);

  // Effect to update form when editing configuration
  useEffect(() => {
    if (scraperConfig && isScraperConfigOpen) {
      scraperForm.reset({
        name: scraperConfig.name,
        baseUrl: scraperConfig.baseUrl,
        selectors: scraperConfig.selectors,
        fieldMapping: scraperConfig.fieldMapping
      });
    }
  }, [scraperConfig, isScraperConfigOpen]);

  // Mutations
  const scraperConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Submitting scraper config:', data);
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
      // Make sure to invalidate both queries
      queryClient.invalidateQueries({ queryKey: ["/api/scraper-configs/current"] });
    },
    onError: (error) => {
      console.error('Scraper config mutation error:', error);
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
      setIsTestDialogOpen(false);
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

  // Function to add a new Facebook page
  const handleAddFacebookPage = () => {
    if (!newFbPage.name || !newFbPage.pageId || !newFbPage.accessToken) {
      toast({
        title: "Error",
        description: "Please fill in all Facebook page fields",
        variant: "destructive"
      });
      return;
    }

    const currentPages = settings.Facebook?.additionalConfig?.pages 
      ? JSON.parse(settings.Facebook.additionalConfig.pages) 
      : [];

    const updatedPages = [...currentPages, newFbPage];

    setSettings(prev => ({
      ...prev,
      "Facebook": {
        ...prev["Facebook"],
        additionalConfig: {
          ...prev["Facebook"]?.additionalConfig,
          pages: JSON.stringify(updatedPages)
        }
      }
    }));

    setNewFbPage({ name: "", pageId: "", accessToken: "" });
    setIsFbPageDialogOpen(false);

    toast({
      title: "Success",
      description: `Facebook page "${newFbPage.name}" added. Don't forget to save your settings.`,
    });
  };

  // Function to remove a Facebook page
  const handleRemoveFacebookPage = (index: number) => {
    const currentPages = settings.Facebook?.additionalConfig?.pages 
      ? JSON.parse(settings.Facebook.additionalConfig.pages) 
      : [];

    const updatedPages = currentPages.filter((_: any, i: number) => i !== index);

    setSettings(prev => ({
      ...prev,
      "Facebook": {
        ...prev["Facebook"],
        additionalConfig: {
          ...prev["Facebook"]?.additionalConfig,
          pages: JSON.stringify(updatedPages)
        }
      }
    }));

    toast({
      title: "Info",
      description: "Facebook page removed. Don't forget to save your settings.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const areWordPressFieldsFilled = (config: SiteConfig) => {
    return config.additionalConfig?.username &&
           config.additionalConfig?.password &&
           config.additionalConfig?.apiUrl;
  };

  const getFacebookPages = () => {
    if (!settings.Facebook?.additionalConfig?.pages) return [];
    try {
      return JSON.parse(settings.Facebook.additionalConfig.pages);
    } catch (e) {
      console.error("Error parsing Facebook pages:", e);
      return [];
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Settings</h1>
      </div>

      {/* Scraper Configurations Section */}
      <Card className="mb-8 border-none shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">Website Configuration</CardTitle>
            <Dialog open={isScraperConfigOpen} onOpenChange={setIsScraperConfigOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (scraperConfig) {
                      scraperForm.reset({
                        name: scraperConfig.name,
                        baseUrl: scraperConfig.baseUrl,
                        selectors: scraperConfig.selectors,
                        fieldMapping: scraperConfig.fieldMapping
                      });
                    }
                    setIsScraperConfigOpen(true);
                  }}
                >
                  {scraperConfig ? 'Edit' : <><Plus className="h-4 w-4 mr-2" />Add</>} Configuration
                </Button>
              </DialogTrigger>
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
              <CardContent className="p-6">
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
                        setIsScraperConfigOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
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
                  <AlertCircle className="h-5 w-5 text-red-500" title={settings["WordPress Site"].lastTestResult.message} />
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

      {/* Facebook Integration */}
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Facebook Integration</h2>
      <Card className="border-none shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 mb-8">
        <CardHeader className="border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Facebook</span>
              {settings["Facebook"]?.lastTestResult && (
                settings["Facebook"].lastTestResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" title={settings["Facebook"].lastTestResult.message} />
                )
              )}
            </div>
            <Switch
              checked={settings["Facebook"]?.enabled ?? false}
              onCheckedChange={(checked) => {
                setSettings(prev => ({
                  ...prev,
                  "Facebook": { 
                    ...prev["Facebook"], 
                    enabled: checked,
                    additionalConfig: {
                      ...prev["Facebook"]?.additionalConfig || {},
                      pages: prev["Facebook"]?.additionalConfig?.pages || JSON.stringify([])
                    }
                  }
                }));
              }}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid w-full items-center gap-4">
              <div className="flex justify-between items-center">
                <Label>Facebook Pages</Label>
                <Dialog open={isFbPageDialogOpen} onOpenChange={setIsFbPageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={!settings["Facebook"]?.enabled}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Page
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Facebook Page</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="fb-page-name">Page Name</Label>
                        <Input 
                          id="fb-page-name"
                          value={newFbPage.name}
                          onChange={(e) => setNewFbPage({...newFbPage, name: e.target.value})}
                          placeholder="My Business Page"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fb-page-id">Page ID</Label>
                        <Input 
                          id="fb-page-id"
                          value={newFbPage.pageId}
                          onChange={(e) => setNewFbPage({...newFbPage, pageId: e.target.value})}
                          placeholder="123456789012345"
                        />
                        <p className="text-xs text-muted-foreground">
                          You can find your Page ID in the About section of your Facebook page
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fb-access-token">Page Access Token</Label>
                        <Input 
                          id="fb-access-token"
                          value={newFbPage.accessToken}
                          onChange={(e) => setNewFbPage({...newFbPage, accessToken: e.target.value})}
                          placeholder="EAABl..."
                          type="password"
                        />
                        <p className="text-xs text-muted-foreground">
                          Generate an access token in Facebook Developer Portal with permissions to manage your pages
                        </p>
                      </div>
                      <div className="flex justify-end gap-4 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setIsFbPageDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddFacebookPage}
                        >
                          Add Page
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* List of Facebook Pages */}
              {getFacebookPages().length === 0 && settings["Facebook"]?.enabled && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No Facebook pages added yet. Click "Add Page" to add your first page.
                </div>
              )}

              {getFacebookPages().length > 0 && (
                <div className="space-y-3 mt-4">
                  {getFacebookPages().map((page: any, index: number) => (
                    <Card key={index} className="p-4 border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{page.name}</h4>
                          <p className="text-xs text-muted-foreground">ID: {page.pageId}</p>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleRemoveFacebookPage(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {settings["Facebook"]?.enabled && getFacebookPages().length === 0 && (
                <p className="text-sm text-amber-500">
                  You need to add at least one Facebook page to use Facebook publishing
                </p>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => testMutation.mutate("Facebook")}
                disabled={
                  !settings["Facebook"]?.enabled ||
                  testMutation.isPending ||
                  getFacebookPages().length === 0
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

      <div className="flex justify-end mt-6">
        <Button
          onClick={() => updateMutation.mutate(settings)}
          disabled={updateMutation.isPending}
          className="bg-primary hover:bg-primary/90"
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