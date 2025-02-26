import { type Property } from "@shared/schema";

interface WordPressResponse {
  id: number;
  link: string;
}

interface WordPressError {
  code: string;
  message: string;
  data?: { status: number };
}

export class WordPressService {
  private apiUrl: string;
  private auth: string;

  constructor() {
    const username = process.env.WORDPRESS_USERNAME;
    const password = process.env.WORDPRESS_APP_PASSWORD;
    const apiUrl = process.env.WORDPRESS_API_URL;

    if (!username || !password || !apiUrl) {
      throw new Error("WordPress credentials not configured");
    }

    // Validate and format the API URL
    try {
      const url = new URL(apiUrl);
      if (!url.protocol) {
        throw new Error("WordPress API URL must include http:// or https://");
      }
      this.apiUrl = url.origin;
    } catch (error) {
      throw new Error(`Invalid WordPress API URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    this.auth = Buffer.from(`${username}:${password}`).toString('base64');
  }

  async publishProperty(property: Property): Promise<{ success: boolean; error?: string; postUrl?: string }> {
    try {
      console.log(`Publishing to WordPress: ${this.apiUrl}/wp-json/wp/v2/property`);

      // First, create the property post
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

      // Create the property post
      const response = await fetch(`${this.apiUrl}/wp-json/wp/v2/property`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.auth}`,
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
}

export const wordPressService = new WordPressService();