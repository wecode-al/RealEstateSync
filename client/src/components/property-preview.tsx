import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Bed, Bath, Square, MapPin, Loader2, Trash2, Pencil } from "lucide-react";
import type { Property } from "@shared/schema";
import { useLocation } from "wouter";
import { DistributionStatus } from "./distribution-status";

interface PropertyPreviewProps {
  property: Property;
}

export function PropertyPreview({ property }: PropertyPreviewProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/properties/${property.id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete property");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property has been deleted",
      });
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
    <Card className="overflow-hidden">
      <div className="aspect-[16/9] relative overflow-hidden">
        <img
          src={property.images[0] || "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf"}
          alt={property.title}
          className="object-cover w-full h-full"
        />
        <Badge className="absolute top-2 right-2">
          {property.propertyType}
        </Badge>
      </div>

      <CardContent className="p-6">
        <h3 className="text-2xl font-semibold mb-2">{property.title}</h3>
        <p className="text-3xl font-bold text-primary mb-4">
          ${property.price.toLocaleString()}
        </p>

        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-1">
            <Bed className="h-4 w-4" />
            <span>{property.bedrooms} beds</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            <span>{property.bathrooms} baths</span>
          </div>
          <div className="flex items-center gap-1">
            <Square className="h-4 w-4" />
            <span>{property.squareMeters} m²</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-1" />
          <p className="text-muted-foreground">
            {property.address}, {property.city}, {property.state} {property.zipCode}
          </p>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0 flex flex-col gap-4">
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/edit-property/${property.id}`)}
            className="flex-1"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex-1"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>
        </div>

        <DistributionStatus property={property} />
      </CardFooter>
    </Card>
  );
}