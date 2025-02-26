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
});

// Schema for creating/updating properties
export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  published: true,
  distributions: true
}).extend({
  features: z.array(z.string()),
  images: z.array(z.string()),
  // Allow both string and number for numeric fields
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
  status: 'success' | 'error';
  error: string | null;
  postUrl: string | null;
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