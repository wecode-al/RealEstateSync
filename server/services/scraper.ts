import { ScraperConfig, InsertProperty } from "@shared/schema";
import * as cheerio from "cheerio";
import fetch from "node-fetch";

export class WebScraper {
  constructor(private config: ScraperConfig) {}

  private async fetchPage(url: string): Promise<string> {
    try {
      console.log('Attempting to fetch URL:', url);

      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, 30000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        }
      }).finally(() => {
        clearTimeout(timeout);
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      console.log('Successfully fetched page, content length:', html.length);
      return html;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 30 seconds');
      }
      throw error;
    }
  }

  private extractValue($: cheerio.CheerioAPI, selector: string): string {
    if (!selector) return '';
    try {
      const elements = $(selector);
      if (elements.length === 0) {
        console.log(`No elements found for selector: ${selector}`);
        return '';
      }
      const value = elements.first().text().trim();
      console.log(`Found value for ${selector}:`, value);
      return value;
    } catch (error) {
      console.error(`Error extracting value for selector ${selector}:`, error);
      return '';
    }
  }

  private extractImages($: cheerio.CheerioAPI, selector: string): string[] {
    if (!selector) return [];
    try {
      const images = $(selector)
        .map((_, el) => $(el).attr('src') || $(el).attr('data-src'))
        .get()
        .filter(src => src && src.length > 0);
      console.log(`Found ${images.length} images for selector ${selector}`);
      return images;
    } catch (error) {
      console.error(`Error extracting images for selector ${selector}:`, error);
      return [];
    }
  }

  private extractArray($: cheerio.CheerioAPI, selector: string): string[] {
    if (!selector) return [];
    try {
      const items = $(selector)
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(text => text.length > 0);
      console.log(`Found ${items.length} items for selector ${selector}`);
      return items;
    } catch (error) {
      console.error(`Error extracting array for selector ${selector}:`, error);
      return [];
    }
  }

  async scrapeProperty(url: string): Promise<Partial<InsertProperty>> {
    console.log('Starting to scrape URL:', url);
    console.log('Using config:', JSON.stringify(this.config, null, 2));

    try {
      const html = await this.fetchPage(url);
      if (!html) {
        throw new Error('Failed to fetch page content');
      }

      const $ = cheerio.load(html);
      console.log('Successfully loaded HTML');

      // Extract and clean data
      const rawData: Record<string, any> = {
        title: this.extractValue($, this.config.selectors.title),
        description: this.extractValue($, this.config.selectors.description),
        price: this.extractValue($, this.config.selectors.price),
        bedrooms: this.extractValue($, this.config.selectors.bedrooms),
        bathrooms: this.extractValue($, this.config.selectors.bathrooms),
        squareMeters: this.extractValue($, this.config.selectors.squareMeters),
        address: this.extractValue($, this.config.selectors.address),
        images: this.extractImages($, this.config.selectors.images),
        features: this.extractArray($, this.config.selectors.features)
      };

      // Clean numeric values
      const cleanData = {
        ...rawData,
        price: rawData.price ? rawData.price.replace(/[^0-9.]/g, '') : '0',
        bedrooms: rawData.bedrooms ? parseInt(rawData.bedrooms) || 0 : 0,
        bathrooms: rawData.bathrooms ? parseFloat(rawData.bathrooms) || 0 : 0,
        squareMeters: rawData.squareMeters ? parseFloat(rawData.squareMeters) || 0 : 0
      };

      console.log('Extracted and cleaned data:', cleanData);

      // Map the data to our schema
      const mappedData: Partial<InsertProperty> = {};
      for (const [key, value] of Object.entries(cleanData)) {
        if (value !== undefined && value !== '') {
          mappedData[key as keyof InsertProperty] = value;
        }
      }

      console.log('Final mapped data:', mappedData);
      return mappedData;
    } catch (error) {
      console.error('Scraping error:', error);
      throw new Error(`Failed to scrape property: ${error.message}`);
    }
  }
}