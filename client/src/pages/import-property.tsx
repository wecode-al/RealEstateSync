import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Property } from "@shared/schema";

// Form schema for URL
const importSchema = z.object({
  url: z.string().url("Please enter a valid URL")
});

type ImportFormData = z.infer<typeof importSchema>;

export default function ImportProperty() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [importedProperty, setImportedProperty] = useState<Property | null>(null);
  const queryClient = useQueryClient(); // Add queryClient for cache invalidation

  // Get the current scraper configuration
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["/api/scraper-configs/current"],
  });

  const form = useForm<ImportFormData>({
    resolver: zodResolver(importSchema)
  });

  // Mutation for importing property
  const importMutation = useMutation({
    mutationFn: async (data: ImportFormData) => {
      if (!config?.id) {
        throw new Error("No website configuration found. Please set up your website configuration in Settings first.");
      }

      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, configId: config.id })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to import property");
      }
      return res.json();
    },
    onSuccess: (response) => {
      setImportedProperty(response.property);
      // Invalidate the properties query to fetch the updated list
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property imported successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  async function onSubmit(data: ImportFormData) {
    importMutation.mutate(data);
  }

  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Import Property
        </h1>
        <Card className="p-6">
          <div className="text-center py-6">
            <p className="text-lg text-muted-foreground">
              Please set up your website configuration in Settings before importing properties.
            </p>
            <Button 
              className="mt-4"
              onClick={() => navigate('/settings')}
            >
              Go to Settings
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
        Import Property
      </h1>

      {importedProperty ? (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Imported Property Details</h2>
          <div className="space-y-2">
            <p><strong>Title:</strong> {importedProperty.title}</p>
            <p><strong>Price:</strong> ${importedProperty.price}</p>
            <p><strong>Description:</strong> {importedProperty.description}</p>
          </div>
          <div className="mt-4 flex gap-4">
            <Button onClick={() => navigate(`/edit-property/${importedProperty.id}`)}>
              Edit Property
            </Button>
            <Button variant="outline" onClick={() => setImportedProperty(null)}>
              Import Another
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="mb-4">
                <h2 className="text-lg font-medium">Importing from: {config.name}</h2>
                <p className="text-sm text-muted-foreground">{config.baseUrl}</p>
              </div>

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={importMutation.isPending}
                className="w-full"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Property'
                )}
              </Button>
            </form>
          </Form>
        </Card>
      )}
    </div>
  );
}