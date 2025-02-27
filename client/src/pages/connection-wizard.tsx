import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  Lock, 
  Globe, 
  Key 
} from "lucide-react";
import { Stepper, Step } from "@/components/wizard/stepper";
import { distributionSites } from "@shared/schema";

export default function ConnectionWizard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Current step in the wizard
  const [currentStep, setCurrentStep] = useState(0);
  // Selected site to configure
  const [selectedSite, setSelectedSite] = useState<string>("");
  // Connection configuration
  const [config, setConfig] = useState<{
    enabled: boolean;
    apiKey?: string;
    apiSecret?: string;
    additionalConfig?: Record<string, string>;
  }>({
    enabled: true,
    additionalConfig: {}
  });
  // Test results
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/settings");
      if (!res.ok) {
        throw new Error("Failed to fetch settings");
      }
      return res.json();
    }
  });
  
  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/settings/test/${selectedSite}`, config);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Connection test failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setTestResult({
        success: true,
        message: "Connection test successful"
      });
    },
    onError: (error) => {
      setTestResult({
        success: false,
        message: error.message
      });
    }
  });
  
  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updatedSettings = {
        ...settings,
        [selectedSite]: config
      };
      
      const res = await apiRequest("POST", "/api/settings", updatedSettings);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save settings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Success",
        description: `${selectedSite} connection has been saved successfully`
      });
      navigate("/settings");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Define wizard steps
  const steps = [
    {
      title: "Select Website",
      description: "Choose which website you want to connect to"
    },
    {
      title: "Configure Connection",
      description: "Enter the necessary credentials for the connection"
    },
    {
      title: "Test Connection",
      description: "Test your connection settings"
    },
    {
      title: "Finish",
      description: "Save your connection settings"
    }
  ];
  
  // Pre-fill configuration when a site is selected
  const selectSite = (site: string) => {
    setSelectedSite(site);
    
    // If existing settings for this site, pre-fill form
    if (settings && settings[site]) {
      setConfig(settings[site]);
    } else {
      // Initialize default config for this site
      setConfig({
        enabled: true,
        additionalConfig: {}
      });
    }
    
    // Reset test results
    setTestResult(null);
    
    // Move to next step
    setCurrentStep(1);
  };
  
  // Update configuration field
  const updateConfig = (field: string, value: string) => {
    if (field.startsWith("additionalConfig.")) {
      const configKey = field.replace("additionalConfig.", "");
      setConfig({
        ...config,
        additionalConfig: {
          ...config.additionalConfig,
          [configKey]: value
        }
      });
    } else {
      setConfig({
        ...config,
        [field]: value
      });
    }
  };
  
  // Handle next step
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Handle test connection
  const handleTestConnection = () => {
    testMutation.mutate();
  };
  
  // Handle save settings
  const handleSaveSettings = () => {
    saveMutation.mutate();
  };
  
  // Get site-specific configuration fields
  const getSiteConfigFields = () => {
    switch (selectedSite) {
      case "WordPress Site":
        return (
          <>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={config.additionalConfig?.username || ""}
                    onChange={(e) => updateConfig("additionalConfig.username", e.target.value)}
                    className="pl-10"
                  />
                  <div className="absolute left-3 top-2.5 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                </div>
              </div>
              
              <div className="grid w-full items-center gap-2">
                <Label htmlFor="password">Application Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    value={config.additionalConfig?.password || ""}
                    onChange={(e) => updateConfig("additionalConfig.password", e.target.value)}
                    className="pl-10"
                  />
                  <div className="absolute left-3 top-2.5 text-muted-foreground">
                    <Key className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate an application password from your WordPress dashboard
                </p>
              </div>
              
              <div className="grid w-full items-center gap-2">
                <Label htmlFor="apiUrl">WordPress URL</Label>
                <div className="relative">
                  <Input
                    id="apiUrl"
                    value={config.additionalConfig?.apiUrl || ""}
                    onChange={(e) => updateConfig("additionalConfig.apiUrl", e.target.value)}
                    placeholder="https://your-wordpress-site.com"
                    className="pl-10"
                  />
                  <div className="absolute left-3 top-2.5 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case "njoftime.com":
      case "njoftime.al":
      case "merrjep.al":
      case "indomio.al":
      case "okazion.al":
        return (
          <>
            <div className="space-y-4">
              <div className="grid w-full items-center gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    value={config.apiKey || ""}
                    onChange={(e) => updateConfig("apiKey", e.target.value)}
                    className="pl-10"
                  />
                  <div className="absolute left-3 top-2.5 text-muted-foreground">
                    <Key className="h-4 w-4" />
                  </div>
                </div>
              </div>
              
              <div className="grid w-full items-center gap-2">
                <Label htmlFor="apiSecret">API Secret</Label>
                <div className="relative">
                  <Input
                    id="apiSecret"
                    type="password"
                    value={config.apiSecret || ""}
                    onChange={(e) => updateConfig("apiSecret", e.target.value)}
                    className="pl-10"
                  />
                  <div className="absolute left-3 top-2.5 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                </div>
              </div>
              
              <div className="grid w-full items-center gap-2">
                <Label htmlFor="accountEmail">Account Email</Label>
                <div className="relative">
                  <Input
                    id="accountEmail"
                    value={config.additionalConfig?.accountEmail || ""}
                    onChange={(e) => updateConfig("additionalConfig.accountEmail", e.target.value)}
                    className="pl-10"
                  />
                  <div className="absolute left-3 top-2.5 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      default:
        return (
          <div className="text-center py-6 text-muted-foreground">
            Please select a site first
          </div>
        );
    }
  };
  
  // Check if the current step is valid
  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return !!selectedSite;
      case 1:
        if (selectedSite === "WordPress Site") {
          return !!(
            config.additionalConfig?.username &&
            config.additionalConfig?.password &&
            config.additionalConfig?.apiUrl
          );
        } else {
          return !!(config.apiKey && config.apiSecret);
        }
      case 2:
        return testResult?.success === true;
      default:
        return true;
    }
  };
  
  // Render wizard step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {distributionSites.map((site) => (
              <Card 
                key={site} 
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  selectedSite === site ? 'border-primary' : ''
                }`}
                onClick={() => selectSite(site)}
              >
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">{site}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground">
                    Connect to {site} to list your properties directly on their platform.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Configure {selectedSite}</CardTitle>
              <CardDescription>
                Enter your API credentials to connect to {selectedSite}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getSiteConfigFields()}
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Test Connection</CardTitle>
              <CardDescription>
                Test your connection to {selectedSite}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button
                  onClick={handleTestConnection}
                  disabled={testMutation.isPending}
                  className="w-full"
                >
                  {testMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                
                {testResult && (
                  <div className={`p-4 rounded-md ${
                    testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    <div className="flex items-center">
                      {testResult.success ? (
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 mr-2" />
                      )}
                      <p>{testResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Complete Setup</CardTitle>
              <CardDescription>
                Your connection to {selectedSite} is ready to be saved
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-md text-green-800">
                  <div className="flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    <p>Connection configuration verified successfully</p>
                  </div>
                </div>
                
                <Button
                  onClick={handleSaveSettings}
                  disabled={saveMutation.isPending}
                  className="w-full"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Connection'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };
  
  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Site Connection Wizard
        </h1>
        <Button variant="ghost" onClick={() => navigate("/settings")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Button>
      </div>
      
      <div className="mb-8">
        <Stepper currentStep={currentStep} steps={steps} />
      </div>
      
      <div className="mb-8">
        {renderStepContent()}
      </div>
      
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        
        {currentStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!isStepValid()}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
