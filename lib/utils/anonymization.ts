// Fun animal names for anonymization (Google Docs style)
const ANIMAL_NAMES = [
  'Curious Cat', 'Brave Bear', 'Clever Crow', 'Dancing Dolphin', 'Elegant Elephant',
  'Funny Fox', 'Gentle Giraffe', 'Happy Hippo', 'Intelligent Iguana', 'Jolly Jaguar',
  'Kind Koala', 'Laughing Lion', 'Mysterious Mouse', 'Noble Narwhal', 'Optimistic Owl',
  'Playful Penguin', 'Quiet Quail', 'Radiant Rabbit', 'Speedy Squirrel', 'Thoughtful Tiger',
  'Unique Unicorn', 'Vibrant Vulture', 'Wise Wolf', 'Excited Xerus', 'Youthful Yak',
  'Zealous Zebra', 'Adventurous Alpaca', 'Bold Badger', 'Charming Cheetah', 'Daring Duck',
  'Energetic Emu', 'Fearless Flamingo', 'Graceful Gazelle', 'Helpful Hedgehog', 'Inspiring Ibis',
  'Joyful Jackal', 'Keen Kangaroo', 'Loyal Lemur', 'Magnificent Moose', 'Nimble Newt',
  'Outstanding Otter', 'Peaceful Panda', 'Quick Quokka', 'Reliable Rhino', 'Smart Seal',
  'Talented Turtle', 'Understanding Uakari', 'Vivacious Viper', 'Wonderful Whale', 'Extraordinary Xerus'
];

const COLORS = [
  'Purple', 'Blue', 'Green', 'Orange', 'Red', 'Pink', 'Teal', 'Indigo', 
  'Amber', 'Lime', 'Cyan', 'Rose', 'Violet', 'Emerald', 'Yellow'
];

// Generate consistent anonymized name based on original name
export function getAnonymizedName(originalName: string): string {
  // Create a simple hash from the original name for consistency
  let hash = 0;
  for (let i = 0; i < originalName.length; i++) {
    const char = originalName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const animalIndex = Math.abs(hash) % ANIMAL_NAMES.length;
  const colorIndex = Math.abs(hash >> 8) % COLORS.length;
  
  return `${COLORS[colorIndex]} ${ANIMAL_NAMES[animalIndex]}`;
}

// PII patterns to detect and mask with chip-friendly labels
const PII_PATTERNS = [
  // Phone numbers (various formats)
  { pattern: /(\+1[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g, replacement: '<PII_CHIP type="phone" label="Phone Number" />', chipType: 'phone' },
  { pattern: /(\+\d{1,3}[\s-]?)?\d{10,}/g, replacement: '<PII_CHIP type="phone" label="Phone Number" />', chipType: 'phone' },

  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '<PII_CHIP type="email" label="Email Address" />', chipType: 'email' },

  // US Social Security numbers
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '<PII_CHIP type="ssn" label="SSN" />', chipType: 'ssn' },

  // Credit card numbers (basic pattern)
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '<PII_CHIP type="card" label="Card Number" />', chipType: 'card' },
  
  // Account numbers (6-18 digits)
  { pattern: /\b\d{6,18}\b/g, replacement: '<PII_CHIP type="account" label="Account Number" />', chipType: 'account' },
  
  // Amounts with currency symbols
  { pattern: /\$[\s]?[\d,]+(?:\.\d{2})?/g, replacement: '<PII_CHIP type="amount" label="Amount" />', chipType: 'amount' },
  { pattern: /USD\s?[\d,]+(?:\.\d{2})?/gi, replacement: '<PII_CHIP type="amount" label="Amount" />', chipType: 'amount' },
  
  // Addresses (basic patterns)
  { pattern: /\d+[\s,]+[A-Za-z\s,.-]+(?:Street|St\.|Avenue|Ave\.|Road|Rd\.|Boulevard|Blvd\.|Drive|Dr\.|Court|Ct\.|Lane|Ln\.|Way|Suite|Apt|New\sYork|Los\sAngeles|Chicago|Dallas|Seattle|Boston)/gi, replacement: '<PII_CHIP type="address" label="Address" />', chipType: 'address' },
];

// Mask PII in message content (only for customer messages)
export function maskPII(content: string, isCustomerMessage: boolean = true): { maskedContent: string; hasPII: boolean; piiTypes: string[] } {
  // Don't mask agent messages
  if (!isCustomerMessage) {
    return { maskedContent: content, hasPII: false, piiTypes: [] };
  }
  
  let maskedContent = content;
  let hasPII = false;
  const piiTypes: string[] = [];
  
  PII_PATTERNS.forEach(({ pattern, replacement, chipType }) => {
    if (pattern.test(maskedContent)) {
      hasPII = true;
      piiTypes.push(chipType);
      maskedContent = maskedContent.replace(pattern, replacement);
    }
  });
  
  return { maskedContent, hasPII, piiTypes };
}

// Parse PII chips from masked content and return structured data
export function parsePIIChips(maskedContent: string): { 
  segments: Array<{ type: 'text' | 'chip'; content: string; chipType?: string; chipLabel?: string }> 
} {
  const segments: Array<{ type: 'text' | 'chip'; content: string; chipType?: string; chipLabel?: string }> = [];
  const chipPattern = /<PII_CHIP type="([^"]+)" label="([^"]+)" \/>/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = chipPattern.exec(maskedContent)) !== null) {
    // Add text before chip
    if (match.index > lastIndex) {
      const textContent = maskedContent.slice(lastIndex, match.index);
      if (textContent.trim()) {
        segments.push({ type: 'text', content: textContent });
      }
    }
    
    // Add chip
    segments.push({ 
      type: 'chip', 
      content: match[0],
      chipType: match[1],
      chipLabel: match[2]
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < maskedContent.length) {
    const textContent = maskedContent.slice(lastIndex);
    if (textContent.trim()) {
      segments.push({ type: 'text', content: textContent });
    }
  }
  
  return { segments };
}

// Generate conversation summary based on messages
export function generateConversationSummary(messages: any[]): string {
  if (messages.length === 0) return 'No messages in this conversation.';
  
  const firstMessage = messages[0];
  const lastMessage = messages[messages.length - 1];
  
  // Extract key topics/issues from first few messages
  const firstFewMessages = messages.slice(0, 3).map(m => m.content).join(' ');
  
  // Simple keyword-based summarization
  const summaries: { [key: string]: string } = {
    'loan': 'Customer inquired about loan application process and eligibility requirements.',
    'card': 'Customer reported issues with card activation and usage.',
    'payment': 'Customer experienced payment processing difficulties.',
    'account': 'Customer needed help with account access and management.',
    'insurance': 'Customer requested assistance with insurance policy and claims.',
    'emi': 'Customer asked about EMI options and prepayment procedures.',
    'investment': 'Customer sought guidance on investment products and portfolio.',
    'fraud': 'Customer reported security concerns and suspicious activities.',
    'budget': 'Customer requested help with budgeting tools and expense tracking.',
  };
  
  // Find matching summary based on content
  const lowerContent = firstFewMessages.toLowerCase();
  let summary = 'Customer contacted support for assistance with financial services.';
  
  for (const [keyword, desc] of Object.entries(summaries)) {
    if (lowerContent.includes(keyword)) {
      summary = desc;
      break;
    }
  }
  
  // Add resolution status
  const hasAgentResponse = messages.some(m => m.sender === 'agent');
  const lastMessageFromAgent = lastMessage.sender === 'agent';
  
  if (hasAgentResponse && lastMessageFromAgent) {
    summary += ' Issue addressed by support team.';
  } else if (hasAgentResponse) {
    summary += ' Support team provided assistance, awaiting customer response.';
  }
  
  return summary;
}

// Generate avatar initials from anonymized name
export function getAvatarInitials(anonymizedName: string): string {
  return anonymizedName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// Get consistent color for avatar based on name
export function getAvatarColor(anonymizedName: string): string {
  const colors = [
    'from-purple-500 to-purple-600',
    'from-blue-500 to-blue-600', 
    'from-green-500 to-green-600',
    'from-orange-500 to-orange-600',
    'from-red-500 to-red-600',
    'from-pink-500 to-pink-600',
    'from-teal-500 to-teal-600',
    'from-indigo-500 to-indigo-600',
  ];
  
  let hash = 0;
  for (let i = 0; i < anonymizedName.length; i++) {
    hash = ((hash << 5) - hash) + anonymizedName.charCodeAt(i);
    hash = hash & hash;
  }
  
  return colors[Math.abs(hash) % colors.length];
}