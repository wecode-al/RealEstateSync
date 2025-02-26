import { ScraperConfig, InsertProperty } from "@shared/schema";
import * as cheerio from "cheerio";
import fetch from "node-fetch";

export class WebScraper {
  constructor(private config: ScraperConfig) {}

  private async fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }

    return await response.text();
  }

  private extractValue($: cheerio.CheerioAPI, selector: string): string {
    const element = $(selector);
    return element.text().trim();
  }

  private extractArray($: cheerio.CheerioAPI, selector: string): string[] {
    return $(selector).map((_, el) => $(el).text().trim()).get();
  }

  private extractImages($: cheerio.CheerioAPI, selector: string): string[] {
    return $(selector).map((_, el) => $(el).attr('src')).get();
  }

  async scrapeProperty(url: string): Promise<Partial<InsertProperty>> {
    const html = await this.fetchPage(url);
    const $ = cheerio.load(html);

    // Type assertion to ensure selectors is treated as an object with string values
    const selectors = this.config.selectors as Record<string, string>;

    const rawData: Record<string, any> = {
      title: this.extractValue($, selectors.title),
      description: this.extractValue($, selectors.description),
      price: this.extractValue($, selectors.price).replace(/[^0-9.]/g, ''),
      bedrooms: parseInt(this.extractValue($, selectors.bedrooms)),
      bathrooms: parseFloat(this.extractValue($, selectors.bathrooms)),
      squareMeters: parseFloat(this.extractValue($, selectors.squareMeters)),
      address: this.extractValue($, selectors.address),
      images: this.extractImages($, selectors.images),
      features: this.extractArray($, selectors.features),
    };

    // Type assertion for field mapping
    const fieldMapping = this.config.fieldMapping as Record<string, keyof InsertProperty>;

    // Map the raw data to our property schema using the field mapping
    const mappedData: Partial<InsertProperty> = {};
    for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
      if (rawData[sourceField] !== undefined) {
        mappedData[targetField] = rawData[sourceField];
      }
    }

    return mappedData;
  }
}