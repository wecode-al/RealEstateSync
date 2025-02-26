import { Router } from "express";
import { WebScraper } from "../services/scraper";
import { storage } from "../storage";
import { z } from "zod";
import { insertScraperConfigSchema } from "@shared/schema";

const router = Router();

// Add route for saving scraper configuration
router.post("/api/scraper-configs", async (req, res) => {
  try {
    const config = insertScraperConfigSchema.parse(req.body);
    const savedConfig = await storage.createScraperConfig(config);
    res.json(savedConfig);
  } catch (error) {
    console.error("Scraper config error:", error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : "Failed to save scraper configuration",
      details: error instanceof z.ZodError ? error.errors : undefined
    });
  }
});

const scrapeRequestSchema = z.object({
  url: z.string().url(),
  configId: z.number()
});

router.post("/scrape", async (req, res) => {
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
    res.status(400).json({ 
      error: error instanceof Error ? error.message : "Failed to scrape property",
      details: error instanceof z.ZodError ? error.errors : undefined
    });
  }
});

export default router;