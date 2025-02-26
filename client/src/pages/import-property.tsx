import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { ScraperConfig } from "@shared/schema";

// Form schema for URL and config selection
const importSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  configId: z.number().min(1, "Please select a website configuration")
});

type ImportFormData = z.infer<typeof importSchema>;

export default function ImportProperty() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Fetch available scraper configurations
  const { data: configs, isLoading: configsLoading } = useQuery<ScraperConfig[]>({
    queryKey: ["/api/scraper-configs"],
  });

  const form = useForm<ImportFormData>({
    resolver: zodResolver(importSchema)
  });

  // Mutation for importing property
  const importMutation = useMutation({
    mutationFn: async (data: ImportFormData) => {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to import property");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Property imported successfully"
      });
      navigate("/");
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

  if (configsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Import Property</h1>
      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            
            <FormField
              control={form.control}
              name="configId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website Configuration</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1"
                      {...field}
                      onChange={e => field.onChange(Number(e.target.value))}
                    >
                      <option value="">Select a website configuration</option>
                      {configs?.map(config => (
                        <option key={config.id} value={config.id}>
                          {config.name}
                        </option>
                      ))}
                    </select>
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
    </div>
  );
}
