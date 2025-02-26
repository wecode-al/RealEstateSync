import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { postToLocalSites, checkExtension } from "@/lib/extension";
import { useToast } from "@/hooks/use-toast";

interface DistributionStatusProps {
  property: any; // Replace with Property type
}

export function DistributionStatus({ property }: DistributionStatusProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { toast } = useToast();

  // Check if extension is installed and working
  useEffect(() => {
    const checkExtensionStatus = async () => {
      const isExtensionWorking = await checkExtension();
      setHasExtension(isExtensionWorking);
    };
    checkExtensionStatus();
  }, []);

  const handlePublishToLocalSites = async () => {
    if (!hasExtension || publishing) {
      return;
    }

    try {
      setPublishing(true);
      await postToLocalSites(property);
      toast({
        title: "Publishing Started",
        description: "Check the extension popup for posting status.",
      });
    } catch (error) {
      toast({
        title: "Publishing Failed",
        description: error instanceof Error ? error.message : "Failed to start publishing",
        variant: "destructive"
      });
    } finally {
      setPublishing(false);
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
                  <li>In the file explorer (left sidebar):</li>
                  <ul className="ml-6 mt-1 space-y-1 list-disc">
                    <li>Find the "extension" folder</li>
                    <li>Right-click on it</li>
                    <li>Select "Download" from the menu</li>
                    <li>Note where you save the downloaded file (e.g., Downloads folder)</li>
                  </ul>
                  <li>After downloading:</li>
                  <ul className="ml-6 mt-1 space-y-1 list-disc">
                    <li>Unzip/extract the downloaded file if it's a .zip file</li>
                    <li>You should now have a folder named "extension" with files inside</li>
                  </ul>
                  <li>Install in Chrome:</li>
                  <ul className="ml-6 mt-1 space-y-1 list-disc">
                    <li>Open Chrome browser</li>
                    <li>Copy and paste this in a new tab: <code className="bg-gray-100 px-2 py-0.5 rounded">chrome://extensions</code></li>
                    <li>Enable "Developer mode" (toggle in top right)</li>
                    <li>Click "Load unpacked" button</li>
                    <li>Browse to and select the "extension" folder you extracted</li>
                  </ul>
                </ol>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800 font-medium">Important Notes:</p>
                  <ul className="mt-2 space-y-1 text-yellow-700">
                    <li>• Keep the extension folder on your computer</li>
                    <li>• Make sure you select the folder containing manifest.json</li>
                    <li>• The extension icon should appear in Chrome's toolbar after installation</li>
                  </ul>
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
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">Publish to Local Sites</span>
              {publishing && <Clock className="h-4 w-4 animate-spin" />}
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <h3 className="font-medium">Supported Sites:</h3>
            <ul className="space-y-1 text-sm">
              <li>• Merrjep.al</li>
              <li>• Njoftime.com</li>
              <li>• Gazetacelesi.al</li>
              <li>• Njoftime.al</li>
            </ul>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="text-blue-800">
              Make sure you are logged into the sites where you want to publish your property.
              The extension will automatically fill in the property details on each site.
            </p>
          </div>

          <Button
            onClick={handlePublishToLocalSites}
            disabled={!hasExtension}
            className="w-full"
          >
            {publishing ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish to Local Sites'
            )}
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}