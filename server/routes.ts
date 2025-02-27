import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertScraperConfigSchema, insertPropertySchema, type Property, distributionSites } from "@shared/schema";
import { wordPressService } from "./services/wordpress";
import { setupAuth } from "./auth";
import scraperRoutes from "./routes/scraper";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  app.use(scraperRoutes);

  // Scraper Configuration endpoints
  app.get("/api/scraper-configs/current", async (_req, res) => {
    try {
      const config = await storage.getCurrentScraperConfig();
      console.log('Returning current config:', config);
      res.json(config || null);
    } catch (error) {
      console.error('Error fetching current scraper config:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch scraper configuration" 
      });
    }
  });

  app.post("/api/scraper-configs", async (req, res) => {
    try {
      console.log('Received config data:', req.body);
      const result = insertScraperConfigSchema.safeParse(req.body);
      if (!result.success) {
        console.error('Validation error:', result.error);
        res.status(400).json({ 
          message: "Invalid configuration data", 
          errors: result.error 
        });
        return;
      }

      // Validate the data
      console.log('Validated config:', result.data);

      // Store the configuration
      const config = await storage.setScraperConfig(result.data);
      console.log('Stored config:', config);

      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating scraper config:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to save configuration" 
      });
    }
  });

  app.get("/api/properties", async (_req, res) => {
    const properties = await storage.getProperties();
    res.json(properties);
  });

  app.get("/api/properties/:id", async (req, res) => {
    const property = await storage.getProperty(Number(req.params.id));
    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }
    res.json(property);
  });

  app.post("/api/properties", async (req, res) => {
    const result = insertPropertySchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ message: "Invalid property data", errors: result.error });
      return;
    }

    try {
      const property = await storage.createProperty({
        ...result.data,
        price: Number(result.data.price),
        bathrooms: Number(result.data.bathrooms),
        squareMeters: Number(result.data.squareMeters)
      });
      res.status(201).json(property);
    } catch (error) {
      console.error('Create property error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create property" 
      });
    }
  });

  app.patch("/api/properties/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const property = await storage.getProperty(id);

      if (!property) {
        res.status(404).json({ message: "Property not found" });
        return;
      }

      const result = insertPropertySchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ message: "Invalid property data", errors: result.error });
        return;
      }

      const updated = await storage.updateProperty(id, {
        ...result.data,
        price: Number(result.data.price),
        bathrooms: Number(result.data.bathrooms),
        squareMeters: Number(result.data.squareMeters),
        distributions: property.distributions,
        published: property.published
      });

      res.json(updated);
    } catch (error) {
      console.error('Update property error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update property" 
      });
    }
  });

  app.patch("/api/properties/:id/publish", async (req, res) => {
    const id = Number(req.params.id);
    const property = await storage.getProperty(id);
    const settings = await storage.getSettings();

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    // Initialize distribution statuses
    const updatedDistributions: Record<string, {
      status: 'success' | 'error';
      error: string | null;
      postUrl: string | null;
    }> = {};

    // Only publish to WordPress if enabled
    if (settings["WordPress Site"]?.enabled) {
      try {
        const result = await wordPressService.publishProperty(property);
        updatedDistributions["WordPress Site"] = {
          status: result.success ? "success" : "error",
          error: result.error || null,
          postUrl: result.postUrl || null
        };
      } catch (error) {
        updatedDistributions["WordPress Site"] = {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
          postUrl: null
        };
      }
    } else {
      updatedDistributions["WordPress Site"] = {
        status: "error",
        error: "WordPress not configured",
        postUrl: null
      };
    }

    const updated = await storage.updateProperty(id, {
      ...property,
      published: true,
      distributions: updatedDistributions
    });

    res.json(updated);
  });

  app.patch("/api/properties/:id/publish/:site", async (req, res) => {
    const id = Number(req.params.id);
    const site = req.params.site;
    const property = await storage.getProperty(id);
    const settings = await storage.getSettings();

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    // Initialize distribution status for this site
    const distributions = { 
      ...property.distributions 
    };

    // Site-specific publishing logic
    if (site === "WordPress Site") {
      try {
        if (settings["WordPress Site"]?.enabled) {
          const result = await wordPressService.publishProperty(property);
          distributions[site] = {
            status: result.success ? "success" : "error",
            error: result.error || null,
            postUrl: result.postUrl || null
          };
        } else {
          distributions[site] = {
            status: "error",
            error: "WordPress not configured",
            postUrl: null
          };
        }
      } catch (error) {
        distributions[site] = {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
          postUrl: null
        };
      }
    } else {
      // Handle other sites in the future
      distributions[site] = {
        status: "error",
        error: "Publishing to this site is not yet implemented",
        postUrl: null
      };
    }

    const updated = await storage.updateProperty(id, {
      ...property,
      published: true,
      distributions: distributions
    });

    res.json(updated);
  });

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const property = await storage.getProperty(id);

      if (!property) {
        res.status(404).json({ message: "Property not found" });
        return;
      }

      await storage.deleteProperty(id);
      res.sendStatus(200);
    } catch (error) {
      console.error('Delete property error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to delete property" 
      });
    }
  });

  // Settings endpoints
  app.get("/api/settings", async (_req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
  });

  app.post("/api/settings", async (req, res) => {
    try {
      console.log('Received settings update:', req.body);
      await storage.updateSettings(req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update settings'
      });
    }
  });

  app.post("/api/settings/test/:site", async (req, res) => {
    const site = req.params.site;

    try {
      if (site === "WordPress Site") {
        await wordPressService.testConnection();
      }
      res.json({ success: true });
    } catch (error) {
      console.error(`Connection test error for ${site}:`, error);
      res.status(400).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Connection test failed" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}