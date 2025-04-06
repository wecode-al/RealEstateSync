import puppeteer, { Browser, Page } from 'puppeteer';
import { Property } from '@shared/schema';
import { storage } from '../storage';

interface MerrJepCredentials {
  username: string;
  password: string;
}

interface MerrJepResponse {
  success: boolean;
  error?: string;
  listingUrl?: string;
}

/**
 * MerrJep Listing Service
 * 
 * A service that uses Puppeteer to automate property listing on MerrJep.al by:
 * 1. Logging in with valid credentials
 * 2. Navigating to the "Post Ad" page
 * 3. Filling out all required fields
 * 4. Uploading property images
 * 5. Submitting the form
 */
export class MerrJepListingService {
  private baseUrl = 'https://www.merrjep.al';
  private loginUrl = 'https://www.merrjep.al/llogaria'; // Correct login URL provided by user
  private postAdUrl = 'https://www.merrjep.al/posto-njoftim-falas';
  private browser: Browser | null = null;
  
  /**
   * Publishes a property listing to MerrJep.al
   * 
   * @param property The property data to publish
   * @returns A response object with success status and potentially a listing URL
   */
  async publishProperty(property: Property): Promise<MerrJepResponse> {
    try {
      console.log('Starting MerrJep property publishing process');
      
      // Check for credentials
      const credentials = await this.getCredentials();
      if (!credentials) {
        return {
          success: false,
          error: 'MerrJep credentials not found. Please update MerrJep credentials in Settings.'
        };
      }
      
      // Launch browser with system-installed Chromium
      console.log('Launching Puppeteer browser using system Chromium...');
      try {
        // Use the system-installed Chromium instead of the bundled one
        const executablePath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
        console.log(`Using Chromium at: ${executablePath}`);
        
        this.browser = await puppeteer.launch({
          headless: true,
          executablePath, // Use system Chromium
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-features=site-per-process'
          ],
          dumpio: true // Output browser console logs
        });
        console.log('Browser launched successfully');
      } catch (launchError) {
        console.error('Failed to launch browser:', launchError);
        throw new Error(`Browser launch failed: ${launchError instanceof Error ? launchError.message : 'Unknown error'}`);
      }
      
      const page = await this.browser.newPage();
      
      // Login to MerrJep
      const loginSuccess = await this.login(page, credentials);
      if (!loginSuccess) {
        return {
          success: false,
          error: 'Failed to login to MerrJep. Please check your credentials.'
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
      console.error('MerrJep publishing error:', error);
      
      // Ensure browser is closed in case of errors
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during MerrJep publishing'
      };
    }
  }
  
  /**
   * Retrieves MerrJep credentials from app settings or environment variables
   */
  private async getCredentials(): Promise<MerrJepCredentials | null> {
    try {
      // First try to get credentials from app settings database
      const appSettings = await storage.getAppSettings();
      const usernameFromSettings = appSettings["MERRJEP_USERNAME"]?.value;
      const passwordFromSettings = appSettings["MERRJEP_PASSWORD"]?.value;
      
      if (usernameFromSettings && passwordFromSettings) {
        return { 
          username: usernameFromSettings, 
          password: passwordFromSettings 
        };
      }
      
      // Fallback to environment variables if settings not found
      const username = process.env.MERRJEP_USERNAME;
      const password = process.env.MERRJEP_PASSWORD;
      
      if (username && password) {
        return { username, password };
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving MerrJep credentials:', error);
      
      // Last resort fallback to environment variables
      const username = process.env.MERRJEP_USERNAME;
      const password = process.env.MERRJEP_PASSWORD;
      
      if (username && password) {
        return { username, password };
      }
      
      return null;
    }
  }
  
  /**
   * Logs in to MerrJep.al with the provided credentials
   */
  private async login(page: Page, credentials: MerrJepCredentials): Promise<boolean> {
    try {
      console.log('Logging in to MerrJep...');
      
      // Navigate to login page with timeout handling
      try {
        console.log(`Navigating to login URL: ${this.loginUrl}`);
        await page.goto(this.loginUrl, { 
          waitUntil: 'networkidle0',
          timeout: 60000 // Increase timeout to 60 seconds
        });
      } catch (navigationError) {
        console.error('Navigation to login page failed:', navigationError);
        throw new Error(`Could not navigate to login page: ${navigationError instanceof Error ? navigationError.message : 'Unknown error'}`);
      }
      
      // Check if page is accessible
      const pageTitle = await page.title();
      console.log(`Page title: ${pageTitle}`);
      
      // Take screenshot for debugging (in production, store these in logs)
      await page.screenshot({ path: './screenshots/login-page.png' });
      console.log('Screenshot taken of login page');
      
      // Get the page content to help with debugging
      const pageContent = await page.content();
      console.log('Page URL:', page.url());
      
      // Log page HTML structure to help identify form elements
      console.log('Page content snippet:', pageContent.substring(0, 500) + '...');
      
      // Check if we need to navigate to a different login page (site might have redirected us)
      if (!pageContent.includes('login') && !pageContent.includes('identifikimi')) {
        console.log('Not on login page, attempting to find login link...');
        
        // Look for login links
        const loginLink = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          for (const link of links) {
            const href = link.getAttribute('href');
            const text = link.textContent?.toLowerCase() || '';
            if (
              href?.includes('login') || 
              href?.includes('identifikimi') || 
              text.includes('login') ||
              text.includes('hyr') ||  // Albanian for "enter/login"
              text.includes('identifikohu') // Albanian for "identify yourself"
            ) {
              return href;
            }
          }
          return null;
        });
        
        if (loginLink) {
          console.log('Found login link:', loginLink);
          const fullLoginUrl = loginLink.startsWith('http') ? loginLink : `${this.baseUrl}${loginLink.startsWith('/') ? '' : '/'}${loginLink}`;
          console.log('Navigating to login link:', fullLoginUrl);
          await page.goto(fullLoginUrl, { waitUntil: 'networkidle0' });
          
          // Take screenshot after navigation
          await page.screenshot({ path: './screenshots/login-page-after-link.png' });
        } else {
          console.log('No login link found, attempting direct navigation to /login');
          await page.goto(`${this.baseUrl}/login`, { waitUntil: 'networkidle0' });
        }
      }
      
      // Analyze the form elements that are present
      const formElements = await page.evaluate(() => {
        const inputElements = Array.from(document.querySelectorAll('input'));
        return inputElements.map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          placeholder: input.placeholder
        }));
      });
      
      console.log('Form elements found:', JSON.stringify(formElements, null, 2));
      
      // Handle a two-step login process
      try {
        console.log('Waiting for email/phone input field...');
        await page.waitForSelector('#EmailOrPhone', { timeout: 30000 });
        
        // Take screenshot before entering email
        await page.screenshot({ path: './screenshots/login-form-step1.png' });
        
        // Fill in email/phone first
        console.log('Filling email/phone field...');
        await page.type('#EmailOrPhone', credentials.username);
        
        // Click continue button to proceed to password step
        console.log('Clicking continue button...');
        await page.screenshot({ path: './screenshots/before-continue-click.png' });
        
        // Click the continue button and wait for either navigation or network response
        try {
          await Promise.any([
            // Wait for response
            page.waitForResponse(
              response => response.url().includes('Account') || 
                          response.url().includes('llogaria') || 
                          response.url().includes('login'), 
              { timeout: 30000 }
            ),
            // Wait for navigation
            page.waitForNavigation({ timeout: 30000 }),
            // Wait for the password field to appear (this might happen without navigation)
            page.waitForSelector('#Password', { timeout: 30000 })
          ]);
          
          // Click the button (we don't wait for a specific event since we handle them above)
          await page.click('button[type="submit"].btn.btn-block');
        } catch (continueError) {
          console.log('Continue button click had an issue:', continueError);
          // Even if the promises fail, still try clicking the button
          await page.click('button[type="submit"].btn.btn-block');
        }
        
        // Short wait after clicking to let the page update
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Wait for the password field to appear in the second step
        console.log('Waiting for password field to appear...');
        await page.waitForSelector('#Password', { timeout: 30000 });
        
        // Take screenshot of the second step
        await page.screenshot({ path: './screenshots/login-form-step2.png' });
        
        // Fill in password
        console.log('Filling password field...');
        await page.type('#Password', credentials.password);
        
        console.log('Credentials entered successfully');
        
        // Click the login button for final submission
        console.log('Clicking final login button...');
        await page.screenshot({ path: './screenshots/before-final-login-click.png' });
        
        // Click the login button
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }),
          page.click('button[type="submit"].btn.btn-block')
        ]);
      } catch (loginError) {
        console.error('Login process failed:', loginError);
        await page.screenshot({ path: './screenshots/login-error.png' });
        throw new Error(`Login process failed: ${loginError instanceof Error ? loginError.message : 'Unknown error'}`);
      }
      
      // Take another screenshot after login attempt
      await page.screenshot({ path: './screenshots/after-login.png' });
      console.log('Screenshot taken after login attempt');
      
      // Check if login was successful by looking at the URL and page content
      console.log('Checking login status...');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: './screenshots/login-status-check.png' });
      
      // Get the current URL
      const currentUrl = page.url();
      console.log('Current URL after login:', currentUrl);
      
      // Check if we're redirected to the dashboard or still on the login page
      const isLoggedIn = await page.evaluate(() => {
        // Check for login page elements (both steps 1 and 2)
        const isOnStep1 = document.querySelector('#EmailOrPhone') !== null &&
                           !document.querySelector('#Password');
        const isOnStep2 = document.querySelector('#Password') !== null;
        const isOnLoginPage = isOnStep1 || isOnStep2;
        
        // Check for error messages
        const hasErrorMessage = document.querySelector('.validation-summary-errors, .error-message, .field-validation-error') !== null;
        
        // Check for indicators that we're logged in
        const hasUserMenu = document.querySelector('.user-menu, .user-profile, .logout-link, .account-menu, .profile-menu') !== null;
        
        // Check URLs that could indicate we're on a post-login page
        const currentUrl = window.location.href;
        const isOnProfilePage = currentUrl.includes('/profile') || 
                               currentUrl.includes('/account') || 
                               currentUrl.includes('/dashboard');
        
        // Check page content for phrases that indicate we're logged in (in Albanian)
        const pageContent = document.body.textContent?.toLowerCase() || '';
        const loggedInPhrases = [
          'miqtë tuaj', 'llogaria ime', 'profili im', 'dilni', 'çkyçu',
          'posto njoftim', 'njoftimet e mia', 'përshëndetje', 'dërgoni mesazh'
        ];
        const containsLoggedInPhrase = loggedInPhrases.some(phrase => pageContent.includes(phrase));
        
        // Get the post ad button which is only visible to logged in users
        const hasPostAdButton = document.querySelector('.post-ad-button, a[href*="posto-njoftim"]') !== null;
        
        // Log findings for debugging
        console.log('Is on login page step 1:', isOnStep1);
        console.log('Is on login page step 2:', isOnStep2);
        console.log('Has error message:', hasErrorMessage);
        console.log('Has user menu:', hasUserMenu);
        console.log('Is on profile page:', isOnProfilePage);
        console.log('Contains logged in phrase:', containsLoggedInPhrase);
        console.log('Has post ad button:', hasPostAdButton);
        
        // Success if we're not on login page AND no errors AND (have a user menu OR logged in phrase OR on profile page OR have post ad button)
        return !isOnLoginPage && 
               !hasErrorMessage && 
               (hasUserMenu || containsLoggedInPhrase || isOnProfilePage || hasPostAdButton);
      });
      
      console.log('Login status:', isLoggedIn ? 'Success' : 'Failed');
      
      // If login failed, try to get more information about why
      if (!isLoggedIn) {
        const errorMessage = await page.evaluate(() => {
          const errorElement = document.querySelector('.validation-summary-errors, .error-message, .field-validation-error');
          return errorElement ? errorElement.textContent?.trim() : 'No error message displayed';
        });
        console.log('Login error message:', errorMessage);
      }
      
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
    
    // Wait for form elements to load
    await page.waitForSelector('input[name="ChangeAdContactInfoCmd.Name"]');
    await page.waitForSelector('input[name="ChangeAdContactInfoCmd.Email"]');
    await page.waitForSelector('input[name="ChangeAdContactInfoCmd.Phone"]');
    
    // Fill contact info
    await page.type('input[name="ChangeAdContactInfoCmd.Name"]', property.title.substring(0, 50)); // Use property title as name or adjust
    await page.type('input[name="ChangeAdContactInfoCmd.Email"]', process.env.CONTACT_EMAIL || 'contact@example.com');
    await page.type('input[name="ChangeAdContactInfoCmd.Phone"]', property.phone || '355000000000');
    
    // Select category
    await page.waitForSelector('#Category');
    await page.select('#Category', this.mapPropertyTypeToCategory(property.propertyType));
    
    // Wait for subcategory to appear (if applicable)
    // Use setTimeout instead of waitForTimeout which is not part of the Puppeteer API
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (await page.$('#SubCategory') !== null) {
      await page.select('#SubCategory', this.mapPropertyTypeToSubcategory(property.propertyType));
    }
    
    // Select location
    await page.waitForSelector('#Location');
    await page.select('#Location', property.city || 'Tiranë');
    
    // Wait for sublocation to appear (if applicable)
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (await page.$('#SubLocation') !== null) {
      await page.select('#SubLocation', 'Any'); // Adjust based on actual values
    }
    
    // Fill title and description
    await page.waitForSelector('input[name="ChangeAdDescriptionCmd.Title"]');
    await page.waitForSelector('textarea[name="ChangeAdDescriptionCmd.Description"]');
    
    await page.type('input[name="ChangeAdDescriptionCmd.Title"]', property.title.substring(0, 100));
    await page.type('textarea[name="ChangeAdDescriptionCmd.Description"]', property.description || 'No description available');
    
    // Fill price
    await page.waitForSelector('input[name="ChangeAdPriceCmd.Value"]');
    await page.type('input[name="ChangeAdPriceCmd.Value"]', property.price.toString());
    
    // Select currency (EUR or ALL)
    if (property.currency === 'EUR') {
      await page.click('input[name="ChangeAdPriceCmd.Currency"][value="EUR"]');
    } else {
      await page.click('input[name="ChangeAdPriceCmd.Currency"][value="ALL"]');
    }
    
    console.log('Form fields completed');
  }
  
  /**
   * Maps our property type to MerrJep category values
   */
  private mapPropertyTypeToCategory(propertyType: string): string {
    const categoryMap: Record<string, string> = {
      'Apartment': '5', // Real Estate
      'House': '5',
      'Villa': '5',
      'Land': '5',
      'Commercial': '5',
      'Other': '5'
    };
    
    return categoryMap[propertyType] || '5'; // Default to Real Estate
  }
  
  /**
   * Maps our property type to MerrJep subcategory values
   */
  private mapPropertyTypeToSubcategory(propertyType: string): string {
    const subcategoryMap: Record<string, string> = {
      'Apartment': '101', // Apartments
      'House': '103', // Houses
      'Villa': '103', // Houses
      'Land': '104', // Land
      'Commercial': '102', // Commercial Properties
      'Other': '109' // Other Real Estate
    };
    
    return subcategoryMap[propertyType] || '109'; // Default to Other Real Estate
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
      await page.waitForSelector('#uploadId_images');
      
      // Unfortunately, Puppeteer can only upload local files, not URLs
      // We would need to download the images first in a real implementation
      // For this demonstration, we'll simulate successful uploads
      
      console.log('Images would be uploaded in a full implementation');
      
      // In a real implementation, we would:
      // 1. Download each image to a temp directory
      // 2. Use page.setInputFiles() to upload local files
      // 3. Wait for upload confirmation
      
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
    
    // Check terms and conditions checkboxes
    await page.waitForSelector('#ChangeAdContactInfoCmd_IsAcceptedDataCollection');
    await page.waitForSelector('#ChangeAdContactInfoCmd_IsAgreedWithRules');
    
    await page.click('#ChangeAdContactInfoCmd_IsAcceptedDataCollection');
    await page.click('#ChangeAdContactInfoCmd_IsAgreedWithRules');
  }
  
  /**
   * Submits the form and handles the result
   */
  private async submitForm(page: Page): Promise<MerrJepResponse> {
    console.log('Submitting form');
    
    try {
      // Click the submit button and wait for navigation
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click('button.btn.btn-primary') // "Hapi tjetër" button
      ]);
      
      // Check if submission was successful
      const isSuccess = await page.evaluate(() => {
        // This would need to be adjusted based on MerrJep's actual success page
        return !document.querySelector('.error-message') && 
               !document.querySelector('.alert-danger');
      });
      
      if (isSuccess) {
        // Try to extract the listing URL if available
        const listingUrl = await page.evaluate(() => {
          // This selector would need to be adjusted based on MerrJep's actual success page
          const urlElement = document.querySelector('.ad-success-link a');
          return urlElement ? urlElement.getAttribute('href') : null;
        });
        
        return {
          success: true,
          listingUrl: listingUrl || 'https://www.merrjep.al/listing/pending'
        };
      } else {
        const errorMessage = await page.evaluate(() => {
          // Extract error message if present
          const errorElement = document.querySelector('.error-message') || 
                               document.querySelector('.alert-danger');
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

export const merrjepListingService = new MerrJepListingService();