import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, type Property, distributionSites } from "@shared/schema";
import { wordPressService } from "./services/wordpress";
import { localListingService } from "./services/local-listings";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

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
    const updatedDistributions: Property['distributions'] = {};

    // Only publish to enabled sites
    for (const site of distributionSites) {
      const siteSettings = settings[site];

      // Skip if site is not configured
      if (!siteSettings?.enabled) {
        updatedDistributions[site] = {
          status: "error",
          error: "Site not configured",
          postUrl: null
        };
        continue;
      }

      try {
        let result;
        if (site === "WordPress Site") {
          result = await wordPressService.publishProperty(property);
        } else {
          result = await localListingService.publishProperty(property, site);
        }

        updatedDistributions[site] = {
          status: result.success ? "success" : "error",
          error: result.error || null,
          postUrl: result.postUrl
        };
      } catch (error) {
        updatedDistributions[site] = {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
          postUrl: null
        };
      }
    }

    const updated = await storage.updateProperty(id, {
      ...property,
      published: true,
      distributions: updatedDistributions
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
      } else {
        await localListingService.publishProperty({ ...req.body, id: 0 } as Property, site);
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