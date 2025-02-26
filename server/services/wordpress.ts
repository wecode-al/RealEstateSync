import { type Property } from "@shared/schema";

interface WordPressResponse {
  id: number;
  link: string;
}

interface WordPressError {
  code: string;
  message: string;
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

    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.auth = Buffer.from(`${username}:${password}`).toString('base64');
  }

  async publishProperty(property: Property): Promise<{ success: boolean; error?: string }> {
    try {
      const endpoint = `${this.apiUrl}/wp-json/wp/v2/posts`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: property.title,
          content: this.formatContent(property),
          status: 'publish',
        }),
      });

      if (!response.ok) {
        const error: WordPressError = await response.json();
        return { 
          success: false, 
          error: error.message || `Failed to publish: ${response.statusText}` 
        };
      }

      const data: WordPressResponse = await response.json();
      return { success: true };
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to publish to WordPress' 
      };
    }
  }

  private formatContent(property: Property): string {
    return `
<!-- wp:paragraph -->
<p>${property.description}</p>
<!-- /wp:paragraph -->

<!-- wp:heading -->
<h2>Property Details</h2>
<!-- /wp:heading -->

<!-- wp:list -->
<ul>
  <li>Price: $${property.price.toLocaleString()}</li>
  <li>Bedrooms: ${property.bedrooms}</li>
  <li>Bathrooms: ${property.bathrooms}</li>
  <li>Square Feet: ${property.sqft}</li>
  <li>Property Type: ${property.propertyType}</li>
  <li>Location: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}</li>
</ul>
<!-- /wp:list -->

${property.features.length > 0 ? `
<!-- wp:heading -->
<h2>Features</h2>
<!-- /wp:heading -->

<!-- wp:list -->
<ul>
  ${property.features.map(feature => `<li>${feature}</li>`).join('\n')}
</ul>
<!-- /wp:list -->
` : ''}

${property.images.length > 0 ? `
<!-- wp:gallery {"linkTo":"none"} -->
<figure class="wp-block-gallery has-nested-images">
  ${property.images.map(image => `
  <!-- wp:image {"sizeSlug":"large"} -->
  <figure class="wp-block-image size-large"><img src="${image}" alt="${property.title}"/></figure>
  <!-- /wp:image -->
  `).join('\n')}
</figure>
<!-- /wp:gallery -->
` : ''}
`;
  }
}

export const wordPressService = new WordPressService();
