import { Router } from "express";
import { WebScraper } from "../services/scraper";
import { storage } from "../storage";
import { z } from "zod";
import { insertScraperConfigSchema } from "@shared/schema";

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
    const { url, configId } = scrapeRequestSchema.parse(req.body);

    const config = await storage.getScraperConfig(configId);
    if (!config) {
      return res.status(404).json({ error: "Scraper configuration not found" });
    }

    const scraper = new WebScraper(config);
    const propertyData = await scraper.scrapeProperty(url);

    res.json(propertyData);
  } catch (error) {
    console.error("Scraping error:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: "Invalid request format",
        details: error.errors 
      });
    } else {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to scrape property"
      });
    }
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