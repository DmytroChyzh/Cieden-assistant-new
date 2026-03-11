import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedSampleDocuments = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // Check if user already has documents
    const existingDocs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    if (existingDocs.length > 0) {
      return { message: "User already has documents", count: existingDocs.length };
    }
    
    const now = Date.now();
    
    // Sample Driver's License - European profile
    const driverLicenseId = await ctx.db.insert("documents", {
      userId,
      documentType: "Driver's License",
      documentId: "DE-BY-92837465",
      fullName: "Sophie Emilia Müller",
      dateOfBirth: "1988-04-17",
      expirationDate: "2030-04-17",
      issuingState: "Bavaria",
      address: "Schlossstrasse 12, 80359 Munich, Germany",
      imageUrl: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=150&h=150&fit=crop&crop=face",
      restrictions: "Class B",
      endorsements: "EU Category B",
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    });
    
    // Sample Passport
    const passportId = await ctx.db.insert("documents", {
      userId,
      documentType: "German Passport",
      documentId: "C01X92HT5",
      fullName: "Sophie Emilia Müller", 
      dateOfBirth: "1988-04-17",
      expirationDate: "2033-09-22",
      issuingState: "Germany",
      address: "Schlossstrasse 12, 80359 Munich, Germany",
      imageUrl: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=150&h=150&fit=crop&crop=face",
      isDefault: false,
      createdAt: now - 86400000, // Created 1 day ago
      updatedAt: now - 86400000,
    });
    
    // Sample EU National ID Card
    const idCardId = await ctx.db.insert("documents", {
      userId,
      documentType: "EU National ID",
      documentId: "ID-DE-458219",
      fullName: "Sophie Emilia Müller",
      dateOfBirth: "1988-04-17",
      expirationDate: "2026-02-01",
      issuingState: "European Union",
      address: "Emser Straße 45, 12051 Berlin, Germany",
      imageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop&crop=face",
      restrictions: "NONE",
      isDefault: false,
      createdAt: now - 172800000, // Created 2 days ago
      updatedAt: now - 172800000,
    });
    
    return {
      message: "Sample documents seeded successfully",
      documentsCreated: [driverLicenseId, passportId, idCardId]
    };
  }
});