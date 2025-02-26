import { pgTable, text, serial, integer, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: numeric("price").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: numeric("bathrooms").notNull(),
  sqft: numeric("sqft").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  propertyType: text("property_type").notNull(),
  images: text("images").array().notNull(),
  features: jsonb("features").notNull(),
  published: boolean("published").default(false).notNull(),
  distributions: jsonb("distributions").notNull(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({ 
  id: true,
  distributions: true 
}).extend({
  features: z.array(z.string()),
  images: z.array(z.string()),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export const propertyTypes = [
  "Single Family Home",
  "Condo",
  "Townhouse",
  "Multi-Family",
  "Apartment",
  "Vacant Land",
  "Other"
] as const;

// Base distribution sites that are always available
export const distributionSites = [
  "WordPress Site",
  "Zillow",
  "Realtor.com",
  "Trulia",
  "Local MLS"
] as const;

// Custom local listing site configuration
export const localListingSites = [
  {
    id: "local-site-1",
    name: "Local Real Estate Portal",
    url: "https://local-realestate.example.com",
    apiEndpoint: "/api/listings",
    requiresAuth: true,
  },
  {
    id: "local-site-2",
    name: "Community Housing Board",
    url: "https://community-housing.example.com",
    apiEndpoint: "/v1/properties",
    requiresAuth: true,
  }
] as const;

// Combine all distribution sites
export const allDistributionSites = [
  ...distributionSites,
  ...localListingSites.map(site => site.name)
] as const;

export type DistributionSite = typeof allDistributionSites[number];