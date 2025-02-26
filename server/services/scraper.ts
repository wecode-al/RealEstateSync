import { ScraperConfig, InsertProperty } from "@shared/schema";
import * as cheerio from "cheerio";
import fetch from "node-fetch";

export class WebScraper {
  constructor(private config: ScraperConfig) {}

  private async fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive'
      },
      timeout: 30000 // 30 seconds timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  private extractValue($: cheerio.CheerioAPI, selector: string): string {
    if (!selector) return '';
    try {
      const element = $(selector);
      return element.first().text().trim();
    } catch (error) {
      console.error(`Error extracting value for selector ${selector}:`, error);
      return '';
    }
  }

  private extractArray($: cheerio.CheerioAPI, selector: string): string[] {
    if (!selector) return [];
    try {
      return $(selector).map((_, el) => $(el).text().trim()).get();
    } catch (error) {
      console.error(`Error extracting array for selector ${selector}:`, error);
      return [];
    }
  }

  private extractImages($: cheerio.CheerioAPI, selector: string): string[] {
    if (!selector) return [];
    try {
      return $(selector).map((_, el) => $(el).attr('src')).get()
        .filter(src => src && src.length > 0);
    } catch (error) {
      console.error(`Error extracting images for selector ${selector}:`, error);
      return [];
    }
  }

  async scrapeProperty(url: string): Promise<Partial<InsertProperty>> {
    console.log(`Starting to scrape URL: ${url}`);
    console.log('Using config:', JSON.stringify(this.config, null, 2));

    try {
      const html = await this.fetchPage(url);
      const $ = cheerio.load(html);

      // Log the HTML structure for debugging
      console.log('Page HTML structure:', $.html().substring(0, 500) + '...');

      const rawData: Record<string, any> = {
        title: this.extractValue($, this.config.selectors.title),
        description: this.extractValue($, this.config.selectors.description),
        price: this.extractValue($, this.config.selectors.price),
        bedrooms: this.extractValue($, this.config.selectors.bedrooms),
        bathrooms: this.extractValue($, this.config.selectors.bathrooms),
        squareMeters: this.extractValue($, this.config.selectors.squareMeters),
        address: this.extractValue($, this.config.selectors.address),
        images: this.extractImages($, this.config.selectors.images),
        features: this.extractArray($, this.config.selectors.features),
      };

      console.log('Extracted raw data:', rawData);

      // Clean up numeric values
      if (rawData.price) rawData.price = rawData.price.replace(/[^0-9.]/g, '');
      if (rawData.bedrooms) rawData.bedrooms = parseInt(rawData.bedrooms) || 0;
      if (rawData.bathrooms) rawData.bathrooms = parseFloat(rawData.bathrooms) || 0;
      if (rawData.squareMeters) rawData.squareMeters = parseFloat(rawData.squareMeters) || 0;

      // Map the raw data to our property schema
      const mappedData: Partial<InsertProperty> = {};
      for (const [sourceField, targetField] of Object.entries(this.config.fieldMapping)) {
        if (rawData[sourceField] !== undefined) {
          mappedData[targetField as keyof InsertProperty] = rawData[sourceField];
        }
      }

      console.log('Mapped data:', mappedData);
      return mappedData;

    } catch (error) {
      console.error('Scraping error:', error);
      throw new Error(`Failed to scrape property: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}