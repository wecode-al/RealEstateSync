import { type Property } from "@shared/schema";
import { siteConfigs } from "@shared/schema";
import { storage } from "../storage";
import { indomioTransformer } from "./indomio-transformer";
import fetch from "node-fetch";

interface ListingResponse {
  success: boolean;
  error?: string;
  listingUrl?: string;
}

export class AlbanianListingService {
  async publishProperty(property: Property, siteName: string): Promise<ListingResponse> {
    const config = siteConfigs[siteName as keyof typeof siteConfigs];

    if (!config) {
      return {
        success: false,
        error: `Configuration not found for ${siteName}`
      };
    }

    try {
      console.log(`Publishing to ${siteName}: ${config.baseUrl}${config.apiEndpoint}`);

      if (siteName === "indomio.al") {
        return await this.publishToIndomio(property, config);
      }

      // Fallback to default publishing logic for other sites
      const listingData = {
        title: property.title,
        description: property.description,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.squareMeters,
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

      // TODO: Replace with actual API calls when credentials are provided
      const success = Math.random() > 0.1; // 90% success rate for demo
      if (success) {
        return {
          success: true,
          listingUrl: `${config.baseUrl}/listing/${Date.now()}`
        };
      } else {
        throw new Error("API connection failed");
      }

    } catch (error) {
      console.error(`${siteName} Publishing Error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to publish to ${siteName}`
      };
    }
  }

  private async publishToIndomio(property: Property, config: any): Promise<ListingResponse> {
    try {
      // Transform property to Indomio format
      const indomioProperty = indomioTransformer.transform(property);
      const xmlData = indomioTransformer.toXML(indomioProperty);

      console.log(`Sending data to Indomio:`, xmlData);

      const response = await fetch(`${config.baseUrl}${config.apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/json',
          // Add any required authentication headers
        },
        body: xmlData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Indomio API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        listingUrl: result.url || `${config.baseUrl}/property/${property.id}`
      };

    } catch (error) {
      console.error('Indomio Publishing Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish to Indomio'
      };
    }
  }
}

export const albanianListingService = new AlbanianListingService();