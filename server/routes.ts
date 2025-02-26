import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, type Property } from "@shared/schema";

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

    // Simulate distribution process
    const updatedDistributions: Property['distributions'] = {};
    for (const site of Object.keys(property.distributions)) {
      updatedDistributions[site] = {
        status: Math.random() > 0.2 ? "success" : "error",
        error: Math.random() > 0.2 ? null : "API Connection failed"
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