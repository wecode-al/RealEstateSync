import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, XCircle, Clock, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { distributionSites } from "@shared/schema";

interface DistributionStatusProps {
  distributions: Record<string, { 
    status: 'pending' | 'success' | 'error'; 
    error: string | null;
    postUrl?: string | null;
  }>;
}

export function DistributionStatus({ distributions }: DistributionStatusProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Count successful, pending and failed distributions
  const statusCount = Object.values(distributions).reduce(
    (acc, curr) => ({
      success: acc.success + (curr.status === "success" ? 1 : 0),
      error: acc.error + (curr.status === "error" ? 1 : 0),
      pending: acc.pending + (curr.status === "pending" ? 1 : 0)
    }),
    { success: 0, error: 0, pending: 0 }
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between"
          // Add red border if there are errors
          style={statusCount.error > 0 ? { borderColor: 'red', borderWidth: '1px' } : undefined}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">Distribution Status</span>
            <span className={`text-sm ${statusCount.error > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
              ({statusCount.success} successful, {statusCount.error} failed
              {statusCount.pending > 0 ? `, ${statusCount.pending} pending` : ''})
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
          const status = distributions[site] || { status: 'pending', error: null };

          return (
            <div 
              key={site} 
              className={`flex items-center justify-between p-2 rounded ${
                status.status === 'error' ? 'bg-red-50' : 'bg-muted'
              }`}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{site}</span>
                  {getStatusIcon(status.status)}
                </div>
                {status.error && (
                  <span className="text-sm text-red-500 mt-1">{status.error}</span>
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
              </div>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}