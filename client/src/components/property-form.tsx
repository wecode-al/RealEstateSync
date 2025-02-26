import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { insertPropertySchema, propertyTypes, type InsertProperty, type Property } from "@shared/schema";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/image-upload";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

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
      price: property.price.toString(),
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms.toString(),
      squareMeters: property.squareMeters?.toString() || "0", // Handle potential undefined
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      propertyType: property.propertyType,
      images: property.images,
      features: property.features
    } : {
      title: "",
      description: "",
      price: "0",
      bedrooms: 0,
      bathrooms: "0",
      squareMeters: "0",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      propertyType: "Single Family Home",
      images: [],
      features: []
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertProperty) => {
      const res = await apiRequest(
        property ? "PATCH" : "POST",
        property ? `/api/properties/${property.id}` : "/api/properties",
        {
          ...data,
          price: String(data.price),
          bathrooms: String(data.bathrooms),
          squareMeters: String(data.squareMeters)
        }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Property has been ${property ? 'updated' : 'created'}`,
      });
      // Invalidate and refetch properties query
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
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
                {...form.register("price")}
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
              />
              <Input 
                {...form.register("squareMeters")}
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
                {...form.register("bathrooms")}
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
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              `${property ? 'Updating' : 'Creating'}...`
            ) : (
              property ? 'Update Property' : 'Create Property'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}