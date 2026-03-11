import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get user's default or specified document
export const getDocument = query({
  args: { 
    userId: v.string(),
    documentId: v.optional(v.string())
  },
  handler: async (ctx, { userId, documentId }) => {
    if (documentId) {
      // Get specific document by ID
      const document = await ctx.db
        .query("documents")
        .withIndex("by_document_id", (q) => q.eq("documentId", documentId))
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();
      return document;
    } else {
      // Get user's default document
      const defaultDoc = await ctx.db
        .query("documents")
        .withIndex("by_user_default", (q) => q.eq("userId", userId).eq("isDefault", true))
        .first();
      
      if (defaultDoc) return defaultDoc;
      
      // If no default, get the most recent document
      const recentDoc = await ctx.db
        .query("documents")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .first();
      
      return recentDoc;
    }
  },
});

// Get all user's documents
export const getUserDocuments = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Create a new document
export const createDocument = mutation({
  args: {
    userId: v.string(),
    documentType: v.string(),
    documentId: v.string(),
    fullName: v.string(),
    dateOfBirth: v.string(),
    expirationDate: v.string(),
    issuingState: v.optional(v.string()),
    address: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    restrictions: v.optional(v.string()),
    endorsements: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // If this is marked as default, unmark any other default documents
    if (args.isDefault) {
      const existingDefaults = await ctx.db
        .query("documents")
        .withIndex("by_user_default", (q) => q.eq("userId", args.userId).eq("isDefault", true))
        .collect();
      
      for (const doc of existingDefaults) {
        await ctx.db.patch(doc._id, { isDefault: false });
      }
    }
    
    return await ctx.db.insert("documents", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update document
export const updateDocument = mutation({
  args: {
    documentId: v.id("documents"),
    updates: v.object({
      documentType: v.optional(v.string()),
      fullName: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      expirationDate: v.optional(v.string()),
      issuingState: v.optional(v.string()),
      address: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      restrictions: v.optional(v.string()),
      endorsements: v.optional(v.string()),
      isDefault: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { documentId, updates }) => {
    const document = await ctx.db.get(documentId);
    if (!document) {
      throw new Error("Document not found");
    }
    
    // If updating to default, unmark other defaults
    if (updates.isDefault) {
      const existingDefaults = await ctx.db
        .query("documents")
        .withIndex("by_user_default", (q) => q.eq("userId", document.userId).eq("isDefault", true))
        .filter((q) => q.neq(q.field("_id"), documentId))
        .collect();
      
      for (const doc of existingDefaults) {
        await ctx.db.patch(doc._id, { isDefault: false });
      }
    }
    
    return await ctx.db.patch(documentId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete document
export const deleteDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    return await ctx.db.delete(documentId);
  },
});