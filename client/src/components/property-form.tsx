import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { insertPropertySchema, propertyTypes, listingTypes, type InsertProperty, type Property } from "@shared/schema";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/image-upload";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface PropertyFormProps {
  property?: Property;
}

export function PropertyForm({ property }: PropertyFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<InsertProperty>({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: property ? {
      title: property.title,
      description: property.description,
      price: Number(property.price),
      bedrooms: property.bedrooms,
      bathrooms: Number(property.bathrooms),
      squareMeters: Number(property.squareMeters),
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      propertyType: property.propertyType,
      listingType: property.listingType || "Shitet",
      images: property.images,
      features: property.features as string[]
    } : {
      title: "",
      description: "",
      price: 0,
      bedrooms: 0,
      bathrooms: 0,
      squareMeters: 0,
      address: "",
      city: "",
      state: "",
      zipCode: "",
      propertyType: "Apartamente",
      listingType: "Shitet",
      images: [],
      features: []
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      const res = await apiRequest(
        property ? "PATCH" : "POST",
        property ? `/api/properties/${property.id}` : "/api/properties",
        data
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save property");
      }

      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Property has been ${property ? 'updated' : 'created'}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      if (property) {
        queryClient.invalidateQueries({ queryKey: ["/api/properties", property.id] });
      }
      navigate("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input 
              {...form.register("title")}
              placeholder="Property Title"
            />

            <Textarea 
              {...form.register("description")}
              placeholder="Description"
              className="h-32"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input 
                {...form.register("price", { valueAsNumber: true })}
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
              />
              <Input 
                {...form.register("squareMeters", { valueAsNumber: true })}
                type="number"
                min="0"
                placeholder="Square Meters"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input 
                {...form.register("bedrooms", { valueAsNumber: true })}
                type="number"
                min="0"
                placeholder="Bedrooms"
              />
              <Input 
                {...form.register("bathrooms", { valueAsNumber: true })}
                type="number"
                min="0"
                step="0.5"
                placeholder="Bathrooms"
              />
            </div>

            <Select 
              onValueChange={(value) => form.setValue("propertyType", value)}
              defaultValue={form.getValues("propertyType")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                {propertyTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              onValueChange={(value) => form.setValue("listingType", value)}
              defaultValue={form.getValues("listingType") || "Shitet"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Listing Type" />
              </SelectTrigger>
              <SelectContent>
                {listingTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Input 
              {...form.register("address")}
              placeholder="Street Address"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input 
                {...form.register("city")}
                placeholder="City"
              />
              <Input 
                {...form.register("state")}
                placeholder="State"
              />
            </div>

            <Input 
              {...form.register("zipCode")}
              placeholder="ZIP Code"
            />

            <ImageUpload
              value={form.watch("images")}
              onChange={(urls) => form.setValue("images", urls)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/")}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {property ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              property ? 'Update Property' : 'Create Property'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}