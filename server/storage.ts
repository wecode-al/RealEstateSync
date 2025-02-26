import { properties, type Property, type InsertProperty } from "@shared/schema";
import { distributionSites } from "@shared/schema";

export interface IStorage {
  createProperty(property: InsertProperty): Promise<Property>;
  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  updateProperty(id: number, property: Partial<Property>): Promise<Property>;
}

export class MemStorage implements IStorage {
  private properties: Map<number, Property>;
  private currentId: number;

  constructor() {
    this.properties = new Map();
    this.currentId = 1;
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = this.currentId++;
    const distributions = Object.fromEntries(
      distributionSites.map(site => [site, { status: "pending", error: null }])
    );
    
    const property: Property = {
      ...insertProperty,
      id,
      distributions,
      published: false
    };
    
    this.properties.set(id, property);
    return property;
  }

  async getProperties(): Promise<Property[]> {
    return Array.from(this.properties.values());
  }

  async getProperty(id: number): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async updateProperty(id: number, updates: Partial<Property>): Promise<Property> {
    const property = await this.getProperty(id);
    if (!property) throw new Error("Property not found");

    const updated = { ...property, ...updates };
    this.properties.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
