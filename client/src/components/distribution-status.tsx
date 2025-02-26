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
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    const checkExtension = async () => {
      try {
        // First check if we're in Chrome
        const isChrome = /Chrome/.test(navigator.userAgent);
        console.log('Browser check:', { 
          isChrome, 
          userAgent: navigator.userAgent,
          location: window.location.href
        });

        if (!isChrome) {
          const error = 'Not using Chrome browser';
          console.log(error);
          setExtensionReady(false);
          setShowInstructions(true);
          return;
        }

        // Debug Chrome object
        console.log('Chrome API check:', {
          hasWindow: typeof window !== 'undefined',
          hasChrome: typeof window.chrome !== 'undefined',
          chromeKeys: window.chrome ? Object.keys(window.chrome) : [],
          hasRuntime: window.chrome?.runtime ? true : false,
          runtimeKeys: window.chrome?.runtime ? Object.keys(window.chrome.runtime) : [],
          hasSendMessage: typeof window.chrome?.runtime?.sendMessage === 'function'
        });

        // Check for Chrome extension API
        if (!window.chrome) {
          const error = 'Chrome object not found - please make sure you are using Chrome browser';
          console.log(error);
          throw new Error(error);
        }

        if (!window.chrome.runtime) {
          const error = 'Chrome runtime not found - extension may not be installed';
          console.log(error);
          throw new Error(error);
        }

        if (typeof window.chrome.runtime.sendMessage !== 'function') {
          const error = 'Chrome sendMessage not available - extension may be disabled';
          console.log(error);
          throw new Error(error);
        }

        // Try to communicate with extension
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Extension not responding - please try reinstalling'));
          }, 2000);

          console.log('Attempting to connect to extension...');
          window.chrome.runtime.sendMessage(
            {
              type: 'CHECK_CONNECTION',
              source: 'replit-app',
              timestamp: Date.now()
            },
            response => {
              clearTimeout(timeout);
              console.log('Extension response:', response);

              if (window.chrome?.runtime?.lastError) {
                const error = `Extension error: ${window.chrome.runtime.lastError.message}`;
                console.error(error);
                reject(new Error(error));
                return;
              }

              if (!response?.success) {
                const error = 'Extension not ready - try refreshing the page';
                console.error(error);
                reject(new Error(error));
                return;
              }

              resolve(response);
            }
          );
        });

        // If we get here, the extension is working
        console.log('Extension check successful - ready to use');
        setExtensionReady(true);
        setShowInstructions(false);

      } catch (error) {
        console.error('Extension check error:', error);

        // Retry logic
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying extension check (${retryCount}/${maxRetries}) in ${retryDelay}ms...`);
          setTimeout(checkExtension, retryDelay);
          return;
        }

        console.log('All retries failed - showing installation instructions');
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
                  <li>Open Chrome and go to <code>chrome://extensions</code></li>
                  <li>Enable "Developer mode" (toggle in top right)</li>
                  <li>Click "Load unpacked"</li>
                  <li>Select the extracted "extension" folder</li>
                  <li>The extension icon should appear in Chrome's toolbar</li>
                  <li>After installing, refresh this page</li>
                </ul>
              </ol>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 font-medium">If Extension Not Ready:</p>
                <ol className="mt-2 space-y-1 text-yellow-700 list-decimal list-inside">
                  <li>First, check Chrome extensions page:
                    <ul className="ml-6 mt-1 space-y-1 list-disc">
                      <li>Open new tab, go to: <code>chrome://extensions</code></li>
                      <li>Look for "Albanian Property Poster"</li>
                      <li>If not found, you need to install it</li>
                      <li>If found but disabled, enable it</li>
                    </ul>
                  </li>
                  <li>If extension not showing:
                    <ul className="ml-6 mt-1 space-y-1 list-disc">
                      <li>Download extension folder from file explorer</li>
                      <li>Enable "Developer mode" in Chrome extensions</li>
                      <li>Click "Load unpacked" and select folder</li>
                    </ul>
                  </li>
                  <li>After any changes:
                    <ul className="ml-6 mt-1 space-y-1 list-disc">
                      <li>Look for extension icon in Chrome toolbar</li>
                      <li>If icon is grayed out, click it</li>
                      <li>Refresh this page completely</li>
                    </ul>
                  </li>
                </ol>
                <p className="mt-3 text-sm text-yellow-800">
                  Still not working? Try removing the extension completely and reinstalling it from the extension folder.
                </p>
              </div>
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