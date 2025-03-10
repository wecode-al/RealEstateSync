import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, RefreshCw, Check, XCircle, Globe } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DistributionStatusProps {
  property: Property;
}

export function DistributionStatus({ property }: DistributionStatusProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [publishingSite, setPublishingSite] = useState<string | null>(null);

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
  const sites = [
    { key: "njoftime.com", name: "Njoftime.com" },
    { key: "merrjep.al", name: "Merrjep.al" },
    { key: "indomio.al", name: "Indomio.al" }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 border-b pb-4">
        <Globe className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Distribution Status</h3>
      </div>

      <div className="space-y-6">
        {sites.map((site) => {
          const distribution = property.distributions?.[site.key];
          const isPublished = distribution?.status === "success";
          const hasError = distribution?.status === "error";
          const postUrl = distribution?.postUrl;
          const isPublishing = publishingSite === site.key;

          return (
            <div
              key={site.key}
              className={cn(
                "relative pl-6 py-4",
                "border-l-2",
                isPublished ? "border-l-green-500" : 
                hasError ? "border-l-red-500" : 
                "border-l-gray-200 dark:border-l-gray-700"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {isPublished && (
                    <Check className="h-5 w-5 text-green-500 shrink-0" />
                  )}
                  {hasError && (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                  {!distribution && (
                    <div className="h-5 w-5 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-medium text-base">{site.name}</h4>
                    {hasError && (
                      <p className="text-sm text-red-500 mt-2">
                        {distribution.error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant={isPublished ? "outline" : "default"}
                    size="sm"
                    onClick={() => {
                      setPublishingSite(site.key);
                      publishMutation.mutate({ siteKey: site.key });
                    }}
                    disabled={isPublishing || publishMutation.isPending}
                    className={cn(
                      "min-w-[120px] transition-all duration-200",
                      isPublished ? "hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20" : 
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
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "min-w-[100px] transition-all duration-200",
                        "hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20",
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
            </div>
          );
        })}
      </div>
    </div>
  );
}