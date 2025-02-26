import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { postToLocalSites } from "@/lib/extension";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@shared/schema";

// Add Chrome runtime types
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage?: (message: any, callback: (response: any) => void) => void;
        lastError?: { message: string };
      };
    };
  }
}

interface DistributionStatusProps {
  property: Property;
}

export function DistributionStatus({ property }: DistributionStatusProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [extensionReady, setExtensionReady] = useState(false);
  const { toast } = useToast();

  // Check extension availability
  useEffect(() => {
    const checkExtension = async () => {
      try {
        // First check if we're in Chrome
        const isChrome = /Chrome/.test(navigator.userAgent);
        console.log('Browser check:', { isChrome, userAgent: navigator.userAgent });

        if (!isChrome) {
          console.log('Not using Chrome browser');
          setExtensionReady(false);
          setShowInstructions(true);
          return;
        }

        // Check if extension API is available
        const runtime = window?.chrome?.runtime;
        const hasExtensionApi = !!runtime && typeof runtime.sendMessage === 'function';
        console.log('Extension API check:', { 
          hasChrome: !!window.chrome,
          hasRuntime: !!runtime,
          hasMessage: typeof runtime?.sendMessage === 'function',
          hasExtensionApi 
        });

        if (!hasExtensionApi) {
          console.log('Extension API not found or not properly initialized');
          setExtensionReady(false);
          setShowInstructions(true);
          return;
        }

        // Test actual communication with extension
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Extension not responding'));
          }, 2000);

          runtime.sendMessage(
            { 
              type: 'CHECK_CONNECTION',
              source: 'replit-app',
              timestamp: Date.now()
            },
            response => {
              clearTimeout(timeout);
              console.log('Extension test response:', response);

              if (runtime.lastError) {
                console.error('Extension test error:', runtime.lastError);
                reject(runtime.lastError);
                return;
              }

              if (!response?.success) {
                reject(new Error('Extension not ready'));
                return;
              }

              resolve(response);
            }
          );
        });

        // If we get here, the extension is working
        console.log('Extension is ready');
        setExtensionReady(true);
        setShowInstructions(false);

      } catch (error) {
        console.error('Extension check failed:', error);
        setExtensionReady(false);
        setShowInstructions(true);
      }
    };

    // Check extension status immediately and when window gains focus
    checkExtension();
    window.addEventListener('focus', checkExtension);
    return () => window.removeEventListener('focus', checkExtension);
  }, []);

  const handlePublishToLocalSites = async () => {
    if (publishing) return;

    try {
      setPublishing(true);
      console.log('Starting publication process...');

      if (!extensionReady) {
        throw new Error('Chrome extension not ready. Please install the extension and reload the page.');
      }

      await postToLocalSites(property);

      toast({
        title: "Publishing Started",
        description: "Check the extension popup for posting status.",
      });
    } catch (error) {
      console.error('Publishing error:', error);
      setShowInstructions(true);
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
      {showInstructions && (
        <Alert className="mb-4">
          <AlertTitle className="text-red-500">Chrome Extension Required</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">
              This feature requires Google Chrome browser and our extension.
              The extension allows automatic posting to sites like Merrjep while you're logged in.
            </p>
            <div className="space-y-2 mt-2 text-sm">
              <p className="font-semibold">Installation Steps:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Make sure you're using Google Chrome browser</li>
                <li>Download the extension:</li>
                <ul className="ml-6 mt-1 space-y-1 list-disc">
                  <li>Find the "extension" folder in the file explorer (left sidebar)</li>
                  <li>Right-click and select "Download"</li>
                  <li>Unzip/extract the downloaded file</li>
                </ul>
                <li>Install in Chrome:</li>
                <ul className="ml-6 mt-1 space-y-1 list-disc">
                  <li>Open Chrome and type <code>chrome://extensions</code> in the URL bar</li>
                  <li>Enable "Developer mode" (toggle in top right)</li>
                  <li>Click "Load unpacked"</li>
                  <li>Select the extracted "extension" folder</li>
                  <li>The extension icon should appear in Chrome's toolbar</li>
                  <li>After installing, refresh this page</li>
                </ul>
              </ol>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 font-medium">Important:</p>
                <ul className="mt-2 space-y-1 text-yellow-700">
                  <li>• Make sure Chrome shows "Developer mode" is enabled</li>
                  <li>• Check that the extension icon is visible in Chrome's toolbar</li>
                  <li>• If the icon is grayed out, click it and grant any required permissions</li>
                  <li>• After installing, you MUST refresh this page</li>
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
            <h3 className="font-medium">Available Sites:</h3>
            <ul className="space-y-1 text-sm">
              <li>• Merrjep.al (Make sure you're logged in)</li>
            </ul>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="text-blue-800">
              Currently supporting Merrjep.al. Make sure you are logged in before publishing.
              The extension will automatically fill in your property details.
            </p>
          </div>

          <Button
            onClick={handlePublishToLocalSites}
            disabled={!extensionReady || publishing}
            className="w-full"
          >
            {publishing ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : extensionReady ? (
              'Publish to Merrjep.al'
            ) : (
              'Chrome Extension Not Ready'
            )}
          </Button>

          <div className="mt-2 text-sm text-muted-foreground">
            <p>Before publishing:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Make sure the extension is installed (see instructions above)</li>
              <li>Open <a href="https://www.merrjep.al/login" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Merrjep.al Login Page</a></li>
              <li>Log in to your Merrjep.al account</li>
              <li>Return here and click publish</li>
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}