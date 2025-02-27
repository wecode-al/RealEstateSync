import { type Property } from "@shared/schema";
import { siteConfigs } from "@shared/schema";
import { storage } from "../storage";
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
      // Handle social media platforms differently
      if (siteName === "facebook" || siteName === "Facebook" || siteName === "instagram") {
        return this.publishToSocialMedia(property, siteName.toLowerCase() as "facebook" | "instagram");
      }

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

  private async publishToSocialMedia(property: Property, platform: "facebook" | "instagram"): Promise<ListingResponse> {
    try {
      console.log(`Publishing to ${platform}`);

      // Get the settings for the platform
      const settings = await storage.getSettings();

      if (platform === "facebook") {
        const facebookSettings = settings["Facebook"];

        if (!facebookSettings?.enabled) {
          return {
            success: false,
            error: "Facebook integration is not enabled"
          };
        }

        // Get the configured Facebook pages
        const facebookPages = facebookSettings.additionalConfig?.pages
          ? JSON.parse(facebookSettings.additionalConfig.pages as string)
          : [];

        if (facebookPages.length === 0) {
          return {
            success: false,
            error: "No Facebook pages configured"
          };
        }

        // Generate property content for Facebook post
        const formattedPrice = new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(Number(property.price));

        // Get the first configured page for posting
        const page = facebookPages[0];
        console.log(`Publishing to Facebook page: ${page.name} (${page.pageId})`);

        // Create the post message
        const message = this.generateSocialMediaCaption(property, formattedPrice);

        try {
          // First, we need to upload the images to Facebook
          const photoIds = await Promise.all(
            property.images.slice(0, 10).map(async (imageUrl) => {
              try {
                const response = await fetch(
                  `https://graph.facebook.com/v18.0/${page.pageId}/photos`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      url: imageUrl,
                      published: false,
                      access_token: page.accessToken
                    })
                  }
                );

                if (!response.ok) {
                  const error = await response.json() as { error?: { message?: string } };
                  console.error('Facebook photo upload error:', error);
                  throw new Error(error.error?.message || 'Failed to upload photo to Facebook');
                }

                const data = await response.json() as { id: string };
                return { media_fbid: data.id };
              } catch (err) {
                console.error('Error uploading photo:', err);
                return null;
              }
            })
          );

          // Filter out any failed uploads
          const validPhotoIds = photoIds.filter(id => id !== null);

          // Create the post with attached photos
          const postResponse = await fetch(
            `https://graph.facebook.com/v18.0/${page.pageId}/feed`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: message,
                attached_media: validPhotoIds,
                access_token: page.accessToken
              })
            }
          );

          if (!postResponse.ok) {
            const error = await postResponse.json() as { error?: { message?: string } };
            throw new Error(error.error?.message || 'Failed to create Facebook post');
          }

          const postData = await postResponse.json() as { id: string };
          const postId = postData.id;

          return {
            success: true,
            listingUrl: `https://facebook.com/${postId}`
          };
        } catch (error) {
          console.error('Facebook API error:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown Facebook API error'
          };
        }
      } else if (platform === "instagram") {
        // Instagram would use FB Graph API differently, through connected Instagram account
        return {
          success: false,
          error: "Instagram publishing not implemented yet"
        };
      }

      return {
        success: false,
        error: `Unsupported social media platform: ${platform}`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to publish to ${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private generateSocialMediaCaption(property: Property, formattedPrice: string): string {
    // Generate a compelling social media caption
    const hashTags = '#RealEstate #Albania #Property #ForSale';

    let caption = `🏡 NEW LISTING: ${property.title}\n\n`;
    caption += `💰 ${formattedPrice}\n`;
    caption += `🛏️ ${property.bedrooms} bedrooms | 🚿 ${property.bathrooms} bathrooms | 📏 ${property.squareMeters}m²\n\n`;

    // Add location info
    caption += `📍 ${property.address}, ${property.city}`;
    if (property.state) caption += `, ${property.state}`;
    caption += `\n\n`;

    // Add a truncated description (Facebook has character limits)
    const maxDescriptionLength = 300;
    if (property.description && property.description.length > 0) {
      caption += property.description.length > maxDescriptionLength 
        ? property.description.substring(0, maxDescriptionLength) + '...' 
        : property.description;
      caption += '\n\n';
    }

    // Add call to action
    caption += '👉 Contact us for more information or to schedule a viewing!\n\n';

    // Add hashtags
    caption += hashTags;

    return caption;
  }
}

export const albanianListingService = new AlbanianListingService();