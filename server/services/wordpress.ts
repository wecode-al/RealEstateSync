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

interface WordPressConfig {
  username: string;
  password: string;
  apiUrl: string;
}

class WordPressService {
  private async getConfig(): Promise<WordPressConfig> {
    const settings = await storage.getSettings();
    const wpSettings = settings["WordPress Site"];

    if (!wpSettings?.enabled) {
      throw new Error("WordPress is not enabled in settings");
    }

    const config = wpSettings.additionalConfig as WordPressConfig;

    if (!config?.username || !config?.password || !config?.apiUrl) {
      throw new Error("WordPress credentials not fully configured. Please check username, password and API URL in settings.");
    }

    return config;
  }

  async publishProperty(property: Property): Promise<{ success: boolean; error?: string; postUrl?: string }> {
    try {
      const config = await this.getConfig();

      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      const baseUrl = new URL(config.apiUrl).origin;

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
    try {
      const config = await this.getConfig();
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      const baseUrl = new URL(config.apiUrl).origin;

      console.log(`Testing WordPress connection to: ${baseUrl}`);

      // First try to get WordPress info to verify base connectivity
      const infoResponse = await fetch(`${baseUrl}/wp-json`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (!infoResponse.ok) {
        const text = await infoResponse.text();
        console.error('WordPress Info Response:', infoResponse.status, text);
        throw new Error(`Could not connect to WordPress API: ${text}`);
      }

      // Then check if the property post type is available
      const response = await fetch(`${baseUrl}/wp-json/wp/v2/types`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      const responseText = await response.text();
      console.log('WordPress Types Response:', response.status, responseText);

      if (!response.ok) {
        throw new Error(`Failed to connect to WordPress: ${responseText}`);
      }

      const data = await response.json();
      if (!data) {
        throw new Error('No response from WordPress API');
      }

      // Check if property post type exists
      if (!data.property) {
        throw new Error('Property post type is not configured in WordPress. Please ensure the custom post type is set up correctly.');
      }

    } catch (error) {
      console.error('WordPress Connection Test Error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to connect to WordPress');
    }
  }
}

export const wordPressService = new WordPressService();