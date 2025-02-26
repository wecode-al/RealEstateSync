import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PropertyForm } from "@/components/property-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { Property } from "@shared/schema";

export default function EditProperty({ params }: { params: { id: string } }) {
  const [, navigate] = useLocation();
  
  const { data: property, isLoading } = useQuery<Property>({
    queryKey: [`/api/properties/${params.id}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Property Not Found</h1>
          <Button onClick={() => navigate("/")}>Back to Listings</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Listings
          </Button>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-primary mb-8">Edit Property</h1>
          <PropertyForm property={property} />
        </div>
      </div>
    </div>
  );
}
