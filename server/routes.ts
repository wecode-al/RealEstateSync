import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, type Property, distributionSites } from "@shared/schema";
import { wordPressService } from "./services/wordpress";
import { albanianListingService } from "./services/albanian-listings";

export async function registerRoutes(app: Express): Promise<Server> {
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

    const property = await storage.createProperty(result.data);
    res.status(201).json(property);
  });

  app.patch("/api/properties/:id/publish", async (req, res) => {
    const id = Number(req.params.id);
    const property = await storage.getProperty(id);

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    // Initialize distribution statuses
    const updatedDistributions: Property['distributions'] = {
      ...property.distributions
    };

    // Publish to WordPress
    const wpResult = await wordPressService.publishProperty(property);
    updatedDistributions["WordPress Site"] = {
      status: wpResult.success ? "success" : "error",
      error: wpResult.error || null,
      postUrl: wpResult.postUrl
    };

    // Publish to Albanian listing sites
    for (const site of distributionSites) {
      if (site === "WordPress Site") continue;

      const result = await albanianListingService.publishProperty(property, site);
      updatedDistributions[site] = {
        status: result.success ? "success" : "error",
        error: result.error || null,
        postUrl: result.listingUrl
      };
    }

    const updated = await storage.updateProperty(id, {
      published: true,
      distributions: updatedDistributions
    });

    res.json(updated);
  });

  const httpServer = createServer(app);
  return httpServer;
}