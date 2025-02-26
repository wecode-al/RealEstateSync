import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { distributionSites } from "@shared/schema";

interface DistributionStatusProps {
  distributions: Record<string, { 
    status: string; 
    error: string | null;
    postUrl?: string;  // Add postUrl property
  }>;
}

export function DistributionStatus({ distributions }: DistributionStatusProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="w-full space-y-2">
      <Alert>
        <AlertTitle className="font-semibold">Distribution Status</AlertTitle>
      </Alert>

      <div className="space-y-2">
        {distributionSites.map((site) => {
          const status = distributions[site];
          return (
            <div key={site} className="flex items-center justify-between p-2 bg-muted rounded">
              <span>{site}</span>
              <div className="flex items-center gap-2">
                {status.error && (
                  <span className="text-sm text-red-500">{status.error}</span>
                )}
                {status.status === "success" && status.postUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-500 hover:text-blue-700"
                    onClick={() => window.open(status.postUrl, '_blank')}
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
      </div>
    </div>
  );
}