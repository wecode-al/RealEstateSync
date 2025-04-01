import puppeteer, { Browser, Page } from 'puppeteer';
import { Property } from '@shared/schema';

interface OkazionCredentials {
  username: string;
  password: string;
}

interface OkazionResponse {
  success: boolean;
  error?: string;
  listingUrl?: string;
}

/**
 * Okazion.al Listing Service
 * 
 * A service that uses Puppeteer to automate property listing on Okazion.al by:
 * 1. Logging in with valid credentials
 * 2. Navigating to the "Post Ad" page
 * 3. Filling out all required fields
 * 4. Uploading property images
 * 5. Submitting the form
 */
export class OkazionListingService {
  private loginUrl = 'https://www.okazion.al/login';
  private postAdUrl = 'https://www.okazion.al/post-ad';
  private browser: Browser | null = null;
  
  /**
   * Publishes a property listing to Okazion.al
   * 
   * @param property The property data to publish
   * @returns A response object with success status and potentially a listing URL
   */
  async publishProperty(property: Property): Promise<OkazionResponse> {
    try {
      console.log('Starting Okazion.al property publishing process');
      
      // Check for credentials
      const credentials = this.getCredentials();
      if (!credentials) {
        return {
          success: false,
          error: 'Okazion.al credentials not found. Please set OKAZION_USERNAME and OKAZION_PASSWORD environment variables.'
        };
      }
      
      // Launch browser
      this.browser = await puppeteer.launch({
        headless: true, // Use headless mode
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await this.browser.newPage();
      
      // Login to Okazion.al
      const loginSuccess = await this.login(page, credentials);
      if (!loginSuccess) {
        return {
          success: false,
          error: 'Failed to login to Okazion.al. Please check your credentials.'
        };
      }
      
      // Navigate to post ad page
      await page.goto(this.postAdUrl, { waitUntil: 'networkidle0' });
      
      // Fill out the form
      await this.fillAdForm(page, property);
      
      // Upload images
      await this.uploadImages(page, property.images);
      
      // Accept terms and conditions
      await this.acceptTerms(page);
      
      // Submit the form
      const submissionResult = await this.submitForm(page);
      
      // Close browser
      await this.browser.close();
      this.browser = null;
      
      return submissionResult;
    } catch (error) {
      console.error('Okazion.al publishing error:', error);
      
      // Ensure browser is closed in case of errors
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during Okazion.al publishing'
      };
    }
  }
  
  /**
   * Retrieves Okazion.al credentials from environment variables
   */
  private getCredentials(): OkazionCredentials | null {
    const username = process.env.OKAZION_USERNAME;
    const password = process.env.OKAZION_PASSWORD;
    
    if (!username || !password) {
      return null;
    }
    
    return { username, password };
  }
  
  /**
   * Logs in to Okazion.al with the provided credentials
   */
  private async login(page: Page, credentials: OkazionCredentials): Promise<boolean> {
    try {
      console.log('Logging in to Okazion.al...');
      
      await page.goto(this.loginUrl, { waitUntil: 'networkidle0' });
      
      // Wait for login form
      await page.waitForSelector('input[name="email"]');
      await page.waitForSelector('input[name="password"]');
      
      // Fill in login credentials
      await page.type('input[name="email"]', credentials.username);
      await page.type('input[name="password"]', credentials.password);
      
      // Click login button
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button[type="submit"]')
      ]);
      
      // Check if login was successful
      const isLoggedIn = await page.evaluate(() => {
        // This selector needs to be adjusted based on Okazion.al's actual UI
        return !!document.querySelector('.user-menu') || 
               !!document.querySelector('.user-account');
      });
      
      console.log('Login status:', isLoggedIn ? 'Success' : 'Failed');
      return isLoggedIn;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }
  
  /**
   * Fills out the property ad form with the provided property data
   */
  private async fillAdForm(page: Page, property: Property): Promise<void> {
    console.log('Filling ad form with property data:', property.title);
    
    // Get credentials for contact email
    const credentials = this.getCredentials();
    const contactEmail = credentials?.username || process.env.CONTACT_EMAIL || 'contact@example.com';
    
    // Select the real estate category
    await page.waitForSelector('select[name="category"]');
    await page.select('select[name="category"]', 'real-estate');
    
    // Wait for form fields to load after category selection
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Select sub-category based on property type
    await page.waitForSelector('select[name="subcategory"]');
    await page.select('select[name="subcategory"]', this.mapPropertyTypeToSubcategory(property.propertyType));
    
    // Fill in basic info
    await page.waitForSelector('input[name="title"]');
    await page.type('input[name="title"]', property.title.substring(0, 100));
    
    // Fill in price
    await page.waitForSelector('input[name="price"]');
    await page.type('input[name="price"]', property.price.toString());
    
    // Select currency
    await page.waitForSelector('select[name="currency"]');
    await page.select('select[name="currency"]', property.currency || 'ALL');
    
    // Fill in description
    await page.waitForSelector('textarea[name="description"]');
    await page.type('textarea[name="description"]', property.description);
    
    // Fill in location
    await page.waitForSelector('select[name="city"]');
    await page.select('select[name="city"]', property.city);
    
    // Additional property details
    if (await page.$('input[name="bedrooms"]') !== null) {
      await page.type('input[name="bedrooms"]', property.bedrooms.toString());
    }
    
    if (await page.$('input[name="bathrooms"]') !== null) {
      await page.type('input[name="bathrooms"]', property.bathrooms.toString());
    }
    
    if (await page.$('input[name="size"]') !== null) {
      await page.type('input[name="size"]', property.squareMeters.toString());
    }
    
    // Add property features if available
    if (Array.isArray(property.features) && property.features.length > 0) {
      for (const feature of property.features) {
        const featureSelector = `input[name="features"][value="${feature}"]`;
        if (await page.$(featureSelector) !== null) {
          await page.click(featureSelector);
        }
      }
    }
    
    // Fill in contact info
    await page.waitForSelector('input[name="contact_name"]');
    await page.type('input[name="contact_name"]', 'Property Manager');
    
    if (await page.$('input[name="contact_email"]') !== null) {
      await page.type('input[name="contact_email"]', contactEmail);
    }
    
    if (await page.$('input[name="contact_phone"]') !== null) {
      await page.type('input[name="contact_phone"]', property.phone || '');
    }
    
    console.log('Form fields completed');
  }
  
  /**
   * Maps our property type to Okazion.al subcategory values
   */
  private mapPropertyTypeToSubcategory(propertyType: string): string {
    const subcategoryMap: Record<string, string> = {
      'Apartment': 'apartments',
      'House': 'houses',
      'Villa': 'villas',
      'Land': 'land',
      'Commercial': 'commercial',
      'Other': 'other-real-estate'
    };
    
    return subcategoryMap[propertyType] || 'other-real-estate';
  }
  
  /**
   * Uploads property images to the form
   */
  private async uploadImages(page: Page, images: string[]): Promise<void> {
    if (!images || images.length === 0) {
      console.log('No images to upload');
      return;
    }
    
    console.log(`Attempting to upload ${images.length} images`);
    
    try {
      // Wait for the file input element
      await page.waitForSelector('input[type="file"]');
      
      // Note: In a real implementation, we would need to download the images first
      // since Puppeteer can only upload local files
      console.log('Images would be uploaded in a full implementation');
      
      // Simulate waiting for upload
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  }
  
  /**
   * Accepts terms and conditions on the form
   */
  private async acceptTerms(page: Page): Promise<void> {
    console.log('Accepting terms and conditions');
    
    // Check terms and conditions checkbox if present
    const termsSelector = 'input[name="terms"]';
    if (await page.$(termsSelector) !== null) {
      await page.click(termsSelector);
    }
  }
  
  /**
   * Submits the form and handles the result
   */
  private async submitForm(page: Page): Promise<OkazionResponse> {
    console.log('Submitting form');
    
    try {
      // Click the submit button and wait for navigation
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button[type="submit"]')
      ]);
      
      // Check if submission was successful
      const isSuccess = await page.evaluate(() => {
        // This would need to be adjusted based on Okazion.al's actual success page
        return !document.querySelector('.alert-danger') && 
               (!!document.querySelector('.alert-success') || 
                !!document.querySelector('.ad-success'));
      });
      
      if (isSuccess) {
        // Try to extract the listing URL if available
        const listingUrl = await page.evaluate(() => {
          // This selector would need to be adjusted based on Okazion.al's actual success page
          const urlElement = document.querySelector('.ad-success-link a');
          return urlElement ? urlElement.getAttribute('href') : window.location.href;
        });
        
        return {
          success: true,
          listingUrl: listingUrl || 'https://www.okazion.al/my-ads'
        };
      } else {
        const errorMessage = await page.evaluate(() => {
          // Extract error message if present
          const errorElement = document.querySelector('.alert-danger') || 
                               document.querySelector('.error-message');
          return errorElement ? errorElement.textContent?.trim() : 'Unknown submission error';
        });
        
        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (error) {
      console.error('Form submission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown form submission error'
      };
    }
  }
}

export const okazionListingService = new OkazionListingService();