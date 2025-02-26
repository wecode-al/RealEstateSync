import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DistributionStatus } from "./distribution-status";
import { Bed, Bath, Square, MapPin } from "lucide-react";
import type { Property } from "@shared/schema";

interface PropertyPreviewProps {
  property: Property;
}

export function PropertyPreview({ property }: PropertyPreviewProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const publishMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/properties/${property.id}/publish`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Success",
        description: "Property has been published for distribution",
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
            <span>{property.sqft} sqft</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-1" />
          <p className="text-muted-foreground">
            {property.address}, {property.city}, {property.state} {property.zipCode}
          </p>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        {property.published ? (
          <DistributionStatus distributions={property.distributions} />
        ) : (
          <Button 
            className="w-full" 
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
          >
            {publishMutation.isPending ? "Publishing..." : "Publish & Distribute"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
