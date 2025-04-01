import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, RefreshCw, Check, XCircle, Globe } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Property, DistributionStatus as DistStatus } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DistributionStatusProps {
  property: Property;
}

// Type for our site keys
type SiteKey = "njoftime.com" | "njoftime.al" | "merrjep.al" | "mirlir.com" | "indomio.al" | "okazion.al";

// Interface for site data
interface SiteInfo {
  key: SiteKey;
  name: string;
}

// Define a custom PropertyDistributions type for our component
type CustomPropertyDistributions = {
  [key in SiteKey]?: DistStatus;
}

export function DistributionStatus(props: DistributionStatusProps) {
  // Cast property to any to avoid TypeScript issues with distributions
  const property = props.property as any;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [publishingSite, setPublishingSite] = useState<string | null>(null);
  
  // Ensure property.distributions is defined with proper typing
  if (!property.distributions) {
    property.distributions = {} as CustomPropertyDistributions;
  }
  
  // Create a typed reference to distributions for TypeScript
  const distributions = property.distributions as CustomPropertyDistributions;

  const publishMutation = useMutation({
    mutationFn: async ({ siteKey }: { siteKey: string }) => {
      const res = await apiRequest("PATCH", `/api/properties/${property.id}/publish/${siteKey}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to publish property");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });

      // Check the actual status of the publication
      const siteStatus = data.distributions[variables.siteKey];

      if (siteStatus?.status === "success") {
        toast({
          title: "Success",
          description: `Property has been published to ${variables.siteKey}`,
        });
      } else if (siteStatus?.status === "error") {
        toast({
          title: "Publication Failed",
          description: siteStatus.error || "Failed to publish property",
          variant: "destructive"
        });
      }
      setPublishingSite(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setPublishingSite(null);
    }
  });

  // Albanian real estate sites
  const sites: SiteInfo[] = [
    { key: "njoftime.com", name: "Njoftime.com" },
    { key: "njoftime.al", name: "Njoftime.al" },
    { key: "merrjep.al", name: "Merrjep.al" },
    { key: "mirlir.com", name: "Mirlir.com" },
    { key: "indomio.al", name: "Indomio.al" },
    { key: "okazion.al", name: "Okazion.al" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-4">
        <Globe className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-xl">Distribution Status</h3>
      </div>

      <div className="space-y-5">
        {sites.map((site) => {
          const distribution = distributions[site.key];
          const isPublished = distribution?.status === "success";
          const hasError = distribution?.status === "error";
          const postUrl = distribution?.postUrl;
          const isPublishing = publishingSite === site.key;

          return (
            <div
              key={site.key}
              className={cn(
                "flex items-center justify-between py-4 px-3",
                "border-l-4 pl-4 rounded-sm bg-background",
                isPublished ? "border-l-green-500" : 
                hasError ? "border-l-red-500" : 
                "border-l-gray-300 dark:border-l-gray-600"
              )}
            >
              <div className="flex items-center gap-4">
                {isPublished && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                )}
                {hasError && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                )}
                {!distribution && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-base">{site.name}</h4>
                  {hasError && (
                    <p className="text-sm text-red-500 mt-1">
                      {distribution.error}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 ml-4">
                <Button
                  variant={isPublished ? "outline" : "default"}
                  size="sm"
                  onClick={() => {
                    setPublishingSite(site.key);
                    publishMutation.mutate({ siteKey: site.key });
                  }}
                  disabled={isPublishing || publishMutation.isPending}
                  className={cn(
                    "min-w-[120px] transition-all duration-200 rounded-full",
                    isPublished ? "hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/20 border-green-200 dark:border-green-800" : 
                    "bg-primary hover:bg-primary/90"
                  )}
                >
                  {isPublishing ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Publishing...</span>
                    </div>
                  ) : isPublished ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      <span>Republish</span>
                    </div>
                  ) : (
                    <span>Publish</span>
                  )}
                </Button>

                {isPublished && postUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "min-w-[90px] transition-all duration-200 rounded-full",
                      "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
                      "dark:bg-blue-900/20 dark:border-blue-800 dark:hover:bg-blue-900/30",
                      "group"
                    )}
                    asChild
                  >
                    <a 
                      href={postUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4 transition-transform group-hover:scale-110" />
                      <span>View</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}