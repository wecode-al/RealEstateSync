import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, XCircle, Clock, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { distributionSites } from "@shared/schema";
import { postToLocalSites } from "@/lib/extension";

interface DistributionStatusProps {
  distributions: Record<string, { 
    status: 'pending' | 'success' | 'error'; 
    error: string | null;
    postUrl?: string | null;
  }>;
  property: any; // Replace with Property type
}

export function DistributionStatus({ distributions, property }: DistributionStatusProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Check if extension is installed
  useEffect(() => {
    setHasExtension(!!window.chrome?.runtime);
  }, []);

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

  const handlePublishToLocalSites = async () => {
    if (!hasExtension) {
      return;
    }

    try {
      const response = await postToLocalSites(property);
      console.log('Extension response:', response);
    } catch (error) {
      console.error('Extension error:', error);
    }
  };

  return (
    <>
      {!hasExtension && (
        <Alert className="mb-4">
          <AlertTitle className="text-red-500">Chrome Extension Required</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">
              To publish to local listing sites, you need to install our Chrome extension.
              The extension allows automatic posting to sites like Merrjep, Njoftime, and others while you're logged in.
            </p>
            {!showInstructions ? (
              <Button 
                variant="link" 
                className="p-0 text-blue-500"
                onClick={() => setShowInstructions(true)}
              >
                Show Installation Instructions
              </Button>
            ) : (
              <div className="space-y-2 mt-2 text-sm">
                <p className="font-semibold">Installation Steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>In your project files (left sidebar), locate and right-click the "extension" folder</li>
                  <li>Click "Download" to save the extension folder to your computer</li>
                  <li>Open Chrome and go to Extensions (copy and paste: chrome://extensions in a new tab)</li>
                  <li>Enable "Developer mode" in the top right corner</li>
                  <li>Click "Load unpacked" button</li>
                  <li>Navigate to where you downloaded the extension folder and select it</li>
                  <li>The extension icon should appear in your Chrome toolbar</li>
                </ol>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800 font-medium">Important:</p>
                  <p className="text-yellow-700">Make sure to keep the extension folder on your computer. Don't delete it after installation as Chrome needs it to run the extension.</p>
                </div>
                <Button 
                  variant="link" 
                  className="p-0 text-blue-500"
                  onClick={() => setShowInstructions(false)}
                >
                  Hide Instructions
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between"
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

          <div className="mt-4">
            <Button
              onClick={handlePublishToLocalSites}
              disabled={!hasExtension || statusCount.pending > 0}
              className="w-full"
            >
              {statusCount.pending > 0 ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish to Local Sites'
              )}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}