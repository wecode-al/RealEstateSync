import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { postToLocalSites } from "@/lib/extension";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { Property } from "@shared/schema";

interface DistributionStatusProps {
  property: Property;
}

export function DistributionStatus({ property }: DistributionStatusProps) {
  const [publishing, setPublishing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handlePublish = async () => {
    if (publishing) return;

    try {
      setPublishing(true);
      console.log('Starting publication process...');

      await postToLocalSites(property);

      // Invalidate the properties query to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });

      toast({
        title: "Publishing Started",
        description: "Your property is being published.",
      });
    } catch (error) {
      console.error('Publishing error:', error);
      toast({
        title: "Publishing Failed",
        description: error instanceof Error ? error.message : "Failed to publish property",
        variant: "destructive"
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Card className="p-4 border-none shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <div className="space-y-4">
        <Button
          onClick={handlePublish}
          disabled={publishing}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {publishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            'Publish Property'
          )}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          Make sure you are logged in to your accounts before publishing.
        </p>
      </div>
    </Card>
  );
}