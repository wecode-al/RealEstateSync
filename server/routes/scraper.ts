import { Router } from "express";
import { WebScraper } from "../services/scraper";
import { storage } from "../storage";
import { z } from "zod";
import { insertScraperConfigSchema, insertPropertySchema } from "@shared/schema";

const router = Router();

// Add route for saving scraper configuration
router.post("/api/scraper-configs", async (req, res) => {
  try {
    console.log("Received config data:", JSON.stringify(req.body, null, 2));
    const config = insertScraperConfigSchema.parse(req.body);
    console.log("Validated config:", JSON.stringify(config, null, 2));
    const savedConfig = await storage.createScraperConfig(config);
    res.json(savedConfig);
  } catch (error) {
    console.error("Scraper config error:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: "Invalid configuration format",
        details: error.errors 
      });
    } else {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to save scraper configuration"
      });
    }
  }
});

const scrapeRequestSchema = z.object({
  url: z.string().url(),
  configId: z.number()
});

router.post("/api/scrape", async (req, res) => {
  try {
    console.log("Received scrape request:", JSON.stringify(req.body, null, 2));
    const { url, configId } = scrapeRequestSchema.parse(req.body);

    const config = await storage.getScraperConfig(configId);
    if (!config) {
      return res.status(404).json({ error: "Scraper configuration not found" });
    }

    console.log("Using scraper config:", JSON.stringify(config, null, 2));
    const scraper = new WebScraper(config);
    const propertyData = await scraper.scrapeProperty(url);

    console.log("Successfully scraped property:", JSON.stringify(propertyData, null, 2));

    // Validate and create the property
    const validatedProperty = insertPropertySchema.parse({
      ...propertyData,
      description: propertyData.description || "No description available",
      price: propertyData.price || "0",
      bedrooms: propertyData.bedrooms || 0,
      bathrooms: propertyData.bathrooms || 0,
      squareMeters: propertyData.squareMeters || 0,
      city: propertyData.city || "Unknown",
      state: propertyData.state || "Unknown",
      zipCode: propertyData.zipCode || "Unknown",
      features: propertyData.features || [],
      images: propertyData.images || [],
      propertyType: propertyData.propertyType || "Other",
      address: propertyData.address || "Unknown"
    });

    const savedProperty = await storage.createProperty(validatedProperty);
    console.log("Created new property:", JSON.stringify(savedProperty, null, 2));

    res.json({
      message: "Property imported successfully",
      property: savedProperty
    });
  } catch (error) {
    console.error("Scraping error:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: "Invalid property data",
        details: error.errors 
      });
    } else {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to import property"
      });
    }
  }
});

// Test scraper configuration
router.post("/api/scraper-configs/:id/test", async (req, res) => {
  try {
    const configId = parseInt(req.params.id);
    const { url } = req.body;

    const config = await storage.getScraperConfig(configId);
    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    const scraper = new WebScraper(config);
    const propertyData = await scraper.scrapeProperty(url);

    res.json({
      success: true,
      data: propertyData
    });
  } catch (error) {
    console.error("Test scraper error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to test scraper"
    });
  }
});

// Get all scraper configurations
router.get("/api/scraper-configs", async (_req, res) => {
  try {
    const configs = await storage.getScraperConfigs();
    res.json(configs);
  } catch (error) {
    console.error("Error fetching scraper configs:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to fetch scraper configurations"
    });
  }
});

export default router;