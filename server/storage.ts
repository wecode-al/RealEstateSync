import { properties, users, settings, type Property, type InsertProperty, type User, type InsertUser, type Setting, type InsertSetting } from "@shared/schema";
import { distributionSites } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Property operations
  createProperty(property: InsertProperty): Promise<Property>;
  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  updateProperty(id: number, property: Partial<Property>): Promise<Property>;
  deleteProperty(id: number): Promise<void>;

  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;

  // Settings operations
  getSettings(): Promise<Record<string, Setting>>;
  updateSettings(settings: Record<string, Partial<Setting>>): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Property methods
  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const [property] = await db
      .insert(properties)
      .values({
        ...insertProperty,
        // Convert numeric strings to numbers if needed
        price: String(insertProperty.price),
        bathrooms: String(insertProperty.bathrooms),
        squareMeters: String(insertProperty.squareMeters),
        // Initialize distributions for all sites
        distributions: Object.fromEntries(
          distributionSites.map(site => [site, { status: "pending", error: null }])
        ),
        published: false
      })
      .returning();
    return property;
  }

  async getProperties(): Promise<Property[]> {
    return await db.select().from(properties);
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id));
    return property;
  }

  async updateProperty(id: number, updates: Partial<Property>): Promise<Property> {
    // Convert numeric values to strings for database storage
    if (typeof updates.price !== 'undefined') updates.price = String(updates.price);
    if (typeof updates.bathrooms !== 'undefined') updates.bathrooms = String(updates.bathrooms);
    if (typeof updates.squareMeters !== 'undefined') updates.squareMeters = String(updates.squareMeters);

    const [property] = await db
      .update(properties)
      .set(updates)
      .where(eq(properties.id, id))
      .returning();

    if (!property) throw new Error("Property not found");
    return property;
  }

  async deleteProperty(id: number): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  // User methods
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  // Settings methods
  async getSettings(): Promise<Record<string, Setting>> {
    const allSettings = await db.select().from(settings);
    return Object.fromEntries(
      allSettings.map(setting => [setting.site, setting])
    );
  }

  async updateSettings(newSettings: Record<string, Partial<Setting>>): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(settings);

      for (const [site, setting] of Object.entries(newSettings)) {
        await tx.insert(settings).values({
          site,
          enabled: setting.enabled ?? false,
          apiKey: setting.apiKey,
          apiSecret: setting.apiSecret,
          additionalConfig: setting.additionalConfig
        });
      }
    });
  }
}

export const storage = new DatabaseStorage();