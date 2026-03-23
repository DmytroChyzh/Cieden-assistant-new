"use client";

import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Phone, 
  Mail, 
  CreditCard, 
  FileText, 
  DollarSign, 
  MapPin,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PIIChipProps {
  type: 'phone' | 'email' | 'aadhaar' | 'pan' | 'card' | 'account' | 'amount' | 'address';
  label: string;
  className?: string;
}

const PII_CHIP_CONFIG = {
  phone: {
    icon: Phone,
    bgColor: 'bg-blue-100 hover:bg-blue-200',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
    hoverText: 'Phone number hidden for privacy'
  },
  email: {
    icon: Mail,
    bgColor: 'bg-purple-100 hover:bg-purple-200',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-300',
    hoverText: 'Email address hidden for privacy'
  },
  aadhaar: {
    icon: FileText,
    bgColor: 'bg-orange-100 hover:bg-orange-200',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
    hoverText: 'Aadhaar number hidden for privacy'
  },
  pan: {
    icon: FileText,
    bgColor: 'bg-green-100 hover:bg-green-200',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    hoverText: 'PAN number hidden for privacy'
  },
  card: {
    icon: CreditCard,
    bgColor: 'bg-indigo-100 hover:bg-indigo-200',
    textColor: 'text-indigo-800',
    borderColor: 'border-indigo-300',
    hoverText: 'Card number hidden for privacy'
  },
  account: {
    icon: FileText,
    bgColor: 'bg-teal-100 hover:bg-teal-200',
    textColor: 'text-teal-800',
    borderColor: 'border-teal-300',
    hoverText: 'Account number hidden for privacy'
  },
  amount: {
    icon: DollarSign,
    bgColor: 'bg-rose-100 hover:bg-rose-200',
    textColor: 'text-rose-800',
    borderColor: 'border-rose-300',
    hoverText: 'Amount hidden for privacy'
  },
  address: {
    icon: MapPin,
    bgColor: 'bg-amber-100 hover:bg-amber-200',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-300',
    hoverText: 'Address hidden for privacy'
  }
};

export function PIIChip({ type, label, className }: PIIChipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = PII_CHIP_CONFIG[type];
  const Icon = config.icon;
  
  return (
    <div 
      className="inline-flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Badge
        variant="outline"
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all duration-200 cursor-help border rounded-full",
          config.bgColor,
          config.textColor,
          config.borderColor,
          className
        )}
        title={config.hoverText}
      >
        <Shield className="h-3 w-3" />
        <Icon className="h-3 w-3" />
        <span>{label}</span>
        <EyeOff className="h-3 w-3 opacity-60" />
      </Badge>
      
      {/* Tooltip */}
      {isHovered && (
        <div className="fixed z-50 bg-gray-900 text-white text-xs rounded-md px-2 py-1 pointer-events-none transform -translate-y-8 ml-2 whitespace-nowrap">
          {config.hoverText}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

// Component for rendering message content with PII chips
export function MessageContentWithPII({ content, isCustomerMessage }: { 
  content: string; 
  isCustomerMessage: boolean;
}) {
  type ParsedPart =
    | { type: "text"; content: string }
    | { type: "chip"; chipType: PIIChipProps["type"]; chipLabel: string };

  // For agent messages, show content as-is
  if (!isCustomerMessage) {
    return <span>{content}</span>;
  }
  
  // Parse PII chips from customer messages
  const chipPattern = /<PII_CHIP type="([^"]+)" label="([^"]+)" \/>/g;
  const parts: ParsedPart[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = chipPattern.exec(content)) !== null) {
    // Add text before chip
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index);
      if (textContent.trim()) {
        parts.push({ type: 'text', content: textContent });
      }
    }
    
    // Add chip
    const chipType = match[1] as PIIChipProps["type"];
    const chipLabel = match[2];
    if (chipLabel) {
      parts.push({ type: "chip", chipType, chipLabel });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex);
    if (textContent.trim()) {
      parts.push({ type: 'text', content: textContent });
    }
  }
  
  // If no chips found, return original content
  if (parts.length === 0) {
    return <span>{content}</span>;
  }
  
  return (
    <span>
      {parts.map((part, index) => (
        part.type === 'text' ? (
          <span key={index}>{part.content}</span>
        ) : (
          <PIIChip 
            key={index}
            type={part.chipType}
            label={part.chipLabel}
            className="mx-1"
          />
        )
      ))}
    </span>
  );
}