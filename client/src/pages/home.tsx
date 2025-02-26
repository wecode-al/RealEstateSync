import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PropertyPreview } from "@/components/property-preview";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Property } from "@shared/schema";

export default function Home() {
  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"]
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-primary">Property Listings</h1>
          <Link href="/add-property">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[400px] bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties?.map((property) => (
              <PropertyPreview key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
