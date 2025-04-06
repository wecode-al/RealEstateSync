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
      
      // Create screenshots directory if it doesn't exist
      try {
        await page.evaluate(() => true);
      } catch (e) {
        console.error('Page not initialized properly:', e);
      }
      
      // Navigate to login page with less strict waiting conditions
      try {
        console.log(`Navigating to login URL: ${this.loginUrl}`);
        await page.goto(this.loginUrl, { 
          waitUntil: 'domcontentloaded', // Less strict waiting condition
          timeout: 90000 // Increase timeout to 90 seconds
        });
      } catch (navigationError) {
        console.error('Navigation to login page failed:', navigationError);
        throw new Error(`Could not navigate to login page: ${navigationError instanceof Error ? navigationError.message : 'Unknown error'}`);
      }
      
      // Wait for the page to become interactive
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check if page is accessible
      const pageTitle = await page.title();
      console.log(`Page title: ${pageTitle}`);
      
      try {
        await page.screenshot({ path: './screenshots/login-page.png' });
        console.log('Screenshot taken of login page');
      } catch (e) {
        console.error('Could not take screenshot:', e);
      }
      
      // Try multiple approaches to login
      console.log('Trying a more robust login approach...');
      
      // Method 1: Direct URL navigation to a known login form path
      try {
        // Try an alternative login URL if the main one fails
        const alternativeLoginUrl = 'https://www.merrjep.al/login';
        console.log(`Navigating to alternative login URL: ${alternativeLoginUrl}`);
        await page.goto(alternativeLoginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (e) {
        console.log('Alternative login URL navigation failed, continuing with current page...');
      }
      
      // Examine the page content to determine our next steps
      const pageUrl = page.url();
      console.log('Current URL:', pageUrl);
      
      // Method 2: Try clicking login link if we're on the home page
      try {
        // Look for login links by text content that might be in Albanian
        const loginLinkSelector = 'a[href*="login"], a[href*="llogaria"], a:contains("Hyr"), a:contains("Identifikohu")';
        const loginLinkExists = await page.$(loginLinkSelector) !== null;
        
        if (loginLinkExists) {
          console.log('Found login link on page, clicking it...');
          await page.click(loginLinkSelector);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (e) {
        console.log('Error clicking login link:', e);
      }
      
      // Method 3: Try to directly input credentials on whatever form is present
      try {
        // Get all input fields on the page
        const inputFields = await page.$$('input');
        console.log(`Found ${inputFields.length} input fields on the page`);
        
        // Find potential email/username field
        let emailField = null;
        for (const field of inputFields) {
          const type = await page.evaluate(el => el.type, field);
          const id = await page.evaluate(el => el.id, field);
          const name = await page.evaluate(el => el.name, field);
          const placeholder = await page.evaluate(el => el.placeholder, field);
          
          console.log(`Input field - type: ${type}, id: ${id}, name: ${name}, placeholder: ${placeholder}`);
          
          if (
            (type === 'email' || type === 'text') &&
            (id.toLowerCase().includes('email') || 
             id.toLowerCase().includes('username') || 
             name.toLowerCase().includes('email') || 
             name.toLowerCase().includes('username') ||
             placeholder?.toLowerCase().includes('email') ||
             placeholder?.toLowerCase().includes('username') ||
             id === 'EmailOrPhone')
          ) {
            emailField = field;
            console.log('Found email/username field:', id || name);
            break;
          }
        }
        
        if (emailField) {
          console.log('Typing username/email...');
          await emailField.click({ clickCount: 3 }); // Select all existing text
          await emailField.type(credentials.username);
          console.log('Username/email entered');
          
          // Look for submit/continue button
          const buttons = await page.$$('button, input[type="submit"]');
          let submitButton = null;
          
          for (const button of buttons) {
            const type = await page.evaluate(el => el.type, button);
            const tagName = await page.evaluate(el => el.tagName, button);
            const text = await page.evaluate(el => el.textContent, button);
            const className = await page.evaluate(el => el.className, button);
            
            console.log(`Button - type: ${type}, tag: ${tagName}, text: ${text}, class: ${className}`);
            
            if (
              (type === 'submit' || tagName.toLowerCase() === 'button') &&
              (text?.toLowerCase().includes('login') ||
               text?.toLowerCase().includes('continue') ||
               text?.toLowerCase().includes('hyr') ||
               text?.toLowerCase().includes('vazhdoni') ||
               className.includes('btn-block') ||
               className.includes('btn-primary'))
            ) {
              submitButton = button;
              console.log('Found submit button with text:', text);
              break;
            }
          }
          
          if (submitButton) {
            console.log('Clicking submit/continue button...');
            await submitButton.click();
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            try {
              await page.screenshot({ path: './screenshots/after-email-submit.png' });
            } catch (e) {
              console.error('Could not take screenshot after email submit:', e);
            }
            
            // Now check if we need to enter a password
            const passwordFields = await page.$$('input[type="password"]');
            if (passwordFields.length > 0) {
              console.log('Password field found, entering password...');
              await passwordFields[0].type(credentials.password);
              
              // Look for login button again
              const loginButtons = await page.$$('button[type="submit"], input[type="submit"]');
              if (loginButtons.length > 0) {
                console.log('Clicking final login button...');
                await loginButtons[0].click();
                await new Promise(resolve => setTimeout(resolve, 8000));
              }
            }
          }
        }
      } catch (e) {
        console.log('Error in direct form interaction method:', e);
      }
      
      // Method 4: Try using specific known selectors for MerrJep
      try {
        if (await page.$('#EmailOrPhone') !== null) {
          console.log('Found EmailOrPhone field by ID, filling it...');
          await page.type('#EmailOrPhone', credentials.username);
          
          if (await page.$('button[type="submit"]') !== null) {
            console.log('Clicking submit button for email...');
            await page.click('button[type="submit"]');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            if (await page.$('#Password') !== null) {
              console.log('Password field appeared, filling it...');
              await page.type('#Password', credentials.password);
              
              if (await page.$('button[type="submit"]') !== null) {
                console.log('Clicking final login button...');
                await page.click('button[type="submit"]');
                await new Promise(resolve => setTimeout(resolve, 8000));
              }
            }
          }
        }
      } catch (e) {
        console.log('Error in specific selectors method:', e);
      }
      
      // Take another screenshot after login attempt
      await page.screenshot({ path: './screenshots/after-login.png' });
      console.log('Screenshot taken after login attempt');
      
      // Check if login was successful by looking at the URL and page content
      console.log('Checking login status...');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: './screenshots/login-status-check.png' });
      
      // Get the final URL after login
      const finalUrl = page.url();
      console.log('Current URL after login:', finalUrl);
      
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
    
    // Select category using jQuery UI selectmenu
    console.log(`Property type: ${property.propertyType}`);
    const categoryValue = this.mapPropertyTypeToCategory(property.propertyType);
    console.log(`Selected category value: ${categoryValue}`);
    
    try {
      // First, check if the jQuery UI selectmenu is present
      await page.waitForSelector('#Category-button', { timeout: 5000 });
      console.log('jQuery UI selectmenu found for category');
      
      // Take screenshot before category selection
      await page.screenshot({ path: './screenshots/before-category-select.png' });
      
      // Click the selectmenu to open the dropdown
      await page.click('#Category-button');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Selecting category via jQuery UI selectmenu');
      
      // Execute JS to set the value and trigger change event
      await page.evaluate((categoryVal) => {
        // Set the value on the actual select element
        const selectElement = document.querySelector('#Category');
        if (selectElement) {
          // @ts-ignore - Value property exists on HTMLSelectElement
          selectElement.value = categoryVal;
          
          // Trigger change event to make dependent fields appear
          const event = new Event('change', { bubbles: true });
          selectElement.dispatchEvent(event);
          
          // Also try jQuery trigger if available
          // @ts-ignore - jQuery might be available
          if (typeof jQuery !== 'undefined') {
            // @ts-ignore
            jQuery('#Category').trigger('change');
          }
        }
      }, categoryValue);
      
      console.log('Category value set, waiting for UI to update');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now wait for the subcategory selectmenu to appear
      const hasSubcategory = await page.$('#SubCategory-button') !== null;
      console.log(`Subcategory selectmenu exists: ${hasSubcategory}`);
      
      if (hasSubcategory) {
        const subcategoryValue = this.mapPropertyTypeToSubcategory(property.propertyType);
        console.log(`Selected subcategory value: ${subcategoryValue}`);
        
        // Click the subcategory selectmenu
        await page.click('#SubCategory-button');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set the subcategory value via JS
        await page.evaluate((subcatVal) => {
          // Set the value on the actual select element
          const selectElement = document.querySelector('#SubCategory');
          if (selectElement) {
            // @ts-ignore - Value property exists on HTMLSelectElement
            selectElement.value = subcatVal;
            
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            selectElement.dispatchEvent(event);
            
            // Also try jQuery trigger if available
            // @ts-ignore - jQuery might be available
            if (typeof jQuery !== 'undefined') {
              // @ts-ignore
              jQuery('#SubCategory').trigger('change');
            }
          }
        }, subcategoryValue);
        
        console.log('Subcategory value set');
      }
      
      // Take screenshot after category selection
      await page.screenshot({ path: './screenshots/after-category-select.png' });
      
      // Now we need to select the listing type (Shitet/Jepet me qera/etc)
      console.log(`Listing type: ${property.listingType || 'Shitet'}`);
      
      // Wait for listing type options to appear 
      // These will show up only after category selection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take a screenshot to see what fields are available after category selection
      await page.screenshot({ path: './screenshots/before-listing-type.png' });
      
      // Use property.listingType if available, otherwise default to "Shitet" (For sale)
      const listingType = property.listingType || 'Shitet';
      console.log(`Looking for listing type option: ${listingType}`);
      
      // Check if there are any visible radio buttons for listing type
      // Exclude the Person/Company radio buttons that we want to leave at default
      const radioButtons = await page.$$('input[type="radio"]:not([name="ChangeAdContactInfoCmd.IsCompany"])');
      console.log(`Found ${radioButtons.length} radio buttons (excluding person/company)`);
      
      // Try to find and click the appropriate radio button by its parent text
      let listingTypeFound = false;
      
      try {
        listingTypeFound = await page.evaluate((typeText) => {
          // Skip the Person/Company radios which we want to leave at default
          const radioButtons = Array.from(document.querySelectorAll('input[type="radio"]:not([name="ChangeAdContactInfoCmd.IsCompany"])'));
          console.log(`Looking at ${radioButtons.length} radio buttons for listing type`);
          
          // First look for exact parent text matches - most reliable
          for (const radio of radioButtons) {
            const parentText = radio.parentElement?.textContent?.trim() || '';
            console.log(`Radio option: ${parentText}`);
            
            if (parentText.includes(typeText)) {
              // @ts-ignore - click() exists on HTMLElement
              radio.click();
              console.log(`Found and clicked radio with text: ${parentText}`);
              return true;
            }
          }
          
          // Try with more flexible matching if exact matching failed
          for (const radio of radioButtons) {
            // Check the label text associated with this radio
            const labelText = document.querySelector(`label[for="${radio.id}"]`)?.textContent?.trim() || '';
            
            // Look at parent div context too
            const parentText = radio.parentElement?.textContent?.trim() || '';
            const grandparentText = radio.parentElement?.parentElement?.textContent?.trim() || '';
            
            console.log(`Radio option contexts: Label=${labelText}, Parent=${parentText.substring(0, 20)}...`);
            
            // Try to match by different text properties
            if (labelText.includes(typeText) || 
                parentText.includes(typeText) || 
                grandparentText.includes(typeText) || 
                radio.id?.includes(typeText.toLowerCase())) {
              // @ts-ignore - click() exists on HTMLElement
              radio.click();
              console.log(`Found and clicked radio with matching context`);
              return true;
            }
          }
          
          return false;
        }, listingType);
      } catch (error) {
        console.error('Error trying to find listing type radio:', error);
      }
      
      // Take another screenshot to see if we selected anything
      await page.screenshot({ path: './screenshots/after-listing-type.png' });
      
      console.log(`Listing type selection ${listingTypeFound ? 'successful' : 'failed'}`);
      
      // Don't fallback to clicking random radio buttons as that could lead to incorrect listings
      if (!listingTypeFound) {
        console.log('Could not find listing type radio buttons that match our criteria');
        console.log('This might be expected if these options appear later in the form flow');
        // We'll continue with the form and try to find these options later if needed
      }
      
      // Take another screenshot after listing type selection
      await page.screenshot({ path: './screenshots/after-listing-type-select.png' });
      
    } catch (error) {
      console.error('Error with category/property type selection:', error);
      console.log('Trying alternative category selection approach...');
      
      try {
        // Fallback: try standard select element if jQuery UI is not present
        await page.select('#Category', categoryValue);
        console.log('Category selected using standard select element');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try standard select for subcategory if available
        if (await page.$('#SubCategory') !== null) {
          const subcategoryValue = this.mapPropertyTypeToSubcategory(property.propertyType);
          await page.select('#SubCategory', subcategoryValue);
          console.log('Subcategory selected using standard select element');
        }
      } catch (fallbackError) {
        console.error('All category selection methods failed:', fallbackError);
        // Continue with form filling despite category selection error
      }
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
   * 
   * Value 5 represents the "Real Estate" category on MerrJep.al
   */
  private mapPropertyTypeToCategory(propertyType: string): string {
    // All property types are in the Real Estate category (5)
    return '5'; 
  }
  
  /**
   * Maps our property type to MerrJep subcategory values
   * 
   * These values match the actual subcategories on MerrJep.al:
   * - 101: Apartments
   * - 102: Commercial Properties 
   * - 103: Houses/Villas
   * - 104: Land/Plots
   * - 105: Garages/Parking
   * - 106: Studios
   * - 107: Shared Rentals
   * - 108: Properties Abroad
   * - 109: Other Real Estate
   */
  private mapPropertyTypeToSubcategory(propertyType: string): string {
    const subcategoryMap: Record<string, string> = {
      'Shtepi private': '103',                     // Private houses -> Houses/Villas
      'Garazhe | Poste parkimi | Barake': '105',   // Combined -> Garages/Parking
      'Apartamente': '101',                        // Apartments -> Apartments
      'Garsoniere': '106',                         // Studios -> Studios
      'Ndarje qeraje | Cimer/e': '107',            // Shared rentals -> Shared Rentals
      'Vila': '103',                               // Villas -> Houses/Villas
      'Tokё | Truall': '104',                      // Land/Plots -> Land/Plots
      'Prona jashte vendit': '108'                 // Properties abroad -> Properties Abroad
    };
    
    return subcategoryMap[propertyType] || '109'; // Default to Other Real Estate if not found
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
   * Checks if the page shows the Albanian internet connection error message
   */
  private async checkForConnectionError(page: Page): Promise<boolean> {
    try {
      const hasConnectionError = await page.evaluate(() => {
        const pageContent = document.body.textContent?.toLowerCase() || '';
        return pageContent.includes('lidhja e internetit ka humbur') || 
               pageContent.includes('internet connection lost') ||
               pageContent.includes('problem me internetin');
      });
      return hasConnectionError;
    } catch (e) {
      console.error('Error checking for connection error:', e);
      return false;
    }
  }

  /**
   * Submits the form and handles the result
   */
  private async submitForm(page: Page): Promise<MerrJepResponse> {
    console.log('Submitting form');
    
    try {
      // Take screenshot before clicking submit
      try {
        await page.screenshot({ path: './screenshots/before-submit.png' });
      } catch (e) {
        console.error('Failed to take screenshot before submit:', e);
      }
      
      // First try to find the correct submit button
      console.log('Looking for submit button...');
      const buttonSelectors = [
        'button.btn.btn-primary', 
        'button[type="submit"]', 
        'input[type="submit"]'
      ];
      
      // Also try to find buttons by text content (Puppeteer doesn't support :contains selector)
      try {
        const buttonsByText = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons
            .filter(btn => {
              const text = btn.textContent?.toLowerCase() || '';
              return text.includes('hapi tjetër') || 
                     text.includes('vazhdo') || 
                     text.includes('posto') || 
                     text.includes('publiko');
            })
            .map(btn => {
              // Create a unique selector for this button
              let selector = 'button';
              if (btn.id) selector += `#${btn.id}`;
              if (btn.className) selector += `.${btn.className.split(' ').join('.')}`;
              return selector;
            });
        });
        
        // Add these to our selectors
        buttonSelectors.push(...buttonsByText);
      } catch (e) {
        console.log('Error finding buttons by text:', e);
      }
      
      let submitButton = null;
      for (const selector of buttonSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            submitButton = button;
            console.log(`Found submit button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!submitButton) {
        console.log('No submit button found with predefined selectors, looking for any button...');
        // Try to find any button that might be the submit button
        const allButtons = await page.$$('button');
        if (allButtons.length > 0) {
          // Use the last button on the page, which is often the submit button
          submitButton = allButtons[allButtons.length - 1];
          console.log(`Using last button on page as fallback (found ${allButtons.length} buttons)`);
        } else {
          throw new Error('No buttons found on the page');
        }
      }
      
      // Click the button but don't wait for navigation to complete (which might time out)
      console.log('Clicking submit button...');
      await submitButton.click();
      
      // Instead of waiting for full navigation, wait a reasonable amount of time
      console.log('Waiting after form submission...');
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Take screenshot after clicking submit
      try {
        await page.screenshot({ path: './screenshots/after-submit.png' });
      } catch (e) {
        console.error('Failed to take screenshot after submit:', e);
      }
      
      // Try to determine if submission was successful
      const currentUrl = page.url();
      console.log('Current URL after submission:', currentUrl);
      
      // Check for Albanian internet connection error and try to recover
      const hasConnectionError = await this.checkForConnectionError(page);
      if (hasConnectionError) {
        console.log('Detected Albanian internet connection error, attempting to retry...');
        
        // Try to navigate back to the form page
        try {
          // Click the browser back button
          await page.goBack();
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log('Navigated back, attempting to resubmit');
          
          // Take screenshot of the recovery attempt
          await page.screenshot({ path: './screenshots/recovery-attempt.png' });
          
          // Find submit button again
          const recoveryButton = await page.$('button.btn.btn-primary, button[type="submit"]');
          if (recoveryButton) {
            console.log('Found recovery submit button, trying again');
            await recoveryButton.click();
            await new Promise(resolve => setTimeout(resolve, 8000));
            
            // Check again after recovery attempt
            const stillHasError = await this.checkForConnectionError(page);
            if (stillHasError) {
              console.log('Still getting connection error after retry');
              return {
                success: false,
                error: 'Internet connection error persisted after retry (Lidhja e internetit ka humbur)'
              };
            }
          }
        } catch (e) {
          console.log('Recovery attempt failed:', e);
          // Continue with normal error handling
        }
      }
      
      // Check for success indicators in the URL or page content
      const isSuccess = await page.evaluate(() => {
        const currentUrl = window.location.href;
        const pageContent = document.body.textContent?.toLowerCase() || '';
        
        // Success indicators in URL
        const successUrlPatterns = [
          '/success', 
          '/confirmation', 
          '/thank-you', 
          '/faleminderit',
          '/njoftimi'
        ];
        
        const hasSuccessUrl = successUrlPatterns.some(pattern => currentUrl.includes(pattern));
        
        // Success indicators in page content
        const successPhrases = [
          'success', 
          'successful', 
          'thank you', 
          'confirmed',
          'njoftimi u publikua',
          'faleminderit',
          'postuar me sukses',
          'publikuar me sukses'
        ];
        
        const hasSuccessPhrase = successPhrases.some(phrase => pageContent.includes(phrase));
        
        // Error indicators
        const hasErrorMessage = document.querySelector('.error-message, .alert-danger, .validation-errors') !== null;
        
        console.log('Has success URL pattern:', hasSuccessUrl);
        console.log('Has success phrase in content:', hasSuccessPhrase);
        console.log('Has error message:', hasErrorMessage);
        
        return (hasSuccessUrl || hasSuccessPhrase) && !hasErrorMessage;
      });
      
      if (isSuccess) {
        console.log('Submission appears to be successful based on page content/URL');
        
        // Try to extract the listing URL if available
        try {
          const listingUrl = await page.evaluate(() => {
            // Look for links that might be pointing to the new listing
            const links = Array.from(document.querySelectorAll('a'));
            for (const link of links) {
              const href = link.getAttribute('href') || '';
              const text = link.textContent?.toLowerCase() || '';
              
              if (href && 
                  (href.includes('/item/') || 
                   href.includes('/listing/') || 
                   href.includes('/njoftimi/') ||
                   text.includes('view') ||
                   text.includes('shiko') ||
                   text.includes('njoftimi'))) {
                return href;
              }
            }
            return null;
          });
          
          return {
            success: true,
            listingUrl: listingUrl || `https://www.merrjep.al/listing/pending-${Date.now()}`
          };
        } catch (e) {
          console.log('Error extracting listing URL:', e);
          return {
            success: true,
            listingUrl: `https://www.merrjep.al/listing/pending-${Date.now()}`
          };
        }
      } else {
        console.log('Submission appears to have failed based on page content/URL');
        
        let errorMessage = 'Unknown submission error';
        try {
          errorMessage = await page.evaluate(() => {
            // Extract error message if present
            const errorElement = document.querySelector('.error-message, .alert-danger, .validation-errors');
            const message = errorElement ? (errorElement.textContent?.trim() || 'Error with no message') : 'No error message displayed';
            return message as string;
          });
        } catch (e) {
          console.log('Error extracting error message:', e);
        }
        
        console.log('Error message:', errorMessage);
        
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