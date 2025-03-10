import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertScraperConfigSchema } from "@shared/schema";
import type { ScraperConfig } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { toast } = useToast();
  const [isScraperConfigOpen, setIsScraperConfigOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [testUrl, setTestUrl] = useState("");

  const { data: scraperConfig, isLoading: isLoadingConfig } = useQuery<ScraperConfig>({
    queryKey: ["/api/scraper-configs/current"],
  });

  // Scraper configuration form
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

  // Mutations
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
        description: "Configuration saved successfully",
      });
      setIsScraperConfigOpen(false);
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

  if (isLoadingConfig) {
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
          {!scraperConfig ? (
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
                      onClick={() => setIsScraperConfigOpen(true)}
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
    </div>
  );
}