import { type Property } from "@shared/schema";
import { siteConfigs } from "@shared/schema";

interface LocalListingResponse {
  success: boolean;
  error?: string;
  postUrl?: string;
}

export class LocalListingService {
  async publishProperty(property: Property, siteId: string): Promise<LocalListingResponse> {
    // Find the site configuration
    const site = siteConfigs[siteId as keyof typeof siteConfigs];
    if (!site) {
      return {
        success: false,
        error: `Unknown local listing site: ${siteId}`
      };
    }

    try {
      console.log(`Publishing to local site ${siteId}: ${site.baseUrl}${site.apiEndpoint}`);

      const listingData = {
        title: property.title,
        description: property.description,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareMeters: property.squareMeters,
        location: {
          address: property.address,
          city: property.city,
          state: property.state,
          zipCode: property.zipCode
        },
        propertyType: property.propertyType,
        images: property.images,
        features: property.features
      };

      console.log('Sending data to local listing site:', listingData);

      // For now, simulate the API call
      // In production, replace with actual API call to the local listing site
      const success = Math.random() > 0.1; // 90% success rate for demo
      if (success) {
        return {
          success: true,
          postUrl: `${site.baseUrl}/listings/${Date.now()}`
        };
      } else {
        throw new Error("API connection failed");
      }

    } catch (error) {
      console.error(`Local Listing Publishing Error (${siteId}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish to local listing site'
      };
    }
  }
}

export const localListingService = new LocalListingService();