import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Helper function to parse text amounts to numbers
function parseAmount(value: string | number): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  
  // Handle written numbers
  const textToNum: Record<string, number> = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
    'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
    'eighty': 80, 'ninety': 90, 'hundred': 100, 'thousand': 1000, 'million': 1000000
  };
  
  const cleanValue = value.toLowerCase().trim();
  
  // Handle simple numeric strings
  const numericValue = parseFloat(cleanValue.replace(/[,$]/g, ''));
  if (!isNaN(numericValue)) return numericValue;
  
  // Handle written numbers like "two thousand five hundred"
  const words = cleanValue.split(/\s+/);
  let total = 0;
  let current = 0;
  
  for (const word of words) {
    const num = textToNum[word];
    if (num !== undefined) {
      if (num === 100) {
        current *= 100;
      } else if (num === 1000) {
        total += current * 1000;
        current = 0;
      } else if (num === 1000000) {
        total += current * 1000000;
        current = 0;
      } else {
        current += num;
      }
    }
  }
  
  return total + current;
}

// Get a specific savings goal by ID
export const getSavingsGoal = query({
  args: { goalId: v.id("savingsGoals") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.goalId);
  },
});

// Get savings history for a goal
export const getSavingsHistory = query({
  args: { 
    goalId: v.id("savingsGoals"), 
    months: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    const months = args.months || 6;
    const history = await ctx.db
      .query("savingsHistory")
      .withIndex("by_goal", q => q.eq("goalId", args.goalId))
      .order("desc")
      .take(months);
    
    // Sort by month in ascending order for display
    return history.sort((a, b) => a.month.localeCompare(b.month));
  },
});

// Get savings insights for a goal
export const getSavingsInsights = query({
  args: { goalId: v.id("savingsGoals") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("savingsInsights")
      .withIndex("by_goal", q => q.eq("goalId", args.goalId))
      .order("desc")
      .take(5);
  },
});

// Get or create a savings goal for the user
export const getOrCreateSavingsGoal = mutation({
  args: { 
    userId: v.string(),
    goalName: v.string(),
    goalAmount: v.union(v.number(), v.string()),
    currentSavings: v.optional(v.union(v.number(), v.string())),
    deadline: v.optional(v.string()),
    monthlyTarget: v.optional(v.union(v.number(), v.string())),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Parse string amounts to numbers
    const goalAmount = parseAmount(args.goalAmount);
    const currentSavings = args.currentSavings ? parseAmount(args.currentSavings) : undefined;
    const monthlyTarget = args.monthlyTarget ? parseAmount(args.monthlyTarget) : undefined;
    
    // Check if user already has a goal with this name
    const existingGoal = await ctx.db
      .query("savingsGoals")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .filter(q => q.eq(q.field("goalName"), args.goalName))
      .first();
    
    if (existingGoal) {
      // Update existing goal
      await ctx.db.patch(existingGoal._id, {
        currentSavings: currentSavings ?? existingGoal.currentSavings,
        goalAmount: goalAmount,
        deadline: args.deadline,
        monthlyTarget: monthlyTarget,
        updatedAt: Date.now(),
      });
      return existingGoal._id;
    } else {
      // Create new goal
      const goalId = await ctx.db.insert("savingsGoals", {
        userId: args.userId,
        goalName: args.goalName,
        goalAmount: goalAmount,
        currentSavings: currentSavings ?? 35000, // Default to $35,000
        deadline: args.deadline,
        monthlyTarget: monthlyTarget,
        currency: args.currency || "USD",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      // Generate sample history data for demo
      await generateSampleHistory(ctx, args.userId, goalId);
      await generateSampleInsights(ctx, args.userId, goalId, args.goalName);
      
      return goalId;
    }
  },
});

// Helper function to generate sample history
async function generateSampleHistory(ctx: any, userId: string, goalId: any) {
  const months = [
    { month: "2024-07", amount: 1200, percentChange: 12 },
    { month: "2024-08", amount: 1450, percentChange: 21 },
    { month: "2024-09", amount: 980, percentChange: -15 },
    { month: "2024-10", amount: 1100, percentChange: 2 },
    { month: "2024-11", amount: 1350, percentChange: 23 },
    { month: "2024-12", amount: 1500, percentChange: 11 },
  ];
  
  for (const data of months) {
    await ctx.db.insert("savingsHistory", {
      userId,
      goalId,
      month: data.month,
      amount: data.amount,
      percentChange: data.percentChange,
      createdAt: Date.now(),
    });
  }
}

// Helper function to generate sample insights
async function generateSampleInsights(ctx: any, userId: string, goalId: any, goalName: string) {
  const insights = [
    { type: "tip" as const, content: `Increase your monthly savings by 10% to reach your ${goalName} goal 2 months earlier`, priority: 5 },
    { type: "trend" as const, content: "Your savings have increased by 23% over the last 3 months", priority: 4 },
    { type: "milestone" as const, content: "You're 65% of the way to your goal! Keep up the great work!", priority: 3 },
    { type: "tip" as const, content: "Consider automating your savings transfers on payday", priority: 2 },
    { type: "tip" as const, content: "Review your subscriptions - you could save an extra $50/month", priority: 1 },
  ];
  
  for (const insight of insights) {
    await ctx.db.insert("savingsInsights", {
      userId,
      goalId,
      type: insight.type,
      content: insight.content,
      priority: insight.priority,
      createdAt: Date.now(),
    });
  }
}