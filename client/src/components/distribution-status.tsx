import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ExternalLink, RefreshCw, Check, XCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";

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
    <Card className="p-4 border-none shadow-lg">
      <div className="space-y-4">
        <h3 className="font-medium text-lg mb-2">Distribution Status</h3>

        <div className="space-y-3">
          {sites.map((site) => {
            const distribution = property.distributions?.[site.key];
            const isPublished = distribution?.status === "success";
            const hasError = distribution?.status === "error";
            const postUrl = distribution?.postUrl;
            const isPublishing = publishingSite === site.key;

            return (
              <div key={site.key} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                <div className="flex items-center gap-2">
                  {isPublished && <Check className="h-4 w-4 text-green-500" />}
                  {hasError && <XCircle className="h-4 w-4 text-red-500" />}
                  {!distribution && <div className="h-4 w-4" />}
                  <span className="font-medium">{site.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPublishingSite(site.key);
                      publishMutation.mutate({ siteKey: site.key });
                    }}
                    disabled={isPublishing || publishMutation.isPending}
                  >
                    {isPublishing ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : isPublished ? (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    ) : null}
                    {isPublished ? "Republish" : "Publish"}
                  </Button>

                  {isPublished && postUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a href={postUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}