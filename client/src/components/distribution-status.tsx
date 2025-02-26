import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { postToLocalSites } from "@/lib/extension";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@shared/schema";

interface DistributionStatusProps {
  property: Property;
}

export function DistributionStatus({ property }: DistributionStatusProps) {
  const [publishing, setPublishing] = useState(false);
  const { toast } = useToast();

  const handlePublishToLocalSites = async () => {
    if (publishing) return;

    try {
      setPublishing(true);
      console.log('Starting publication process...');

      await postToLocalSites(property);

      toast({
        title: "Publishing Started",
        description: "Check the extension popup for posting status.",
      });
    } catch (error) {
      console.error('Publishing error:', error);
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
    <Card className="p-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-medium">Publish to Local Sites</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Merrjep.al (Make sure you're logged in)</li>
          </ul>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="text-blue-800">
            Currently supporting Merrjep.al. Make sure you are logged in before publishing.
          </p>
        </div>

        <Button
          onClick={handlePublishToLocalSites}
          disabled={publishing}
          className="w-full"
        >
          {publishing ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            'Publish to Merrjep.al'
          )}
        </Button>

        <div className="text-sm text-muted-foreground">
          <p>Before publishing:</p>
          <ul className="list-disc list-inside mt-1">
            <li>Open <a href="https://www.merrjep.al/login" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Merrjep.al Login Page</a></li>
            <li>Log in to your Merrjep.al account</li>
            <li>Return here and click publish</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}