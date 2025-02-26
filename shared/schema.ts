import { pgTable, text, serial, integer, numeric, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Add settings table definition
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
  distributions: jsonb("distributions").default({}).notNull()
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
  "Single Family Home",
  "Condo",
  "Townhouse",
  "Multi-Family",
  "Apartment",
  "Vacant Land",
  "Other"
] as const;

export const distributionSites = [
  "WordPress Site",
  "njoftime.com",
  "njoftime.al",
  "merrjep.al",
  "mirlir",
  "indomio.al",
  "instagram",
  "facebook",
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
  "mirlir": {
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
  // Optional authentication details if needed
  authConfig: jsonb("auth_config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const insertScraperConfigSchema = createInsertSchema(scraperConfigs).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true 
}).extend({
  selectors: z.object({
    title: z.object({
      type: z.enum(["css", "xpath", "jet-engine", "data-attribute"]),
      value: z.string(),
      attribute: z.string().optional(), // For data attributes
      jetField: z.string().optional()   // For Jet Engine fields
    }),
    description: z.object({
      type: z.enum(["css", "xpath", "jet-engine", "data-attribute"]),
      value: z.string(),
      attribute: z.string().optional(),
      jetField: z.string().optional()
    }),
    price: z.object({
      type: z.enum(["css", "xpath", "jet-engine", "data-attribute"]),
      value: z.string(),
      attribute: z.string().optional(),
      jetField: z.string().optional()
    }),
    bedrooms: z.object({
      type: z.enum(["css", "xpath", "jet-engine", "data-attribute"]),
      value: z.string(),
      attribute: z.string().optional(),
      jetField: z.string().optional()
    }),
    bathrooms: z.object({
      type: z.enum(["css", "xpath", "jet-engine", "data-attribute"]),
      value: z.string(),
      attribute: z.string().optional(),
      jetField: z.string().optional()
    }),
    squareMeters: z.object({
      type: z.enum(["css", "xpath", "jet-engine", "data-attribute"]),
      value: z.string(),
      attribute: z.string().optional(),
      jetField: z.string().optional()
    }),
    address: z.object({
      type: z.enum(["css", "xpath", "jet-engine", "data-attribute"]),
      value: z.string(),
      attribute: z.string().optional(),
      jetField: z.string().optional()
    }),
    images: z.object({
      type: z.enum(["css", "xpath", "jet-engine", "data-attribute"]),
      value: z.string(),
      attribute: z.string().optional(),
      jetField: z.string().optional()
    }),
    features: z.object({
      type: z.enum(["css", "xpath", "jet-engine", "data-attribute"]),
      value: z.string(),
      attribute: z.string().optional(),
      jetField: z.string().optional()
    })
  }),
  fieldMapping: z.record(z.string(), z.string()),
  authConfig: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    apiKey: z.string().optional()
  }).optional()
});

export type ScraperConfig = typeof scraperConfigs.$inferSelect;
export type InsertScraperConfig = z.infer<typeof insertScraperConfigSchema>;

// Example configuration for a Jet Engine powered website
export const jetEngineScraperConfig = {
  name: "MyHome Real Estate",
  baseUrl: "https://myhomerealestate.al",
  selectors: {
    title: {
      type: "jet-engine",
      value: ".jet-listing-dynamic-field__content",
      jetField: "property_title"
    },
    description: {
      type: "jet-engine",
      value: ".jet-listing-dynamic-field__content",
      jetField: "property_description"
    },
    price: {
      type: "jet-engine",
      value: ".jet-listing-dynamic-field__content",
      jetField: "property_price"
    }
    // Add other fields...
  },
  fieldMapping: {
    "property_price": "price",
    "property_bedrooms": "bedrooms",
    "property_bathrooms": "bathrooms",
    "property_square_meters": "squareMeters"
  }
} as const;