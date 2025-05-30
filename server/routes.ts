import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertScraperConfigSchema, insertPropertySchema, siteConfigs, distributionSites, type PropertyDistributions, type AppSetting } from "@shared/schema";
import { setupAuth } from "./auth";
import scraperRoutes from "./routes/scraper";
import { albanianListingService } from "./services/albanian-listings";

// Authentication middleware
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  app.use(scraperRoutes);
  
  // Site status endpoints
  app.get("/api/sites", isAuthenticated, async (_req, res) => {
    try {
      // Get the list of all available distribution sites from schema
      const allSites = Object.keys(siteConfigs).map(site => ({
        key: site,
        name: site.charAt(0).toUpperCase() + site.slice(1).replace(/\.[^.]+$/, ''),
        baseUrl: siteConfigs[site as keyof typeof siteConfigs].baseUrl
      }));
      
      res.json(allSites);
    } catch (error) {
      console.error('Sites listing error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to retrieve sites list" 
      });
    }
  });
  
  app.get("/api/sites/status/:siteName", isAuthenticated, async (req, res) => {
    try {
      const siteName = req.params.siteName;
      const status = await albanianListingService.checkSiteStatus(siteName);
      res.json(status);
    } catch (error) {
      console.error('Site status check error:', error);
      res.status(500).json({ 
        available: false,
        message: error instanceof Error ? error.message : "Failed to check site status" 
      });
    }
  });
  
  // MerrJep credentials endpoints
  app.get("/api/settings/merrjep", isAuthenticated, async (_req, res) => {
    try {
      const appSettings = await storage.getAppSettings();
      const merrjepUsername = appSettings["MERRJEP_USERNAME"]?.value || null;
      
      res.json({
        username: merrjepUsername
      });
    } catch (error) {
      console.error('Error fetching MerrJep credentials:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch MerrJep credentials" 
      });
    }
  });
  
  app.post("/api/settings/merrjep", isAuthenticated, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }
      
      // Update app settings
      const settingsToUpdate: Record<string, Partial<AppSetting>> = {
        "MERRJEP_USERNAME": {
          key: "MERRJEP_USERNAME",
          value: username,
          description: "MerrJep.al username for publishing properties"
        }
      };
      
      // Only update password if provided
      if (password) {
        settingsToUpdate["MERRJEP_PASSWORD"] = {
          key: "MERRJEP_PASSWORD",
          value: password,
          description: "MerrJep.al password for publishing properties"
        };
      }
      
      await storage.updateAppSettings(settingsToUpdate);
      
      res.json({ 
        success: true,
        message: "MerrJep credentials updated successfully" 
      });
    } catch (error) {
      console.error('Error updating MerrJep credentials:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update MerrJep credentials" 
      });
    }
  });

  // Scraper Configuration endpoints
  app.get("/api/scraper-configs/current", isAuthenticated, async (_req, res) => {
    try {
      const config = await storage.getCurrentScraperConfig();
      res.json(config || null);
    } catch (error) {
      console.error('Error fetching current scraper config:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch scraper configuration" 
      });
    }
  });

  app.post("/api/scraper-configs", isAuthenticated, async (req, res) => {
    try {
      const result = insertScraperConfigSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({ 
          message: "Invalid configuration data", 
          errors: result.error 
        });
        return;
      }

      const config = await storage.setScraperConfig(result.data);
      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating scraper config:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to save configuration" 
      });
    }
  });

  // Property endpoints
  app.get("/api/properties", isAuthenticated, async (_req, res) => {
    const properties = await storage.getProperties();
    res.json(properties);
  });

  app.get("/api/properties/:id", isAuthenticated, async (req, res) => {
    const property = await storage.getProperty(Number(req.params.id));
    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }
    res.json(property);
  });

  app.post("/api/properties", isAuthenticated, async (req, res) => {
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

  app.patch("/api/properties/:id", isAuthenticated, async (req, res) => {
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

      // Prepare data for update
      const updateData = {
        ...result.data,
        // Convert numeric fields to appropriate types
        price: result.data.price?.toString(),
        bathrooms: result.data.bathrooms?.toString(),
        squareMeters: result.data.squareMeters?.toString(),
        distributions: property.distributions,
        published: property.published
      };
      
      const updated = await storage.updateProperty(id, updateData);

      res.json(updated);
    } catch (error) {
      console.error('Update property error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update property" 
      });
    }
  });

  app.patch("/api/properties/:id/publish/:site", isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const site = req.params.site;
    const property = await storage.getProperty(id);

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    // Initialize distribution status for this site
    const distributions: Record<string, any> = { 
      ...(property.distributions || {})
    };

    // Site-specific publishing logic
    try {
      const result = await albanianListingService.publishProperty(property, site);
      distributions[site] = {
        status: result.success ? "success" : "error",
        error: result.error || null,
        postUrl: result.listingUrl || null
      };
    } catch (error) {
      distributions[site] = {
        status: "error",
        error: error instanceof Error ? error.message : `Failed to publish to ${site}`,
        postUrl: null
      };
    }

    // Create a properly typed update object
    const updateData = {
      published: true,
      distributions: distributions,
      // Include these string typed fields
      price: property.price,
      bathrooms: property.bathrooms,
      squareMeters: property.squareMeters
    };

    const updated = await storage.updateProperty(id, updateData);

    res.json(updated);
  });

  app.delete("/api/properties/:id", isAuthenticated, async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}