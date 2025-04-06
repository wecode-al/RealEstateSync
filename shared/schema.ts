import { pgTable, text, serial, integer, numeric, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Site settings table definition for site-specific integrations
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  site: text("site").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  additionalConfig: jsonb("additional_config"),
});

export const insertSettingSchema = createInsertSchema(settings).omit({ 
  id: true 
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

// Application-wide settings table
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  description: text("description"),
});

export const insertAppSettingSchema = createInsertSchema(appSettings).omit({ 
  id: true 
});

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true,
  createdAt: true 
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Properties table
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: numeric("price").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: numeric("bathrooms").notNull(),
  squareMeters: numeric("square_meters").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  propertyType: text("property_type").notNull(),
  images: text("images").array().notNull(),
  features: jsonb("features").notNull(),
  published: boolean("published").default(false).notNull(),
  distributions: jsonb("distributions").default({}).notNull(),
  phone: text("phone"),
  currency: text("currency").default("ALL")
});

// Schema for creating/updating properties
export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  published: true,
  distributions: true
}).extend({
  features: z.array(z.string()),
  images: z.array(z.string()),
  // Use coerce for numeric fields to handle both string and number inputs
  price: z.coerce.number(),
  bathrooms: z.coerce.number(),
  squareMeters: z.coerce.number()
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export const propertyTypes = [
  "Shtepi private",                   // Private houses
  "Garazhe | Poste parkimi | Barake", // Garages, Parking spaces, Sheds
  "Apartamente",                      // Apartments
  "Garsoniere",                       // Studios
  "Ndarje qeraje | Cimer/e",          // Shared rentals
  "Vila",                             // Villas
  "Tokё | Truall",                    // Land | Plots
  "Prona jashte vendit"               // Properties abroad
] as const;

export const distributionSites = [
  "njoftime.com",
  "njoftime.al",
  "merrjep.al",
  "mirlir.com",
  "indomio.al",
  "okazion.al"
] as const;

export type DistributionSite = typeof distributionSites[number];

export type DistributionStatus = {
  status: "pending" | "success" | "error";
  error: string | null;
  postUrl?: string | null;
};

export type PropertyDistributions = Record<DistributionSite, DistributionStatus>;

export const siteConfigs = {
  "njoftime.com": {
    baseUrl: "https://njoftime.com",
    apiEndpoint: "/api/properties",
    requiresAuth: true
  },
  "njoftime.al": {
    baseUrl: "https://njoftime.al",
    apiEndpoint: "/api/listings",
    requiresAuth: true
  },
  "merrjep.al": {
    baseUrl: "https://merrjep.al",
    apiEndpoint: "/api/properties",
    requiresAuth: true
  },
  "mirlir.com": {
    baseUrl: "https://mirlir.com",
    apiEndpoint: "/api/listings",
    requiresAuth: true
  },
  "indomio.al": {
    baseUrl: "https://indomio.al",
    apiEndpoint: "/api/properties",
    requiresAuth: true
  },
  "okazion.al": {
    baseUrl: "https://okazion.al",
    apiEndpoint: "/api/listings",
    requiresAuth: true
  }
} as const;

// Website scraper configuration schema
export const scraperConfigs = pgTable("scraper_configs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  selectors: jsonb("selectors").notNull(),
  // Mapping between website fields and our property fields
  fieldMapping: jsonb("field_mapping").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertScraperConfigSchema = createInsertSchema(scraperConfigs).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true 
}).extend({
  selectors: z.object({
    title: z.string().describe("Selector for property title"),
    description: z.string().describe("Selector for property description"),
    price: z.string().describe("Selector for property price"),
    bedrooms: z.string().describe("Selector for number of bedrooms"),
    bathrooms: z.string().describe("Selector for number of bathrooms"),
    squareMeters: z.string().describe("Selector for property area"),
    address: z.string().describe("Selector for property address"),
    images: z.string().describe("Selector for property images"),
    features: z.string().describe("Selector for property features")
  }),
  fieldMapping: z.record(z.string(), z.string())
});

export type ScraperConfig = typeof scraperConfigs.$inferSelect;
export type InsertScraperConfig = z.infer<typeof insertScraperConfigSchema>;

// Example configuration showing how to use CSS selectors
export const exampleScraperConfig = {
  name: "Example Real Estate",
  baseUrl: "https://example.com",
  selectors: {
    title: "h1.property-title, .title, #property-title",
    description: ".property-description, .description, #description",
    price: ".property-price, .price, span[data-price]",
    bedrooms: ".bedrooms, [data-bedrooms], .property-bedrooms",
    bathrooms: ".bathrooms, [data-bathrooms], .property-bathrooms",
    squareMeters: ".area, .square-meters, [data-area]",
    address: ".address, .property-address, [data-address]",
    images: ".property-gallery img, .property-images img",
    features: ".property-features li, .features li"
  },
  fieldMapping: {
    "title": "title",
    "price": "price",
    "bedrooms": "bedrooms",
    "bathrooms": "bathrooms",
    "square_meters": "squareMeters"
  }
} as const;