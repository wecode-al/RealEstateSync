import { type Property } from "@shared/schema";
import { storage } from "../storage";

interface WordPressResponse {
  id: number;
  link: string;
}

interface WordPressError {
  code: string;
  message: string;
  data?: {
    status: number;
  };
}

interface WordPressConfig {
  username: string;
  password: string;
  apiUrl: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

class WordPressService {
  private async getConfig(): Promise<WordPressConfig> {
    const settings = await storage.getSettings();
    const wpSettings = settings["WordPress Site"];

    if (!wpSettings) {
      throw new Error("WordPress settings not found. Please configure WordPress in settings first.");
    }

    if (!wpSettings.enabled) {
      throw new Error("WordPress is not enabled. Please enable WordPress in settings first.");
    }

    const config = wpSettings.additionalConfig as WordPressConfig;

    if (!config?.username || !config?.password || !config?.apiUrl) {
      throw new Error("WordPress credentials not fully configured. Please check username, password and API URL in settings.");
    }

    // Ensure apiUrl is properly formatted
    if (!config.apiUrl.startsWith('http')) {
      config.apiUrl = `https://${config.apiUrl}`;
    }

    // Remove trailing slashes
    config.apiUrl = config.apiUrl.replace(/\/+$/, '');

    return config;
  }

  private async makeRequest(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // Handle maintenance mode specifically
      if (response.status === 503) {
        if (retries > 0) {
          console.log(`WordPress site in maintenance mode, retrying in ${RETRY_DELAY}ms... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return this.makeRequest(url, options, retries - 1);
        } else {
          throw new Error("WordPress site is temporarily under maintenance. Please try again in a few minutes.");
        }
      }

      return response;
    } catch (error) {
      if (error instanceof Error) {
        // Handle network errors
        if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
          if (retries > 0) {
            console.log(`Connection failed, retrying in ${RETRY_DELAY}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return this.makeRequest(url, options, retries - 1);
          }
        }
      }
      throw error;
    }
  }

  async publishProperty(property: Property): Promise<{ success: boolean; error?: string; postUrl?: string }> {
    try {
      const config = await this.getConfig();
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      const baseUrl = config.apiUrl;

      console.log(`Publishing to WordPress: ${baseUrl}/wp-json/wp/v2/properties`);

      const postData = {
        title: property.title,
        content: property.description,
        status: 'publish',
        meta: {
          property_price: property.price,
          property_bedrooms: property.bedrooms,
          property_bathrooms: property.bathrooms,
          property_square_meters: property.squareMeters,
          property_address: property.address,
          property_city: property.city,
          property_state: property.state,
          property_zip: property.zipCode,
          property_type: property.propertyType,
          property_features: property.features,
          property_images: property.images
        }
      };

      const response = await this.makeRequest(
        `${baseUrl}/wp-json/wp/v2/properties`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData),
        }
      );

      const responseText = await response.text();
      console.log('WordPress API Response:', response.status, responseText);

      if (!response.ok) {
        let error: WordPressError;
        try {
          error = JSON.parse(responseText);
        } catch {
          error = { 
            code: 'unknown', 
            message: responseText,
            data: { status: response.status }
          };
        }

        const errorMessage = this.getReadableError(error);
        console.error('WordPress API Error:', error);
        return { success: false, error: errorMessage };
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

  private getReadableError(error: WordPressError): string {
    // Convert WordPress API errors into user-friendly messages
    if (error.data?.status === 503) {
      return "WordPress site is temporarily under maintenance. Please try again in a few minutes.";
    }

    switch (error.code) {
      case 'rest_no_route':
        return "The WordPress Properties plugin is not properly configured. Please ensure it's installed and activated.";
      case 'rest_cannot_create':
        return "You don't have permission to create properties. Please check your WordPress user permissions.";
      case 'rest_post_invalid_id':
        return "Failed to create the property listing. Please check your WordPress configuration.";
      default:
        return error.message || "An unknown error occurred while publishing to WordPress";
    }
  }

  async testConnection(): Promise<void> {
    try {
      const config = await this.getConfig();
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      const baseUrl = config.apiUrl;

      console.log(`Testing WordPress connection to: ${baseUrl}`);

      // First try to get WordPress info to verify base connectivity
      const infoResponse = await this.makeRequest(
        `${baseUrl}/wp-json`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        }
      );

      const infoText = await infoResponse.text();
      console.log('WordPress Info Response:', {
        status: infoResponse.status,
        statusText: infoResponse.statusText,
        headers: Object.fromEntries(infoResponse.headers),
        body: infoText
      });

      if (!infoResponse.ok) {
        throw new Error(this.getReadableError({
          code: 'connection_failed',
          message: infoText,
          data: { status: infoResponse.status }
        }));
      }

      let infoData;
      try {
        infoData = JSON.parse(infoText);
      } catch (e) {
        throw new Error(`Invalid response from WordPress: ${infoText}`);
      }

      if (!infoData || !infoData.namespaces || !infoData.namespaces.includes('wp/v2')) {
        throw new Error('Not a valid WordPress REST API endpoint. Please check your API URL.');
      }

      // Test property post type endpoint
      const typesResponse = await this.makeRequest(
        `${baseUrl}/wp-json/wp/v2/types`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!typesResponse.ok) {
        throw new Error(this.getReadableError({
          code: 'post_types_failed',
          message: await typesResponse.text(),
          data: { status: typesResponse.status }
        }));
      }

      const typesData = await typesResponse.json();

      // Check if property post type exists
      if (!typesData.properties) {
        throw new Error('Property post type is not configured in WordPress. Please ensure the Real Estate plugin is installed and activated.');
      }

    } catch (error) {
      console.error('WordPress Connection Test Error:', error);
      throw error instanceof Error ? error : new Error('Unknown error during WordPress connection test');
    }
  }
}

export const wordPressService = new WordPressService();