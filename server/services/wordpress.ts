
import { type Property } from "@shared/schema";
import { storage } from "../storage";

interface WordPressResponse {
  id: number;
  link: string;
}

interface WordPressError {
  code: string;
  message: string;
}

class WordPressService {
  async publishProperty(property: Property): Promise<{ success: boolean; error?: string; postUrl?: string }> {
    try {
      const settings = await storage.getSettings();
      const wpSettings = settings["WordPress Site"];

      if (!wpSettings?.enabled || !wpSettings.additionalConfig) {
        return {
          success: false,
          error: "WordPress is not configured in settings"
        };
      }

      const { username, password, apiUrl } = wpSettings.additionalConfig;

      if (!username || !password || !apiUrl) {
        return {
          success: false,
          error: "WordPress credentials not configured"
        };
      }

      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      const baseUrl = new URL(apiUrl).origin;

      console.log(`Publishing to WordPress: ${baseUrl}/wp-json/wp/v2/property`);

      const postData = {
        title: property.title,
        content: property.description,
        status: 'publish',
        meta: {
          property_price: property.price,
          property_bedrooms: property.bedrooms,
          property_bathrooms: property.bathrooms,
          property_sqft: property.sqft,
          property_address: property.address,
          property_city: property.city,
          property_state: property.state,
          property_zip: property.zipCode,
          property_type: property.propertyType,
          property_features: property.features,
          property_images: property.images
        }
      };

      console.log('Sending data to WordPress:', postData);

      const response = await fetch(`${baseUrl}/wp-json/wp/v2/property`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      const responseText = await response.text();
      console.log('WordPress API Response:', response.status, responseText);

      if (!response.ok) {
        let error: WordPressError;
        try {
          error = JSON.parse(responseText);
        } catch {
          error = { code: 'unknown', message: responseText };
        }
        console.error('WordPress API Error:', error);
        return { 
          success: false, 
          error: error.message || `Failed to publish: ${response.statusText}` 
        };
      }

      const data: WordPressResponse = JSON.parse(responseText);
      console.log('WordPress API Success:', data);
      return { 
        success: true,
        postUrl: data.link
      };

    } catch (error) {
      console.error('WordPress Publishing Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to publish to WordPress' 
      };
    }
  }

  async testConnection(): Promise<void> {
    const settings = await storage.getSettings();
    const wpSettings = settings["WordPress Site"];

    if (!wpSettings?.enabled || !wpSettings.additionalConfig) {
      throw new Error("WordPress is not configured in settings");
    }

    const { username, password, apiUrl } = wpSettings.additionalConfig;

    if (!username || !password || !apiUrl) {
      throw new Error("WordPress credentials not configured");
    }

    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const baseUrl = new URL(apiUrl).origin;

    const response = await fetch(`${baseUrl}/wp-json/wp/v2/types/property`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to connect to WordPress: ${response.statusText}`);
    }
  }
}

export const wordPressService = new WordPressService();
