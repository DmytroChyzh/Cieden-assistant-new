"use client";

import { useMemo, useState, useEffect } from "react";
import { Topic, getCXScoreColor } from "@/lib/types/customer-engagement";
import { MessageSquare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopicsTreemapProps {
  topics: Topic[];
  onTopicSelect: (topic: Topic) => void;
}

interface TreemapItem {
  topic: Topic;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Squarified treemap algorithm implementation
function calculateTreemap(topics: Topic[], containerEl: HTMLElement | null): TreemapItem[] {
  if (!containerEl) return [];
  
  const width = containerEl.offsetWidth;
  const height = 600; // Fixed height for consistency
  const totalConversations = topics.reduce((sum, topic) => sum + topic.conversationCount, 0);
  const area = width * height;
  
  // Sort topics by conversation count (largest first for better layout)
  const sortedTopics = [...topics].sort((a, b) => b.conversationCount - a.conversationCount);
  
  const items: TreemapItem[] = [];
  const currentX = 0;
  let currentY = 0;
  const remainingWidth = width;
  const remainingHeight = height;
  
  // Simple slice-and-dice approach for treemap
  const processRow = (rowTopics: Topic[], rowWidth: number, rowHeight: number, startX: number, startY: number) => {
    let currentRowX = startX;
    const totalRowConversations = rowTopics.reduce((sum, topic) => sum + topic.conversationCount, 0);
    
    rowTopics.forEach(topic => {
      const itemWidth = (topic.conversationCount / totalRowConversations) * rowWidth;
      items.push({
        topic,
        x: currentRowX,
        y: startY,
        width: itemWidth,
        height: rowHeight
      });
      currentRowX += itemWidth;
    });
  };
  
  // Process in rows based on aspect ratio
  let processedTopics = 0;
  while (processedTopics < sortedTopics.length) {
    const rowTopics: Topic[] = [];
    let rowConversations = 0;
    const targetRowConversations = totalConversations * 0.3; // Aim for ~30% per row
    
    // Build a row
    while (processedTopics < sortedTopics.length && 
           (rowConversations < targetRowConversations || rowTopics.length === 0)) {
      const topic = sortedTopics[processedTopics];
      rowTopics.push(topic);
      rowConversations += topic.conversationCount;
      processedTopics++;
    }
    
    // Calculate row height based on proportion
    const rowHeight = (rowConversations / totalConversations) * height;
    processRow(rowTopics, width, rowHeight, currentX, currentY);
    currentY += rowHeight;
  }
  
  return items;
}

// Treemap Cell Component
const TreemapCell = ({ 
  item, 
  onClick 
}: { 
  item: TreemapItem; 
  onClick: () => void 
}) => {
  const { topic, x, y, width, height } = item;
  const isLarge = width > 200 && height > 150;
  const isMedium = width > 150 && height > 100;
  const isSmall = width <= 150 || height <= 100;
  
  const TrendIcon = topic.trend === 'up' ? TrendingUp : topic.trend === 'down' ? TrendingDown : Minus;
  const trendColor = topic.trend === 'up' ? 'text-green-400' : topic.trend === 'down' ? 'text-red-400' : 'text-gray-400';
  
  // Calculate font sizes based on cell size
  const titleSize = isLarge ? 'text-lg' : isMedium ? 'text-base' : 'text-sm';
  const subtitleSize = isLarge ? 'text-sm' : 'text-xs';
  const scoreSize = isLarge ? 'text-2xl' : isMedium ? 'text-xl' : 'text-lg';
  
  // Determine background opacity based on CX score for better contrast
  const bgOpacity = topic.cxScore >= 70 ? '95' : topic.cxScore >= 50 ? '90' : '85';
  
  return (
    <div
      className="absolute border-2 border-gray-800/50 rounded-lg overflow-hidden transition-all duration-300 hover:z-10 hover:border-white/60 hover:shadow-2xl cursor-pointer group"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        background: `linear-gradient(135deg, ${topic.gradient.from}${bgOpacity}, ${topic.gradient.to}${bgOpacity})`
      }}
      onClick={onClick}
    >
      {/* Dark background for better contrast */}
      <div className="absolute inset-0 bg-gray-900/40" />
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      
      {/* Content */}
      <div className="relative p-4 h-full flex flex-col justify-between text-white z-10">
        {/* Header */}
        <div className="space-y-1">
          <h3 className={cn("font-bold leading-tight drop-shadow-md", titleSize)}>
            {topic.name}
          </h3>
          {!isSmall && (
            <div className={cn("flex items-center gap-2 font-medium drop-shadow-sm", subtitleSize)}>
              <MessageSquare className="h-3 w-3" />
              <span>{topic.conversationCount.toLocaleString()} conversations</span>
            </div>
          )}
        </div>
        
        {/* CX Score - Show if there's room */}
        {!isSmall && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className={cn("font-bold drop-shadow-md", scoreSize)}>
                  {topic.cxScore}%
                </div>
                <div className={cn("font-medium drop-shadow-sm", subtitleSize)}>
                  CX Score
                </div>
              </div>
              {isMedium || isLarge ? (
                <div className="flex items-center gap-1">
                  <TrendIcon className={cn("h-5 w-5", trendColor)} />
                  <span className={cn(subtitleSize, trendColor)}>
                    {topic.cxScoreChange > 0 ? '+' : ''}{topic.cxScoreChange}%
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}
        
        {/* Minimal view for small cells */}
        {isSmall && (
          <div className="flex items-center justify-between">
            <span className="font-bold text-lg drop-shadow-md">{topic.cxScore}%</span>
            <TrendIcon className={cn("h-4 w-4 drop-shadow-sm", trendColor)} />
          </div>
        )}
      </div>
    </div>
  );
};

export function TopicsTreemap({ topics, onTopicSelect }: TopicsTreemapProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const containerHeight = 600;
  
  const treemapItems = useMemo(() => 
    calculateTreemap(topics, containerRef),
    [topics, containerRef]
  );
  
  return (
    <div className="w-full">
      {/* Treemap Container */}
      <div 
        ref={setContainerRef}
        className="relative w-full bg-gray-900 rounded-lg overflow-hidden"
        style={{ height: `${containerHeight}px` }}
      >
        {treemapItems.map((item) => (
          <TreemapCell
            key={item.topic.id}
            item={item}
            onClick={() => onTopicSelect(item.topic)}
          />
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 to-green-600" />
          <span>Excellent CX (90%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-blue-600" />
          <span>Good CX (70-89%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-orange-500 to-orange-600" />
          <span>Needs Improvement (&lt;70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span>Improving</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-600" />
          <span>Declining</span>
        </div>
      </div>
    </div>
  );
}