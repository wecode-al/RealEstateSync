import { type Property } from "@shared/schema";
import { siteConfigs } from "@shared/schema";
import { storage } from "../storage";
import fetch from "node-fetch";
import { merrjepListingService } from "./merrjep-listings";
import { okazionListingService } from "./okazion-listings";

interface ListingResponse {
  success: boolean;
  error?: string;
  listingUrl?: string;
}

export class AlbanianListingService {
  // Check if a site is available and return its status
  async checkSiteStatus(siteName: string): Promise<{ available: boolean; message: string }> {
    const config = siteConfigs[siteName as keyof typeof siteConfigs];
    
    if (!config) {
      return {
        available: false,
        message: `Configuration not found for ${siteName}`
      };
    }
    
    try {
      console.log(`Checking status for ${siteName}: ${config.baseUrl}`);
      
      // Try to fetch the website to check if it's available
      const timeout = 8000; // 8 seconds timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(config.baseUrl, { 
          method: 'HEAD', 
          signal: controller.signal,
          headers: { 'User-Agent': 'Property-Distribution-Tool/1.0' }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return {
            available: true,
            message: `${siteName} is online and ready to receive listings`
          };
        } else {
          return {
            available: false,
            message: `${siteName} returned status code ${response.status}`
          };
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          return {
            available: false,
            message: `${siteName} request timed out after ${timeout/1000} seconds`
          };
        }
        
        throw fetchError; // Re-throw to be caught by outer try/catch
      }
    } catch (error) {
      console.error(`${siteName} Status Check Error:`, error);
      return {
        available: false,
        message: error instanceof Error ? error.message : `Unable to connect to ${siteName}`
      };
    }
  }
  async publishProperty(property: Property, siteName: string): Promise<ListingResponse> {
    // Special case for MerrJep.al - use the Puppeteer-based service
    if (siteName === 'merrjep.al') {
      console.log(`Publishing to ${siteName} using Puppeteer-based service`);
      return await merrjepListingService.publishProperty(property);
    }
    
    const config = siteConfigs[siteName as keyof typeof siteConfigs];

    if (!config) {
      return {
        success: false,
        error: `Configuration not found for ${siteName}`
      };
    }

    try {
      console.log(`Publishing to ${siteName}: ${config.baseUrl}${config.apiEndpoint}`);

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

      console.log(`Preparing data for ${siteName}:`, listingData);

      // TODO: Replace with actual API calls when credentials are provided
      // For now, simulate API responses for testing
      // We add proper error handling to detect site-specific issues
      
      // Check if site is temporarily unavailable (random simulation for demo)
      const siteAvailable = Math.random() > 0.05; // 95% availability rate
      if (!siteAvailable) {
        return {
          success: false,
          error: `${siteName} is temporarily unavailable. Please try again later.`
        };
      }
      
      // Check if the site accepts this property type (random simulation for demo)
      const propertyTypeAccepted = Math.random() > 0.05; // 95% acceptance rate
      if (!propertyTypeAccepted) {
        return {
          success: false,
          error: `${siteName} does not accept properties of type '${property.propertyType}' at this time.`
        };
      }
      
      // Check for image upload issues (random simulation for demo)
      const imagesUploaded = Math.random() > 0.05; // 95% upload success rate
      if (!imagesUploaded) {
        return {
          success: false,
          error: `Failed to upload images to ${siteName}. Please try again.`
        };
      }
      
      // Everything passed, simulate successful listing
      return {
        success: true,
        listingUrl: `${config.baseUrl}/listing/${Date.now()}-${property.id}`
      };

    } catch (error) {
      console.error(`${siteName} Publishing Error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `Failed to publish to ${siteName}`
      };
    }
  }
}

export const albanianListingService = new AlbanianListingService();