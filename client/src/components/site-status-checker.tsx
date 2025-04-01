import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Type for our site keys
type SiteKey = "njoftime.com" | "njoftime.al" | "merrjep.al" | "mirlir.com" | "indomio.al" | "okazion.al";

// Interface for site data
interface SiteInfo {
  key: SiteKey;
  name: string;
  baseUrl: string;
}

// Interface for site status response
interface SiteStatus {
  available: boolean;
  message: string;
}

// Site status record
type SiteStatusRecord = Record<SiteKey, SiteStatus | null>;

export function SiteStatusChecker() {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [siteStatus, setSiteStatus] = useState<SiteStatusRecord>({} as SiteStatusRecord);
  const [checkingSite, setCheckingSite] = useState<SiteKey | null>(null);
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load the sites
  const loadSites = async () => {
    try {
      const response = await apiRequest("GET", "/api/sites");
      if (!response.ok) {
        throw new Error("Failed to load sites");
      }
      const data = await response.json();
      setSites(data);
      setLoaded(true);
    } catch (error) {
      console.error("Error loading sites:", error);
      toast({
        title: "Error",
        description: "Failed to load sites. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Check the status of a specific site
  const checkSiteStatus = async (siteKey: SiteKey) => {
    setCheckingSite(siteKey);
    try {
      const response = await apiRequest("GET", `/api/sites/status/${siteKey}`);
      if (!response.ok) {
        throw new Error(`Failed to check status for ${siteKey}`);
      }
      const status = await response.json();
      setSiteStatus(prev => ({
        ...prev,
        [siteKey]: status
      }));
    } catch (error) {
      console.error(`Error checking ${siteKey} status:`, error);
      setSiteStatus(prev => ({
        ...prev,
        [siteKey]: {
          available: false,
          message: error instanceof Error ? error.message : `Failed to check ${siteKey} status`
        }
      }));
    } finally {
      setCheckingSite(null);
    }
  };

  // Check the status of all sites
  const checkAllSites = async () => {
    if (!sites || sites.length === 0) {
      await loadSites();
    }
    
    setIsChecking(true);
    
    // Reset all statuses to null
    const emptyStatus = sites.reduce((acc, site) => {
      acc[site.key] = null;
      return acc;
    }, {} as SiteStatusRecord);
    setSiteStatus(emptyStatus);

    // Check each site
    for (const site of sites) {
      await checkSiteStatus(site.key);
    }
    
    setIsChecking(false);
    
    toast({
      title: "Status Check Complete",
      description: "All site status checks have been completed.",
    });
  };

  // If sites haven't been loaded yet, load them
  if (!loaded && !isChecking) {
    loadSites();
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Site Status
            </CardTitle>
            <CardDescription className="mt-1.5">
              Check the status of all distribution sites
            </CardDescription>
          </div>
          <Button 
            onClick={checkAllSites}
            disabled={isChecking}
            className="px-4 py-2"
          >
            {isChecking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check All Sites
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sites.map((site) => {
            const status = siteStatus[site.key];
            const isChecking = checkingSite === site.key;

            return (
              <div 
                key={site.key}
                className={cn(
                  "flex items-center justify-between p-3 rounded-md",
                  "border border-border",
                  status?.available ? "bg-green-50 dark:bg-green-950/20" : 
                  status === null ? "bg-gray-50 dark:bg-gray-800/30" : 
                  "bg-red-50 dark:bg-red-950/20"
                )}
              >
                <div className="flex items-center gap-3">
                  {status?.available && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {status === null && (
                    <Globe className="h-5 w-5 text-gray-400" />
                  )}
                  {status !== null && !status.available && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  
                  <div>
                    <h4 className="font-medium">{site.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {site.baseUrl}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {status !== null && (
                    <Badge variant={status.available ? "outline" : "destructive"} className={cn(
                      "rounded-full px-3 py-1",
                      status.available && "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400"
                    )}>
                      {status.available ? "Available" : "Unavailable"}
                    </Badge>
                  )}
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => checkSiteStatus(site.key)}
                    disabled={isChecking || checkingSite !== null}
                    className="rounded-full"
                  >
                    {isChecking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
          
          {sites.length === 0 && !isChecking && (
            <div className="text-center py-6 text-muted-foreground">
              No sites loaded. Click "Check All Sites" to load site information.
            </div>
          )}
          
          {isChecking && sites.length === 0 && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span>Loading sites...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}