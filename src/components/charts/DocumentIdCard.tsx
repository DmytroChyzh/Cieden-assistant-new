"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, Calendar, MapPin, Hash, AlertTriangle, QrCode, CreditCard } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogClose,
  MorphingDialogDescription,
} from "@/src/components/ui/morphing-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DocumentIdCardProps {
  userId: string;
  documentId?: string; // Optional - if not provided, shows default document
  className?: string;
  onUserAction?: ((text: string) => void) | null;
}

// QR Code Component - More complex pattern for secure documents
const QRCodePattern = ({ size = 80 }: { size?: number }) => {
  // Generate a consistent but complex pattern
  const seed = 12345; // Fixed seed for consistent pattern
  const random = (index: number) => {
    const x = Math.sin(seed + index) * 10000;
    return x - Math.floor(x);
  };
  
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="w-full h-full">
      {/* Corner position markers */}
      <rect x="4" y="4" width="20" height="20" fill="black" />
      <rect x="6" y="6" width="16" height="16" fill="white" />
      <rect x="8" y="8" width="12" height="12" fill="black" />
      
      <rect x="96" y="4" width="20" height="20" fill="black" />
      <rect x="98" y="6" width="16" height="16" fill="white" />
      <rect x="100" y="8" width="12" height="12" fill="black" />
      
      <rect x="4" y="96" width="20" height="20" fill="black" />
      <rect x="6" y="98" width="16" height="16" fill="white" />
      <rect x="8" y="100" width="12" height="12" fill="black" />
      
      {/* Alignment pattern in center */}
      <rect x="52" y="52" width="16" height="16" fill="black" />
      <rect x="54" y="54" width="12" height="12" fill="white" />
      <rect x="56" y="56" width="8" height="8" fill="black" />
      
      {/* Dense data pattern - much more complex */}
      {Array.from({ length: 200 }, (_, i) => {
        const gridSize = 12;
        const cellSize = 3;
        const x = (i % gridSize) * 8 + 28;
        const y = Math.floor(i / gridSize) * 6 + 28;
        
        // Skip areas that overlap with position markers
        if ((x < 28 && y < 28) || (x > 88 && y < 28) || (x < 28 && y > 88)) {
          return null;
        }
        
        // Skip center alignment pattern area
        if (x >= 50 && x <= 70 && y >= 50 && y <= 70) {
          return null;
        }
        
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={cellSize}
            height={cellSize}
            fill={random(i) > 0.45 ? "black" : "white"}
          />
        );
      })}
      
      {/* Additional small dots for high density */}
      {Array.from({ length: 150 }, (_, i) => {
        const x = 28 + (i % 15) * 4;
        const y = 28 + Math.floor(i / 15) * 4;
        
        // Skip special areas
        if ((x < 28 && y < 28) || (x > 88 && y < 28) || (x < 28 && y > 88)) {
          return null;
        }
        if (x >= 50 && x <= 70 && y >= 50 && y <= 70) {
          return null;
        }
        
        return (
          <rect
            key={`dot-${i}`}
            x={x}
            y={y}
            width="1.5"
            height="1.5"
            fill={random(i + 1000) > 0.5 ? "black" : "transparent"}
          />
        );
      })}
    </svg>
  );
};

export function DocumentIdCard({
  userId,
  documentId,
  className,
  onUserAction,
}: DocumentIdCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // Fetch document data from Convex
  const document = useQuery(api.documents.getDocument, { 
    userId, 
    documentId: documentId || undefined 
  });

  // Show loading state
  if (document === undefined) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("w-full max-w-[350px] mx-auto", className)}
      >
        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-500/10 border-slate-500/30">
          <CardContent className="p-6 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mx-auto"></div>
              <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg w-12 mx-auto"></div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="text-sm text-slate-500 mt-4">Loading document...</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Show not found state
  if (document === null) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("w-full max-w-[350px] mx-auto", className)}
      >
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-amber-700 dark:text-amber-300 mb-2">
              No Document Found
            </h3>
            <p className="text-amber-600 dark:text-amber-400 text-sm">
              {documentId ? `Document ID "${documentId}" not found` : "No documents on file"}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Extract document properties
  const {
    documentType,
    documentId: docId,
    fullName,
    dateOfBirth,
    expirationDate,
    issuingState,
    address,
    imageUrl,
    restrictions,
    endorsements
  } = document;
  // Check if document is expired
  const isExpired = new Date(expirationDate) < new Date();
  
  // Format dates for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Handle user interactions
  const handleViewDetails = () => {
    if (onUserAction) {
      onUserAction(`User viewed full details for ${documentType} belonging to ${fullName}`);
    }
  };

  const handleDocumentClick = () => {
    if (onUserAction) {
      onUserAction(`User clicked on ${documentType} document for ${fullName}`);
    }
  };

  // Use a stock image if none provided
  const displayImage = imageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face";

  return (
    <div
      className="relative max-w-[480px] mx-auto"
      style={{ perspective: "1000px", zIndex: 50 }}
    >
      <motion.div
        className="relative"
        animate={{
          rotateY: isFlipped ? 180 : 0,
        }}
        transition={{
          duration: 0.8,
          ease: "easeInOut",
        }}
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {/* Front side - Document ID Card */}
        <motion.div
          className="w-full"
          animate={{
            boxShadow: isFlipped 
              ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" 
              : "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
          }}
          style={{
            backfaceVisibility: "hidden",
          }}
        >
          <MorphingDialog
            transition={{
              type: "spring",
              bounce: 0.05,
              duration: 0.3,
            }}
          >
      <MorphingDialogTrigger
        style={{
          borderRadius: "20px",
        }}
        className={cn(
          "flex max-w-[480px] flex-col overflow-hidden border border-zinc-950/10 bg-white dark:bg-zinc-900 hover:shadow-lg transition-all duration-200",
          "border-2 transition-all duration-300",
          isExpired 
            ? "border-red-500/30" 
            : "border-violet-500/30",
          className
        )}
      >
        {/* Stable Header - Non-morphing, just moves with container */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4">
            <img
              src={displayImage}
              alt={`Photo for ${fullName}`}
              className="w-20 h-20 rounded-lg object-cover border-2 border-zinc-200 dark:border-zinc-700 flex-shrink-0"
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="text-lg font-semibold text-zinc-950 dark:text-zinc-50 truncate mb-1">
                    {fullName}
                  </div>
                  <div className="text-sm text-zinc-700 dark:text-zinc-400">
                    {documentType} {/* Valid tag moved to bottom section */}
                    <span className={cn(
                      "ml-2 px-2 py-0.5 rounded-full text-xs font-medium",
                      isExpired 
                        ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                        : "bg-green-500/20 text-green-400 border border-green-500/30"
                    )}>
                      {isExpired ? "Expired" : "Valid"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Valid until {formatDate(expirationDate)}
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Content Area - Basic info in collapsed view */}
        <div className="px-6 pb-6 pt-0 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between pt-4">
            <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <Hash className="h-3 w-3" />
                <span className="truncate">{docId}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>DOB: {formatDate(dateOfBirth)}</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(!isFlipped);
              }}
              className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <QrCode className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
        </div>
      </MorphingDialogTrigger>

      <MorphingDialogContainer>
        <MorphingDialogContent
          style={{
            borderRadius: "20px",
          }}
          className="pointer-events-auto relative flex h-auto w-full flex-col overflow-hidden border border-zinc-950/10 bg-white dark:border-zinc-50/10 dark:bg-zinc-900 sm:w-[500px] max-h-[90vh]"
        >
          {/* Stable Header - Identical to trigger, non-morphing */}
          <div className="p-6 pb-4">
            <div className="flex items-center gap-4">
              <img
                src={displayImage}
                alt={`Photo for ${fullName}`}
                className="w-20 h-20 rounded-lg object-cover border-2 border-zinc-200 dark:border-zinc-700 flex-shrink-0"
              />
              
              <div className="flex-1 min-w-0">
                <div className="mb-2">
                  <div className="text-lg font-semibold text-zinc-950 dark:text-zinc-50 truncate mb-1">
                    {fullName}
                  </div>
                  <div className="text-sm text-zinc-700 dark:text-zinc-400">
                    {documentType}
                    <span className={cn(
                      "ml-2 px-2 py-0.5 rounded-full text-xs font-medium",
                      isExpired 
                        ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                        : "bg-green-500/20 text-green-400 border border-green-500/30"
                    )}>
                      {isExpired ? "Expired" : "Valid"}
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Valid until {formatDate(expirationDate)}
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Content Area - Detailed information */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-0 border-t border-zinc-100 dark:border-zinc-800">
            <MorphingDialogDescription
              disableLayoutAnimation
              variants={{
                initial: { opacity: 0, scale: 0.9, y: 20 },
                animate: { opacity: 1, scale: 1, y: 0 },
                exit: { opacity: 0, scale: 0.9, y: 20 },
              }}
            >
              <div className="grid gap-4 pt-3">
                {/* QR Code Section */}
                <div className="flex flex-col items-center pb-3 border-b border-zinc-200 dark:border-zinc-700">
                  <div className="bg-white p-3 rounded-xl shadow-inner border border-zinc-200 dark:border-zinc-700">
                    <div className="w-24 h-24 bg-black rounded relative overflow-hidden">
                      <QRCodePattern size={96} />
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-700 pb-2">
                    Personal Information
                  </h3>
                  
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                      <Hash className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Document ID</p>
                        <p className="font-mono text-sm font-medium text-zinc-950 dark:text-zinc-50">{docId}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                      <Calendar className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Date of Birth</p>
                        <p className="font-medium text-zinc-950 dark:text-zinc-50">{formatDate(dateOfBirth)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                      <Calendar className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Expiration Date</p>
                        <p className={cn(
                          "font-medium",
                          isExpired ? "text-red-600 dark:text-red-400" : "text-zinc-950 dark:text-zinc-50"
                        )}>{formatDate(expirationDate)}</p>
                      </div>
                    </div>
                    
                    {address && (
                      <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                        <MapPin className="h-4 w-4 text-zinc-600 dark:text-zinc-400 mt-1" />
                        <div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">Address</p>
                          <p className="font-medium text-zinc-950 dark:text-zinc-50">{address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                {(restrictions || endorsements) && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-700 pb-2">
                      Additional Information
                    </h3>
                    
                    {restrictions && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mb-1">Restrictions</p>
                        <p className="text-amber-800 dark:text-amber-300">{restrictions}</p>
                      </div>
                    )}
                    
                    {endorsements && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">Endorsements</p>
                        <p className="text-blue-800 dark:text-blue-300">{endorsements}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <motion.button
                  onClick={handleViewDetails}
                  className={cn(
                    "w-full p-4 rounded-lg font-medium transition-all duration-200",
                    isExpired 
                      ? "bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20" 
                      : "bg-violet-500/10 text-violet-600 border border-violet-500/20 hover:bg-violet-500/20"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isExpired ? "Document Expired - Renewal Required" : "Document Verified"}
                </motion.button>
              </div>
            </MorphingDialogDescription>
          </div>

          <MorphingDialogClose className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200" />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
          </motion.div>
        
        {/* Back side - QR Code with MorphingDialog */}
        <motion.div
          className="absolute inset-0 w-full"
          animate={{
            boxShadow: isFlipped 
              ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" 
              : "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
          }}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <MorphingDialog
            transition={{
              type: "spring",
              bounce: 0.05,
              duration: 0.3,
            }}
          >
            <MorphingDialogTrigger
              style={{
                borderRadius: "20px",
              }}
              className={cn(
                "flex max-w-[480px] flex-col overflow-hidden border border-zinc-950/10 bg-white dark:bg-zinc-900 hover:shadow-lg transition-all duration-200 relative",
                "border-2 transition-all duration-300",
                isExpired 
                  ? "border-red-500/30" 
                  : "border-violet-500/30",
                className
              )}
            >
              {/* Simplified header - Compact to match front height */}
              <div className="p-6 pb-3">
                <div className="flex items-center gap-4">
                  <img
                    src={displayImage}
                    alt={`Photo for ${fullName}`}
                    className="w-12 h-12 rounded-lg object-cover border-2 border-zinc-200 dark:border-zinc-700 flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-zinc-950 dark:text-zinc-50 truncate">
                      {fullName}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                      <QrCode className="h-2.5 w-2.5" />
                      <span>Scan for verification</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Code section - Slightly more compact */}
              <div className="px-6 pb-5 pt-0 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between pt-5">
                  <div className="flex-1 flex justify-center">
                    <div className="bg-white p-2 rounded-lg shadow-inner border border-zinc-200">
                      <div className="w-16 h-16 bg-black rounded relative overflow-hidden">
                        <QRCodePattern size={64} />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFlipped(!isFlipped);
                    }}
                    className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <CreditCard className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                  </button>
                </div>
              </div>
            </MorphingDialogTrigger>

            {/* Expanded view - Same as front side */}
            <MorphingDialogContainer>
              <MorphingDialogContent
                style={{
                  borderRadius: "20px",
                }}
                className="pointer-events-auto relative flex h-auto w-full flex-col overflow-hidden border border-zinc-950/10 bg-white dark:border-zinc-50/10 dark:bg-zinc-900 sm:w-[500px] max-h-[90vh]"
              >
                {/* Stable Header - Full version for expanded view */}
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={displayImage}
                      alt={`Photo for ${fullName}`}
                      className="w-20 h-20 rounded-lg object-cover border-2 border-zinc-200 dark:border-zinc-700 flex-shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="mb-2">
                        <div className="text-lg font-semibold text-zinc-950 dark:text-zinc-50 truncate mb-1">
                          {fullName}
                        </div>
                        <div className="text-sm text-zinc-700 dark:text-zinc-400">
                          {documentType}
                          <span className={cn(
                            "ml-2 px-2 py-0.5 rounded-full text-xs font-medium",
                            isExpired 
                              ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                              : "bg-green-500/20 text-green-400 border border-green-500/30"
                          )}>
                            {isExpired ? "Expired" : "Valid"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Valid until {formatDate(expirationDate)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expandable Content Area - Same as front side expanded view */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 pt-0 border-t border-zinc-100 dark:border-zinc-800">
                  <MorphingDialogDescription
                    disableLayoutAnimation
                    variants={{
                      initial: { opacity: 0, scale: 0.9, y: 20 },
                      animate: { opacity: 1, scale: 1, y: 0 },
                      exit: { opacity: 0, scale: 0.9, y: 20 },
                    }}
                  >
                    <div className="grid gap-4 pt-3">
                      {/* QR Code Section */}
                      <div className="flex flex-col items-center pb-3 border-b border-zinc-200 dark:border-zinc-700">
                        <div className="bg-white p-3 rounded-xl shadow-inner border border-zinc-200 dark:border-zinc-700">
                          <div className="w-24 h-24 bg-black rounded relative overflow-hidden">
                            <QRCodePattern size={96} />
                          </div>
                        </div>
                      </div>

                      {/* Personal Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-700 pb-2">
                          Personal Information
                        </h3>
                        
                        <div className="grid gap-3">
                          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                            <Hash className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            <div>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">Document ID</p>
                              <p className="font-mono text-sm font-medium text-zinc-950 dark:text-zinc-50">{docId}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                            <Calendar className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            <div>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">Date of Birth</p>
                              <p className="font-medium text-zinc-950 dark:text-zinc-50">{formatDate(dateOfBirth)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                            <Calendar className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                            <div>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400">Expiration Date</p>
                              <p className={cn(
                                "font-medium",
                                isExpired ? "text-red-600 dark:text-red-400" : "text-zinc-950 dark:text-zinc-50"
                              )}>{formatDate(expirationDate)}</p>
                            </div>
                          </div>
                          
                          {address && (
                            <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                              <MapPin className="h-4 w-4 text-zinc-600 dark:text-zinc-400 mt-1" />
                              <div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">Address</p>
                                <p className="font-medium text-zinc-950 dark:text-zinc-50">{address}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Information */}
                      {(restrictions || endorsements) && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-700 pb-2">
                            Additional Information
                          </h3>
                          
                          {restrictions && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mb-1">Restrictions</p>
                              <p className="text-amber-800 dark:text-amber-300">{restrictions}</p>
                            </div>
                          )}
                          
                          {endorsements && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-1">Endorsements</p>
                              <p className="text-blue-800 dark:text-blue-300">{endorsements}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      <motion.button
                        onClick={handleViewDetails}
                        className={cn(
                          "w-full p-4 rounded-lg font-medium transition-all duration-200",
                          isExpired 
                            ? "bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20" 
                            : "bg-violet-500/10 text-violet-600 border border-violet-500/20 hover:bg-violet-500/20"
                        )}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isExpired ? "Document Expired - Renewal Required" : "Document Verified"}
                      </motion.button>
                    </div>
                  </MorphingDialogDescription>
                </div>

                <MorphingDialogClose className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200" />
              </MorphingDialogContent>
            </MorphingDialogContainer>
          </MorphingDialog>
        </motion.div>
      </motion.div>
    </div>
  );
}