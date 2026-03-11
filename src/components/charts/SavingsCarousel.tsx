"use client";

import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { motion, PanInfo, useDragControls } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { SavingsGoalCard } from "./SavingsGoalCard";
import { SavingsInsightsCard } from "./SavingsInsightsCard";
import { SavingsTipsCard } from "./SavingsTipsCard";
import { SavingsHistoryPreview } from "./SavingsHistoryPreview";

interface SavingsCarouselProps {
  goalId?: Id<"savingsGoals"> | string;
  initialData?: {
    currentSavings: number;
    goalAmount: number;
    goalName?: string;
    currency?: string;
    deadline?: string;
    monthlyTarget?: number;
  };
  onUserAction?: ((text: string) => void) | null;
}

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

const cardLabels: Readonly<[string, string, string, string]> = ['Goal', 'Insights', 'Tips', 'History'];
const cardAccentDots: Readonly<[string, string, string, string]> = [
  "bg-emerald-300",
  "bg-indigo-300",
  "bg-teal-300",
  "bg-sky-300"
];

const SavingsCarouselComponent = ({
  goalId,
  initialData,
  onUserAction
}: SavingsCarouselProps) => {
  const [currentCard, setCurrentCard] = useState(0);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const dragControls = useDragControls();
  const isDraggingRef = useRef(false);
  
  // Fetch all data from Convex if goalId is provided
  const goal = useQuery(
    api.savings.getSavingsGoal, 
    goalId ? { goalId: goalId as Id<"savingsGoals"> } : "skip"
  );
  
  const history = useQuery(
    api.savings.getSavingsHistory, 
    goalId ? { goalId: goalId as Id<"savingsGoals">, months: 6 } : "skip"
  );
  
  const insights = useQuery(
    api.savings.getSavingsInsights, 
    goalId ? { goalId: goalId as Id<"savingsGoals"> } : "skip"
  );
  
  // Use DB data if available, fallback to initial - memoized for performance
  const displayData = useMemo(() => goal || initialData, [goal, initialData]);
  
  // All hooks must be called before any early returns
  const handleExpand = useCallback((cardIndex: number) => {
    setExpandedCard(cardIndex);
    setCurrentCard(cardIndex);

    if (onUserAction) {
      const label = cardLabels[cardIndex] || `Card ${cardIndex + 1}`;
      if (cardIndex === 0 && displayData?.goalName) {
        onUserAction(`User expanded savings goal details for ${displayData.goalName}`);
      } else {
        onUserAction(`User expanded savings ${label.toLowerCase()} view`);
      }
    }
  }, [onUserAction, displayData]);

  const handleCollapse = useCallback((cardIndex?: number) => {
    if (onUserAction) {
      const label = cardIndex !== undefined
        ? (cardLabels[cardIndex] || `Card ${cardIndex + 1}`)
        : 'card';
      onUserAction(`User collapsed savings ${label.toLowerCase()} view`);
    }

    setExpandedCard(null);
  }, [onUserAction]);
  
  const paginate = useCallback((direction: number) => {
    const newCard = currentCard + direction;
    if (newCard >= 0 && newCard < 4) {
      setCurrentCard(newCard);
      if (onUserAction) {
        const cardNames = ['Goal', 'Insights', 'Tips', 'History'];
        onUserAction(`User swiped to ${cardNames[newCard]} card`);
      }
    }
  }, [currentCard, onUserAction]);
  
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipe = swipePower(info.offset.x, info.velocity.x);
    const dragDistance = Math.abs(info.offset.x);
    
    // Only swipe if significant drag distance (not just a tap)
    if (dragDistance > 50) {
      if (swipe < -swipeConfidenceThreshold) {
        // Swipe left - next card
        paginate(1);
      } else if (swipe > swipeConfidenceThreshold) {
        // Swipe right - previous card
        paginate(-1);
      }
    }
    // Re-enable resize updates after drag completes
    isDraggingRef.current = false;
  }, [paginate]);
  
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    // Check if the clicked element is interactive (button, input, etc.)
    const target = event.target as Element;
    const isInteractive = target.closest('button, input, select, textarea, [role="button"], [tabindex]');
    
    // Only start dragging if not clicking on interactive elements
    if (!isInteractive) {
      isDraggingRef.current = true;
      dragControls.start(event);
    }
  }, [dragControls]);

  const handleCardClick = useCallback((cardIndex: number) => {
    // Only switch cards if not currently dragging and not on an interactive element
    if (expandedCard !== null) {
      return;
    }

    if (cardIndex !== currentCard) {
      setCurrentCard(cardIndex);
      if (onUserAction) {
        onUserAction(`User clicked on ${cardLabels[cardIndex]} card`);
      }
    }
  }, [currentCard, expandedCard, onUserAction]);

  // Stable wrappers to avoid recreating inline callbacks every render
  const onGoalExpand = useCallback(() => handleExpand(0), [handleExpand]);
  const onGoalCollapse = useCallback(() => handleCollapse(0), [handleCollapse]);
  const onInsightsExpand = useCallback(() => handleExpand(1), [handleExpand]);
  const onInsightsCollapse = useCallback(() => handleCollapse(1), [handleCollapse]);
  const onTipsExpand = useCallback(() => handleExpand(2), [handleExpand]);
  const onTipsCollapse = useCallback(() => handleCollapse(2), [handleCollapse]);
  const onHistoryExpand = useCallback(() => handleExpand(3), [handleExpand]);
  const onHistoryCollapse = useCallback(() => handleCollapse(3), [handleCollapse]);

  const onCardClick0 = useCallback(() => handleCardClick(0), [handleCardClick]);
  const onCardClick1 = useCallback(() => handleCardClick(1), [handleCardClick]);
  const onCardClick2 = useCallback(() => handleCardClick(2), [handleCardClick]);
  const onCardClick3 = useCallback(() => handleCardClick(3), [handleCardClick]);

  // Stable indicator click handlers: collapse any expanded card before navigating
  const indicatorClickHandlers = useMemo(() => (
    [0, 1, 2, 3].map((index) => () => {
      if (expandedCard !== null && expandedCard !== index) {
        handleCollapse(expandedCard);
      }
      setCurrentCard(index);
      if (onUserAction) {
        onUserAction(`User tapped ${cardLabels[index]} indicator`);
      }
    })
  ), [expandedCard, handleCollapse, onUserAction]);
  
  // Calculate scale for each card based on distance from current card - memoized
  const getCardScale = useCallback((cardIndex: number) => {
    if (expandedCard !== null) {
      return cardIndex === expandedCard ? 1 : 0.9;
    }

    const distance = Math.abs(cardIndex - currentCard);
    return distance === 0 ? 1 : 0.85; // Active card = 100%, others = 85%
  }, [currentCard, expandedCard]);

  // Calculate opacity for each card based on distance from current card - memoized
  const getCardOpacity = useCallback((cardIndex: number) => {
    // Hide all cards except the expanded/collapsing one when any card is expanded or during collapse
    if (expandedCard !== null) {
      return cardIndex === expandedCard ? 1 : 0.25;
    }
    
    const distance = Math.abs(cardIndex - currentCard);
    if (distance === 0) return 1;
    if (distance === 1) return 0.8;
    return 0.5;
  }, [currentCard, expandedCard]);
  
  // Log for debugging - optimized to avoid unnecessary re-renders
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎠 SavingsCarousel mounted with:', {
        hasGoalId: !!goalId,
        hasData: !!displayData,
        hasOnUserAction: !!onUserAction,
        historyCount: history?.length,
        insightsCount: insights?.length
      });
    }
  }, [goalId, displayData, onUserAction, history?.length, insights?.length]);
  
  // Responsive sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        // Prevent size jitter during drag and ignore tiny 1px changes
        if (isDraggingRef.current) continue;
        const w = Math.round(entry.contentRect.width);
        if (containerWidth == null || Math.abs(w - containerWidth) >= 2) {
          setContainerWidth(w);
        }
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [containerWidth]);

  const gap = 12;
  const peekRight = 28; // show part of next card on mobile
  const computedCardWidth = useMemo(() => {
    // On small containers, compute width to keep a right peek; on large keep default 320
    if (containerWidth && containerWidth < 480) {
      const padding = 8; // matches px-2 wrappers
      const width = containerWidth - peekRight - padding * 2;
      return Math.max(248, Math.min(320, width));
    }
    return 320; // desktop-like width
  }, [containerWidth]);

  const expandedCardWidth = useMemo(() => {
    if (!containerWidth) {
      return Math.max(360, computedCardWidth);
    }

    const padding = 16; // px-2 + px-2 container padding
    const available = Math.max(containerWidth - padding, computedCardWidth);
    return Math.min(available, 560);
  }, [computedCardWidth, containerWidth]);

  const cardWidths = useMemo(() => {
    return [0, 1, 2, 3].map((index) =>
      expandedCard === index ? expandedCardWidth : computedCardWidth
    );
  }, [computedCardWidth, expandedCard, expandedCardWidth]);

  const trackWidth = useMemo(() => {
    const totalCards = cardWidths.reduce((sum, width) => sum + width, 0);
    return totalCards + gap * (cardWidths.length - 1);
  }, [cardWidths, gap]);

  const trackOffset = useMemo(() => {
    let offset = 0;
    for (let i = 0; i < currentCard; i += 1) {
      offset += cardWidths[i] + gap;
    }
    return -offset;
  }, [cardWidths, currentCard, gap]);

  const maxNegativeDrag = useMemo(() => {
    let offset = 0;
    for (let i = 1; i < cardWidths.length; i += 1) {
      offset += cardWidths[i] + gap;
    }
    return -offset;
  }, [cardWidths, gap]);
  
  if (!displayData) {
    return (
      <div className="w-full max-w-sm mx-auto p-4">
        <div className="animate-pulse bg-amber-400/20 rounded-2xl h-64" />
      </div>
    );
  }
  
  return (
    <>
      <div ref={containerRef} className="relative w-full max-w-md mx-auto pb-8" style={{
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        contain: 'layout style paint'
      }}>
        <div className="overflow-hidden px-2" style={{
          willChange: 'transform',
          contain: 'layout style paint'
        }}>
        <motion.div
          drag={expandedCard === null ? "x" : false}
          dragListener={false} // Disable automatic drag - we'll control it manually
          dragControls={dragControls} // Use manual drag controls
          dragConstraints={{ 
            left: maxNegativeDrag,
            right: 0 
          }}
          dragElastic={0.2}
          onDragStart={() => { isDraggingRef.current = true; }}
          onDragEnd={handleDragEnd}
        onPointerDown={expandedCard === null ? handlePointerDown : undefined} // Manual drag initiation
          animate={{ 
            x: trackOffset
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
          className="flex gap-3"
          style={{ 
            width: `${trackWidth}px`,
            pointerEvents: 'auto',
            touchAction: 'pan-x' // Allow horizontal panning
          }}
        >
          {/* Card 1: Main Savings Goal */}
          <motion.div 
            className={cn(
              "flex-shrink-0 cursor-pointer",
              expandedCard === 0 ? "z-20" : expandedCard !== null ? "pointer-events-none" : "pointer-events-auto"
            )}
            animate={{
              scale: getCardScale(0),
              opacity: getCardOpacity(0)
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            style={{ 
              width: `${expandedCard === 0 ? expandedCardWidth : computedCardWidth}px`,
              height: `${expandedCard === 0 ? 460 : 400}px`
            }}
          onClick={onCardClick0}
          >
            <SavingsGoalCard
              layoutId="savings-goal-card"
              isExpanded={expandedCard === 0}
              currentSavings={displayData.currentSavings}
              goalAmount={displayData.goalAmount}
              goalName={displayData.goalName}
              currency={displayData.currency}
              deadline={displayData.deadline}
              monthlyTarget={displayData.monthlyTarget}
              onUserAction={onUserAction}
              onExpand={onGoalExpand}
              onCollapse={onGoalCollapse}
              history={history}
            />
          </motion.div>
          
          {/* Card 2: Insights */}
          <motion.div 
            className={cn(
              "flex-shrink-0 cursor-pointer",
              expandedCard === 1 ? "z-20" : expandedCard !== null ? "pointer-events-none" : "pointer-events-auto"
            )}
            style={{ 
              width: `${expandedCard === 1 ? expandedCardWidth : computedCardWidth}px`,
              height: `${expandedCard === 1 ? 440 : 400}px`
            }}
            animate={{
              scale: getCardScale(1),
              opacity: getCardOpacity(1)
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            onClick={onCardClick1}
          >
            <SavingsInsightsCard
              insights={insights?.filter(i => i.type === 'trend')}
              history={history}
              onUserAction={onUserAction}
              isExpanded={expandedCard === 1}
              onExpand={onInsightsExpand}
              onCollapse={onInsightsCollapse}
            />
          </motion.div>
          
          {/* Card 3: Tips */}
          <motion.div 
            className={cn(
              "flex-shrink-0 cursor-pointer",
              expandedCard === 2 ? "z-20" : expandedCard !== null ? "pointer-events-none" : "pointer-events-auto"
            )}
            style={{ 
              width: `${expandedCard === 2 ? expandedCardWidth : computedCardWidth}px`,
              height: `${expandedCard === 2 ? 420 : 400}px`
            }}
            animate={{
              scale: getCardScale(2),
              opacity: getCardOpacity(2)
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            onClick={onCardClick2}
          >
            <SavingsTipsCard
              tips={insights?.filter(i => i.type === 'tip')}
              onUserAction={onUserAction}
              isExpanded={expandedCard === 2}
              onExpand={onTipsExpand}
              onCollapse={onTipsCollapse}
            />
          </motion.div>
          
          {/* Card 4: History Preview */}
          <motion.div 
            className={cn(
              "flex-shrink-0 cursor-pointer",
              expandedCard === 3 ? "z-20" : expandedCard !== null ? "pointer-events-none" : "pointer-events-auto"
            )}
            style={{ 
              width: `${expandedCard === 3 ? expandedCardWidth : computedCardWidth}px`,
              height: `${expandedCard === 3 ? 440 : 400}px`
            }}
            animate={{
              scale: getCardScale(3),
              opacity: getCardOpacity(3)
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            onClick={onCardClick3}
          >
            <SavingsHistoryPreview
              history={history}
              onExpand={onHistoryExpand}
              onCollapse={onHistoryCollapse}
              isExpanded={expandedCard === 3}
              onUserAction={onUserAction}
            />
          </motion.div>
        </motion.div>
        </div>
        
        {/* Indicator dots - positioned absolutely to stay in same place */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 transform">
          <div className="flex justify-center gap-1.5">
            {[0, 1, 2, 3].map((index) => (
              <motion.div
                key={index}
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-200 cursor-pointer",
                  index === currentCard ? cardAccentDots[index] : "bg-white/25 hover:bg-white/40"
                )}
                whileTap={{ scale: 0.9 }}
                onClick={indicatorClickHandlers[index]}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

// Export memoized component for performance optimization
export const SavingsCarousel = memo(SavingsCarouselComponent);