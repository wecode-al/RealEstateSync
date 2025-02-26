import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, XCircle, Clock, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { distributionSites } from "@shared/schema";

interface DistributionStatusProps {
  distributions: Record<string, { 
    status: 'success' | 'error'; 
    error: string | null;
    postUrl: string | null;
  }>;
}

export function DistributionStatus({ distributions }: DistributionStatusProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusIcon = (status: 'success' | 'error') => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Count successful and failed distributions
  const statusCount = Object.values(distributions).reduce(
    (acc, curr) => ({
      success: acc.success + (curr.status === "success" ? 1 : 0),
      error: acc.error + (curr.status === "error" ? 1 : 0),
    }),
    { success: 0, error: 0 }
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Distribution Status</span>
            <span className="text-sm text-muted-foreground">
              ({statusCount.success} successful, {statusCount.error} failed)
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2 pt-2">
        {distributionSites.map((site) => {
          const status = distributions[site];
          if (!status) return null;

          return (
            <div key={site} className="flex items-center justify-between p-2 bg-muted rounded">
              <div className="flex items-center gap-2">
                <span className="font-medium">{site}</span>
                {status.error && (
                  <span className="text-sm text-red-500">{status.error}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {status.status === "success" && status.postUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-500 hover:text-blue-700"
                    onClick={() => window.open(status.postUrl!, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Post
                  </Button>
                )}
                {getStatusIcon(status.status)}
              </div>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}