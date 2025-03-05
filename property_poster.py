#!/usr/bin/env python3
"""
Albanian Property Listing Automation Script

This script automates posting property listings to various Albanian real estate websites
using Selenium. It handles login, form-filling, image uploads, and confirmation.

Usage:
    python property_poster.py [config_file]
"""

import os
import sys
import json
import time
import logging
import argparse
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    ElementNotInteractableException,
    WebDriverException
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('property_poster.log')
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class PropertyDetails:
    """Class to hold property listing details"""
    title: str
    description: str
    price: str  # Use string to handle currency symbols and formatting
    bedrooms: int
    bathrooms: int
    area: float  # Square meters
    location: str
    city: str
    address: str = ""
    property_type: str = "Apartment"  # Default
    features: List[str] = None
    contact_phone: str = ""
    contact_email: str = ""
    images: List[str] = None  # List of image file paths

    def __post_init__(self):
        if self.features is None:
            self.features = []
        if self.images is None:
            self.images = []


class PropertyPoster:
    """Base class for property posting automation"""
    
    def __init__(self, browser: str = 'chrome', headless: bool = True):
        """
        Initialize the property poster
        
        Args:
            browser: Browser to use ('chrome' or 'firefox')
            headless: Whether to run browser in headless mode
        """
        self.browser_type = browser.lower()
        self.headless = headless
        self.driver = None
        self.results = {}
        
    def __enter__(self):
        """Set up the webdriver when entering context"""
        try:
            if self.browser_type == 'chrome':
                options = ChromeOptions()
                if self.headless:
                    options.add_argument('--headless')
                
                # Additional options for Replit environment
                options.add_argument('--no-sandbox')
                options.add_argument('--disable-dev-shm-usage')
                
                self.driver = webdriver.Chrome(options=options)
                
            elif self.browser_type == 'firefox':
                options = FirefoxOptions()
                if self.headless:
                    options.add_argument('--headless')
                
                self.driver = webdriver.Firefox(options=options)
                
            else:
                raise ValueError(f"Unsupported browser: {self.browser_type}")
                
            self.driver.maximize_window()
            self.wait = WebDriverWait(self.driver, 10)
            logger.info(f"Browser initialized: {self.browser_type} (headless: {self.headless})")
            return self
            
        except WebDriverException as e:
            logger.error(f"Failed to initialize browser: {e}")
            raise
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Clean up webdriver when exiting context"""
        if self.driver:
            self.driver.quit()
            logger.info("Browser closed")
    
    def load_credentials(self, site: str, config_file: str) -> Dict[str, str]:
        """
        Load credentials for a specific site from config file
        
        Args:
            site: Site name
            config_file: Path to config file
            
        Returns:
            Dictionary with credentials
        """
        try:
            with open(config_file, 'r') as f:
                config = json.load(f)
            
            if site not in config:
                logger.warning(f"No credentials found for {site}")
                return {}
                
            return config[site]
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.error(f"Error loading credentials: {e}")
            return {}
    
    def wait_for_element(self, by: By, value: str, timeout: int = 10) -> Any:
        """
        Wait for an element to be present and visible
        
        Args:
            by: Selenium By locator strategy
            value: Locator value
            timeout: Wait timeout in seconds
            
        Returns:
            The found web element
        """
        try:
            return WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located((by, value))
            )
        except TimeoutException:
            logger.error(f"Element not found: {by}={value}")
            raise
    
    def safe_click(self, element) -> bool:
        """
        Safely click an element with retry and error handling
        
        Args:
            element: WebElement to click
            
        Returns:
            True if click was successful, False otherwise
        """
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                element.click()
                return True
            except (ElementNotInteractableException, WebDriverException) as e:
                if attempt < max_attempts - 1:
                    logger.warning(f"Click failed, retrying... ({e})")
                    time.sleep(1)
                else:
                    logger.error(f"Failed to click element: {e}")
                    return False
    
    def handle_captcha(self, timeout: int = 60) -> bool:
        """
        Handle captcha by pausing for manual solving
        
        Args:
            timeout: How long to wait for manual captcha solving
            
        Returns:
            True if captcha solved or not present, False if timed out
        """
        # Look for common captcha indicators
        captcha_indicators = [
            (By.ID, "captcha"),
            (By.CSS_SELECTOR, ".g-recaptcha"),
            (By.XPATH, "//iframe[contains(@src, 'recaptcha')]")
        ]
        
        for by, value in captcha_indicators:
            try:
                element = self.driver.find_element(by, value)
                if element.is_displayed():
                    logger.warning("CAPTCHA detected! Please solve it manually.")
                    print("\n⚠️ CAPTCHA detected! Please solve it manually in the browser window.")
                    print(f"You have {timeout} seconds to solve it...\n")
                    
                    # Wait for captcha to be solved
                    start_time = time.time()
                    while time.time() - start_time < timeout:
                        try:
                            # Try to find captcha again, if not found, it's solved
                            self.driver.find_element(by, value)
                            time.sleep(2)
                        except NoSuchElementException:
                            logger.info("CAPTCHA appears to be solved")
                            return True
                    
                    logger.error("CAPTCHA solving timed out")
                    return False
            except NoSuchElementException:
                pass
        
        return True  # No captcha found
    
    def post_listing(self, site: str, property_details: PropertyDetails, credentials: Dict[str, str]) -> Dict[str, Any]:
        """
        Post property listing to a specified site
        
        Args:
            site: Target site name
            property_details: Property listing details
            credentials: Login credentials for the site
            
        Returns:
            Dictionary with result information
        """
        result = {
            "site": site,
            "success": False,
            "message": "",
            "listing_url": None
        }
        
        try:
            # Delegate to site-specific posting methods
            if site == "njoftime.com":
                self._post_to_njoftime_com(property_details, credentials, result)
            elif site == "merrjep.al":
                self._post_to_merrjep_al(property_details, credentials, result)
            elif site == "indomio.al":
                self._post_to_indomio_al(property_details, credentials, result)
            # Add more sites here
            else:
                result["message"] = f"Unsupported site: {site}"
                logger.error(result["message"])
            
            return result
            
        except Exception as e:
            result["message"] = f"Error: {str(e)}"
            logger.exception(f"Error posting to {site}")
            return result
    
    def _post_to_njoftime_com(self, property_details: PropertyDetails, 
                             credentials: Dict[str, str], result: Dict[str, Any]) -> None:
        """Post property listing to njoftime.com"""
        try:
            # Open the site
            self.driver.get("https://njoftime.com/login")
            logger.info("Navigating to njoftime.com login page")
            
            # Login
            if not self._login_to_njoftime(credentials):
                result["message"] = "Login failed"
                return
            
            # Navigate to create new listing
            self.driver.get("https://njoftime.com/post-ad")
            logger.info("Navigating to posting page")
            
            # Select property category
            self.wait_for_element(By.XPATH, "//a[contains(text(), 'Shtepi')]").click()
            
            # Fill in property details
            title_field = self.wait_for_element(By.ID, "title")
            title_field.clear()
            title_field.send_keys(property_details.title)
            
            description_field = self.wait_for_element(By.ID, "description")
            description_field.clear()
            description_field.send_keys(property_details.description)
            
            price_field = self.wait_for_element(By.ID, "price")
            price_field.clear()
            price_field.send_keys(property_details.price)
            
            # Upload images
            if property_details.images:
                for image_path in property_details.images[:5]:  # Limit to 5 images
                    try:
                        upload_input = self.wait_for_element(By.XPATH, "//input[@type='file']")
                        upload_input.send_keys(os.path.abspath(image_path))
                        time.sleep(2)  # Wait for upload
                    except Exception as e:
                        logger.error(f"Failed to upload image {image_path}: {e}")
            
            # Handle captcha if present
            if not self.handle_captcha():
                result["message"] = "Captcha handling failed"
                return
            
            # Submit form
            submit_button = self.wait_for_element(By.XPATH, "//button[@type='submit']")
            self.safe_click(submit_button)
            
            # Wait for success page or confirmation
            try:
                success_element = WebDriverWait(self.driver, 15).until(
                    EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'alert-success')]"))
                )
                result["success"] = True
                result["message"] = "Listing posted successfully"
                
                # Try to get the listing URL
                listing_links = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/listing/')]")
                if listing_links:
                    result["listing_url"] = listing_links[0].get_attribute("href")
                    
            except TimeoutException:
                result["message"] = "Could not confirm successful posting"
            
        except Exception as e:
            result["message"] = f"Error: {str(e)}"
            logger.exception("Error during njoftime.com posting")
    
    def _login_to_njoftime(self, credentials: Dict[str, str]) -> bool:
        """Helper method to log in to njoftime.com"""
        try:
            if not credentials or "username" not in credentials or "password" not in credentials:
                logger.error("Missing njoftime.com credentials")
                return False
            
            username_field = self.wait_for_element(By.ID, "email")
            username_field.clear()
            username_field.send_keys(credentials["username"])
            
            password_field = self.wait_for_element(By.ID, "password")
            password_field.clear()
            password_field.send_keys(credentials["password"])
            
            login_button = self.wait_for_element(By.XPATH, "//button[@type='submit']")
            self.safe_click(login_button)
            
            # Verify login success
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, "//a[contains(@href, 'logout')]"))
                )
                logger.info("Successfully logged in to njoftime.com")
                return True
            except TimeoutException:
                logger.error("Failed to login to njoftime.com")
                return False
                
        except Exception as e:
            logger.exception(f"Login error: {e}")
            return False
    
    def _post_to_merrjep_al(self, property_details: PropertyDetails, 
                            credentials: Dict[str, str], result: Dict[str, Any]) -> None:
        """Post property listing to merrjep.al"""
        try:
            # Open the site
            self.driver.get("https://www.merrjep.al/login")
            logger.info("Navigating to merrjep.al login page")
            
            # Login
            if not self._login_to_merrjep(credentials):
                result["message"] = "Login failed"
                return
            
            # Navigate to create new listing
            self.driver.get("https://www.merrjep.al/post-ad")
            logger.info("Navigating to posting page")
            
            # Select property category
            self.wait_for_element(By.XPATH, "//a[contains(text(), 'Prona')]").click()
            self.wait_for_element(By.XPATH, "//a[contains(text(), 'Apartamente')]").click()
            
            # Fill in property details
            title_field = self.wait_for_element(By.ID, "title")
            title_field.clear()
            title_field.send_keys(property_details.title)
            
            description_field = self.wait_for_element(By.ID, "description")
            description_field.clear()
            description_field.send_keys(property_details.description)
            
            price_field = self.wait_for_element(By.ID, "price")
            price_field.clear()
            price_field.send_keys(property_details.price)
            
            # Fill in location
            location_field = self.wait_for_element(By.ID, "location")
            location_field.clear()
            location_field.send_keys(property_details.city)
            location_options = self.wait_for_element(By.XPATH, "//ul[@id='locationlist']/li")
            self.safe_click(location_options)
            
            # Upload images
            if property_details.images:
                for image_path in property_details.images[:10]:  # Limit to 10 images
                    try:
                        upload_input = self.wait_for_element(By.XPATH, "//input[@type='file']")
                        upload_input.send_keys(os.path.abspath(image_path))
                        time.sleep(2)  # Wait for upload
                    except Exception as e:
                        logger.error(f"Failed to upload image {image_path}: {e}")
            
            # Handle captcha if present
            if not self.handle_captcha():
                result["message"] = "Captcha handling failed"
                return
            
            # Submit form
            submit_button = self.wait_for_element(By.XPATH, "//button[@type='submit']")
            self.safe_click(submit_button)
            
            # Wait for success page or confirmation
            try:
                success_element = WebDriverWait(self.driver, 15).until(
                    EC.visibility_of_element_located((By.XPATH, "//div[contains(@class, 'alert-success')]"))
                )
                result["success"] = True
                result["message"] = "Listing posted successfully"
                
                # Try to get the listing URL
                listing_links = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/listing/')]")
                if listing_links:
                    result["listing_url"] = listing_links[0].get_attribute("href")
                    
            except TimeoutException:
                result["message"] = "Could not confirm successful posting"
            
        except Exception as e:
            result["message"] = f"Error: {str(e)}"
            logger.exception("Error during merrjep.al posting")
    
    def _login_to_merrjep(self, credentials: Dict[str, str]) -> bool:
        """Helper method to log in to merrjep.al"""
        try:
            if not credentials or "username" not in credentials or "password" not in credentials:
                logger.error("Missing merrjep.al credentials")
                return False
            
            username_field = self.wait_for_element(By.ID, "email")
            username_field.clear()
            username_field.send_keys(credentials["username"])
            
            password_field = self.wait_for_element(By.ID, "password")
            password_field.clear()
            password_field.send_keys(credentials["password"])
            
            login_button = self.wait_for_element(By.XPATH, "//button[@type='submit']")
            self.safe_click(login_button)
            
            # Verify login success
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, "//a[contains(@href, 'logout')]"))
                )
                logger.info("Successfully logged in to merrjep.al")
                return True
            except TimeoutException:
                logger.error("Failed to login to merrjep.al")
                return False
                
        except Exception as e:
            logger.exception(f"Login error: {e}")
            return False
    
    def _post_to_indomio_al(self, property_details: PropertyDetails, 
                            credentials: Dict[str, str], result: Dict[str, Any]) -> None:
        """Post property listing to indomio.al"""
        try:
            # Open the site
            self.driver.get("https://indomio.al/login")
            logger.info("Navigating to indomio.al login page")
            
            # Login
            if not self._login_to_indomio(credentials):
                result["message"] = "Login failed"
                return
            
            # Navigate to create new listing
            self.driver.get("https://indomio.al/user/properties/add")
            logger.info("Navigating to posting page")
            
            # Fill in property details
            title_field = self.wait_for_element(By.ID, "title")
            title_field.clear()
            title_field.send_keys(property_details.title)
            
            description_field = self.wait_for_element(By.ID, "description")
            description_field.clear()
            description_field.send_keys(property_details.description)
            
            price_field = self.wait_for_element(By.ID, "price")
            price_field.clear()
            price_field.send_keys(property_details.price)
            
            # Select property type
            property_type_select = self.wait_for_element(By.ID, "property_type")
            # Use the Select class to select by visible text
            from selenium.webdriver.support.ui import Select
            Select(property_type_select).select_by_visible_text("Apartament")
            
            # Fill in property details
            bedrooms_field = self.wait_for_element(By.ID, "bedrooms")
            bedrooms_field.clear()
            bedrooms_field.send_keys(str(property_details.bedrooms))
            
            bathrooms_field = self.wait_for_element(By.ID, "bathrooms")
            bathrooms_field.clear()
            bathrooms_field.send_keys(str(property_details.bathrooms))
            
            area_field = self.wait_for_element(By.ID, "area")
            area_field.clear()
            area_field.send_keys(str(property_details.area))
            
            # Upload images
            if property_details.images:
                for image_path in property_details.images[:15]:  # Limit to 15 images
                    try:
                        upload_input = self.wait_for_element(By.ID, "property_images")
                        upload_input.send_keys(os.path.abspath(image_path))
                        time.sleep(2)  # Wait for upload
                    except Exception as e:
                        logger.error(f"Failed to upload image {image_path}: {e}")
            
            # Handle captcha if present
            if not self.handle_captcha():
                result["message"] = "Captcha handling failed"
                return
            
            # Submit form
            submit_button = self.wait_for_element(By.XPATH, "//button[@type='submit']")
            self.safe_click(submit_button)
            
            # Wait for success page or confirmation
            try:
                success_element = WebDriverWait(self.driver, 15).until(
                    EC.visibility_of_element_located((By.CSS_SELECTOR, ".alert-success"))
                )
                result["success"] = True
                result["message"] = "Listing posted successfully"
                
                # Try to get the listing URL
                current_url = self.driver.current_url
                if "property" in current_url:
                    result["listing_url"] = current_url
                    
            except TimeoutException:
                result["message"] = "Could not confirm successful posting"
            
        except Exception as e:
            result["message"] = f"Error: {str(e)}"
            logger.exception("Error during indomio.al posting")
    
    def _login_to_indomio(self, credentials: Dict[str, str]) -> bool:
        """Helper method to log in to indomio.al"""
        try:
            if not credentials or "username" not in credentials or "password" not in credentials:
                logger.error("Missing indomio.al credentials")
                return False
            
            username_field = self.wait_for_element(By.ID, "email")
            username_field.clear()
            username_field.send_keys(credentials["username"])
            
            password_field = self.wait_for_element(By.ID, "password")
            password_field.clear()
            password_field.send_keys(credentials["password"])
            
            login_button = self.wait_for_element(By.XPATH, "//button[@type='submit']")
            self.safe_click(login_button)
            
            # Verify login success
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, "//a[contains(@href, 'logout')]"))
                )
                logger.info("Successfully logged in to indomio.al")
                return True
            except TimeoutException:
                logger.error("Failed to login to indomio.al")
                return False
                
        except Exception as e:
            logger.exception(f"Login error: {e}")
            return False


def main():
    """Main function to run the property posting automation"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Automate property listings on Albanian real estate websites")
    parser.add_argument("--config", "-c", default="config.json", help="Path to configuration file")
    parser.add_argument("--browser", "-b", default="chrome", choices=["chrome", "firefox"], help="Browser to use")
    parser.add_argument("--headless", action="store_true", help="Run browser in headless mode")
    parser.add_argument("--sites", "-s", nargs="+", default=["njoftime.com", "merrjep.al", "indomio.al"], 
                        help="Sites to post to")
    parser.add_argument("--interactive", "-i", action="store_true", help="Run in interactive mode to input property details")
    args = parser.parse_args()
    
    # Check if config file exists
    if not os.path.isfile(args.config):
        print(f"Config file {args.config} not found.")
        print("Creating a sample config file...")
        create_sample_config(args.config)
        print(f"Please edit {args.config} with your credentials and property details.")
        return
        
    # Load property details
    if args.interactive:
        property_details = get_property_details_interactively()
    else:
        property_details = load_property_details(args.config)
        
    if not property_details:
        print("Failed to load property details. Exiting.")
        return
        
    # Initialize property poster
    try:
        with PropertyPoster(browser=args.browser, headless=args.headless) as poster:
            print(f"\n{'=' * 60}")
            print(f"🏠 Property Listing Automation")
            print(f"{'=' * 60}")
            print(f"Title: {property_details.title}")
            print(f"Price: {property_details.price}")
            print(f"Location: {property_details.city}")
            print(f"Images: {len(property_details.images) if property_details.images else 0} images")
            print(f"Posting to: {', '.join(args.sites)}")
            print(f"{'=' * 60}\n")
            
            results = []
            
            # Post to each site
            for site in args.sites:
                print(f"\n📌 Posting to {site}...")
                credentials = poster.load_credentials(site, args.config)
                result = poster.post_listing(site, property_details, credentials)
                results.append(result)
                
                if result["success"]:
                    print(f"✅ Success! Listing posted to {site}")
                    if result["listing_url"]:
                        print(f"   URL: {result['listing_url']}")
                else:
                    print(f"❌ Failed to post to {site}: {result['message']}")
                    
                time.sleep(2)  # Pause between sites
                
            # Print summary
            print(f"\n{'=' * 60}")
            print(f"📊 Posting Summary")
            print(f"{'=' * 60}")
            success_count = sum(1 for r in results if r["success"])
            print(f"Total: {len(results)} sites")
            print(f"Successful: {success_count}")
            print(f"Failed: {len(results) - success_count}")
            
            if success_count < len(results):
                print("\nFailed sites:")
                for result in results:
                    if not result["success"]:
                        print(f"- {result['site']}: {result['message']}")
            
            print(f"{'=' * 60}")
            
    except Exception as e:
        logger.exception(f"Error in main process: {e}")
        print(f"\n❌ Error: {e}")
    
    print("\nDone! Check the log file for details.")


def create_sample_config(config_file: str) -> None:
    """Create a sample configuration file"""
    sample_config = {
        "property_details": {
            "title": "Beautiful 2-bedroom apartment in central Tirana",
            "description": "Spacious and modern apartment located in the heart of Tirana...",
            "price": "85000",
            "bedrooms": 2,
            "bathrooms": 1,
            "area": 85.5,
            "location": "Tirana",
            "city": "Tirana",
            "address": "Rruga Myslym Shyri",
            "property_type": "Apartment",
            "features": ["Balcony", "Parking", "Air Conditioning", "Elevator"],
            "contact_phone": "+355 69 123 4567",
            "contact_email": "your-email@example.com",
            "images": ["images/image1.jpg", "images/image2.jpg"]
        },
        "njoftime.com": {
            "username": "your_username",
            "password": "your_password"
        },
        "merrjep.al": {
            "username": "your_username",
            "password": "your_password"
        },
        "indomio.al": {
            "username": "your_username",
            "password": "your_password"
        }
    }
    
    try:
        with open(config_file, 'w') as f:
            json.dump(sample_config, f, indent=4)
    except Exception as e:
        logger.error(f"Failed to create sample config: {e}")


def load_property_details(config_file: str) -> Optional[PropertyDetails]:
    """Load property details from config file"""
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
            
        if "property_details" not in config:
            logger.error("No property details found in config")
            return None
            
        details = config["property_details"]
        return PropertyDetails(
            title=details.get("title", ""),
            description=details.get("description", ""),
            price=details.get("price", ""),
            bedrooms=details.get("bedrooms", 0),
            bathrooms=details.get("bathrooms", 0),
            area=details.get("area", 0.0),
            location=details.get("location", ""),
            city=details.get("city", ""),
            address=details.get("address", ""),
            property_type=details.get("property_type", "Apartment"),
            features=details.get("features", []),
            contact_phone=details.get("contact_phone", ""),
            contact_email=details.get("contact_email", ""),
            images=details.get("images", [])
        )
    except Exception as e:
        logger.error(f"Error loading property details: {e}")
        return None


def get_property_details_interactively() -> PropertyDetails:
    """Get property details from user input"""
    print("\n📋 Enter Property Details")
    print("-" * 30)
    
    title = input("Title: ")
    description = input("Description: ")
    price = input("Price: ")
    bedrooms = int(input("Bedrooms: "))
    bathrooms = int(input("Bathrooms: "))
    area = float(input("Area (m²): "))
    city = input("City: ")
    address = input("Address: ")
    
    features_input = input("Features (comma separated): ")
    features = [f.strip() for f in features_input.split(",") if f.strip()]
    
    contact_phone = input("Contact Phone: ")
    contact_email = input("Contact Email: ")
    
    images = []
    images_dir = input("Images directory (leave empty to skip): ")
    if images_dir and os.path.isdir(images_dir):
        image_files = [os.path.join(images_dir, f) for f in os.listdir(images_dir) 
                     if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        images = image_files
        print(f"Found {len(images)} images in {images_dir}")
    
    return PropertyDetails(
        title=title,
        description=description,
        price=price,
        bedrooms=bedrooms,
        bathrooms=bathrooms,
        area=area,
        location=city,
        city=city,
        address=address,
        features=features,
        contact_phone=contact_phone,
        contact_email=contact_email,
        images=images
    )


if __name__ == "__main__":
    main()
