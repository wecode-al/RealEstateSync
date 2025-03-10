import { type Property } from "@shared/schema";
import { create } from "xmlbuilder2";

export interface IndomioProperty {
  mainFeatures: {
    id: number;
    brokerListingID?: string;
    dateUpdated: string;
    dateAvailable: string;
    size: number;
    listingType: "for sale" | "for rent";
    price: {
      amount: number;
      currency: string;
    };
    investment?: boolean;
    corner?: boolean;
    view?: string;
    noAgentFee: boolean;
  };
  location: {
    geographyId: number;
    originalLocation?: string;
    addresses?: {
      address: Array<{
        language: string;
        streetAddress: string;
      }>;
      addressVisible: boolean;
    };
    geocodes?: {
      latitude: number;
      longitude: number;
    };
    zip?: string;
    zoning?: string;
    roadType?: string;
  };
  categoryFeatures: {
    propertyType: {
      category: string;
      subCategory: string;
    };
    originalPropertyType?: string;
    residential_features?: {
      bedrooms: number;
      livingRooms?: number;
      kitchens?: number;
      bathrooms: number;
      status?: string;
      constructionYear?: number;
      parkingSpaces?: number;
      floorNumber?: string;
      levels?: number;
      furnished?: boolean;
      airConditioning?: boolean;
      elevator?: boolean;
      storageSpace?: boolean;
      balconiesSize?: number;
      energyClass?: string;
      orientation?: string;
      heatingController?: string;
      heatingMedium?: string;
      floorType?: string;
      [key: string]: any;
    };
  };
  descriptions?: Array<{
    language: string;
    description: string;
  }>;
  media?: {
    photos?: Array<{
      url: string;
      priority: number;
      photoDescriptions?: Array<{
        language: string;
        description: string;
      }>;
    }>;
    youtubeURL?: string;
  };
}

export class IndomioTransformer {
  private mapPropertyType(type: string): { category: string; subCategory: string } {
    // Map our property types to Indomio's categories
    const typeMap: Record<string, { category: string; subCategory: string }> = {
      "apartment": { category: "residential", subCategory: "apartment" },
      "house": { category: "residential", subCategory: "detached" },
      "villa": { category: "residential", subCategory: "villa" },
      "office": { category: "commercial", subCategory: "office" },
      "land": { category: "land", subCategory: "plot" },
      "parking": { category: "other", subCategory: "parking spot" }
    };

    return typeMap[type.toLowerCase()] || { category: "residential", subCategory: "apartment" };
  }

  private mapStatus(condition: string): string {
    const statusMap: Record<string, string> = {
      "new": "newly built",
      "good": "good",
      "needs_renovation": "requires renovation",
      "under_construction": "under construction",
      "renovated": "renovated"
    };

    return statusMap[condition] || "good";
  }

  transform(property: Property): IndomioProperty {
    const propertyType = this.mapPropertyType(property.propertyType);

    const indomioProperty: IndomioProperty = {
      mainFeatures: {
        id: property.id,
        brokerListingID: `ALB-${property.id}`,
        dateUpdated: new Date().toISOString().split('T')[0],
        dateAvailable: new Date().toISOString().split('T')[0],
        size: Number(property.squareMeters) || 0,
        listingType: (property.listingType || "for sale") as "for sale" | "for rent",
        price: {
          amount: Number(property.price) || 0,
          currency: "EUR"
        },
        investment: Boolean(property.investment),
        noAgentFee: false
      },
      location: {
        geographyId: 507074, // Default to Tirana
        originalLocation: `${property.city}\\${property.state || ""}`,
        addresses: {
          address: [{
            language: "sq",
            streetAddress: property.address
          }],
          addressVisible: true
        },
        geocodes: property.coordinates ? {
          latitude: Number(property.coordinates.lat) || 0,
          longitude: Number(property.coordinates.lng) || 0
        } : undefined,
        zip: property.zipCode,
        zoning: "residential",
        roadType: "asphalt"
      },
      categoryFeatures: {
        propertyType,
        originalPropertyType: property.propertyType,
        residential_features: propertyType.category === "residential" ? {
          bedrooms: Number(property.bedrooms) || 0,
          bathrooms: Number(property.bathrooms) || 0,
          status: this.mapStatus(property.condition || "good"),
          constructionYear: property.yearBuilt || undefined,
          furnished: Boolean(property.furnished),
          airConditioning: Array.isArray(property.features) && property.features.includes("air conditioning"),
          elevator: Array.isArray(property.features) && property.features.includes("elevator"),
          floorNumber: property.floor?.toString() || "ground floor",
          levels: 1
        } : undefined
      },
      descriptions: [{
        language: "sq",
        description: property.description
      }],
      media: {
        photos: property.images?.map((url, index) => ({
          url,
          priority: index + 1
        }))
      }
    };

    return indomioProperty;
  }

  toXML(property: IndomioProperty): string {
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('properties', { 
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:noNamespaceSchemaLocation': 'indomio.xsd'
      });

    const propertyEle = root.ele('property');

    // Main Features
    const mainFeatures = propertyEle.ele('mainFeatures');
    Object.entries(property.mainFeatures).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'price') {
          const price = mainFeatures.ele('price');
          price.ele('amount').txt(value.amount.toString());
          price.ele('currency').txt(value.currency);
        } else {
          mainFeatures.ele(key).txt(value.toString());
        }
      }
    });

    // Location
    const location = propertyEle.ele('location');
    Object.entries(property.location).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'addresses') {
          const addresses = location.ele('addresses');
          value.address.forEach(addr => {
            const address = addresses.ele('address');
            address.ele('language').txt(addr.language);
            address.ele('streetAddress').txt(addr.streetAddress);
          });
          addresses.ele('addressVisible').txt(value.addressVisible.toString());
        } else if (key === 'geocodes') {
          const geocodes = location.ele('geocodes');
          geocodes.ele('latitude').txt(value.latitude.toString());
          geocodes.ele('longitude').txt(value.longitude.toString());
        } else {
          location.ele(key).txt(value.toString());
        }
      }
    });

    // Category Features
    const categoryFeatures = propertyEle.ele('categoryFeatures');
    categoryFeatures.ele('propertyType')
      .att('category', property.categoryFeatures.propertyType.category)
      .att('subCategory', property.categoryFeatures.propertyType.subCategory);

    if (property.categoryFeatures.residential_features) {
      const features = categoryFeatures.ele('residential_features');
      Object.entries(property.categoryFeatures.residential_features).forEach(([key, value]) => {
        if (value !== undefined) {
          features.ele(key).txt(value.toString());
        }
      });
    }

    // Descriptions
    if (property.descriptions?.length) {
      const descriptions = propertyEle.ele('descriptions');
      property.descriptions.forEach(desc => {
        const description = descriptions.ele('description');
        description.ele('language').txt(desc.language);
        description.ele('description').dat(desc.description);
      });
    }

    // Media
    if (property.media?.photos?.length) {
      const media = propertyEle.ele('media');
      const photos = media.ele('photos');
      property.media.photos.forEach(photo => {
        const photoEle = photos.ele('photo');
        photoEle.ele('url').dat(photo.url);
        photoEle.ele('priority').txt(photo.priority.toString());
      });
    }

    return root.end({ prettyPrint: true });
  }
}

export const indomioTransformer = new IndomioTransformer();