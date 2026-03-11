"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RequestTag } from "@/lib/types/system-insights";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  MessageSquare,
  ExternalLink,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestTagCloudProps {
  tags: RequestTag[];
  type: 'popular' | 'growing';
}

interface TagCloudItemProps {
  tag: RequestTag;
  size: 'sm' | 'md' | 'lg' | 'xl';
  onClick: () => void;
}

const TagCloudItem = ({ tag, size, onClick }: TagCloudItemProps) => {
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-5 py-2.5',
    xl: 'text-xl px-6 py-3'
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'growing': return TrendingUp;
      case 'declining': return TrendingDown;
      default: return Minus;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'growing': return 'text-green-600 bg-green-50 border-green-200';
      case 'declining': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const TrendIcon = getTrendIcon(tag.trend);
  const trendColorClass = getTrendColor(tag.trend);

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "relative group transition-all duration-300 hover:scale-105 hover:shadow-lg border-2",
        sizeClasses[size],
        trendColorClass,
        "hover:border-blue-400 hover:bg-blue-50"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">{tag.name}</span>
        <Badge variant="secondary" className="text-xs">
          {tag.count}
        </Badge>
        <TrendIcon className="h-3 w-3" />
      </div>
      
      {/* Growth indicator */}
      <div className={cn(
        "absolute -top-2 -right-2 text-xs font-bold px-1.5 py-0.5 rounded-full",
        tag.growth > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      )}>
        {tag.growth > 0 ? '+' : ''}{tag.growth.toFixed(0)}%
      </div>
    </Button>
  );
};

const TagDetailsDialog = ({ 
  tag, 
  isOpen, 
  onClose 
}: { 
  tag: RequestTag | null; 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  if (!tag) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            {tag.name}
          </DialogTitle>
          <DialogDescription>
            Detailed analysis of customer request patterns and trends
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-1">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{tag.count}</p>
                  <p className="text-sm text-gray-600">Total Requests</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{tag.percentage}%</p>
                  <p className="text-sm text-gray-600">Of All Requests</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className={cn(
                    "text-2xl font-bold",
                    tag.growth > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {tag.growth > 0 ? '+' : ''}{tag.growth.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">Growth Rate</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <Badge variant="secondary" className="text-sm">
                    {tag.category}
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">Category</p>
                </div>
              </Card>
            </div>

            {/* Example Queries */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Example Customer Queries
              </h4>
              <div className="space-y-2">
                {tag.examples.map((example, index) => (
                  <Card key={index} className="p-3 bg-gray-50">
                    <p className="text-sm text-gray-700 italic">&ldquo;{example}&rdquo;</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Related Topics */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Related Topics</h4>
              <div className="flex flex-wrap gap-2">
                {tag.relatedTopics.map((topic, index) => (
                  <Badge key={index} variant="outline" className="cursor-pointer hover:bg-blue-50">
                    {topic}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Trend Analysis */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Trend Analysis</h4>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Previous Period</span>
                  <span className="font-medium">{tag.previousCount} requests</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Current Period</span>
                  <span className="font-medium">{tag.count} requests</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Change</span>
                  <span className={cn(
                    "font-medium flex items-center gap-1",
                    tag.growth > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {tag.growth > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {tag.growth > 0 ? '+' : ''}{tag.growth.toFixed(1)}%
                  </span>
                </div>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export function RequestTagCloud({ tags, type }: RequestTagCloudProps) {
  const [selectedTag, setSelectedTag] = useState<RequestTag | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate sizes based on request counts
  const maxCount = Math.max(...tags.map(tag => tag.count));
  const minCount = Math.min(...tags.map(tag => tag.count));
  
  const getTagSize = (count: number): 'sm' | 'md' | 'lg' | 'xl' => {
    const range = maxCount - minCount;
    const normalized = range > 0 ? (count - minCount) / range : 0.5;
    
    if (normalized >= 0.75) return 'xl';
    if (normalized >= 0.5) return 'lg';
    if (normalized >= 0.25) return 'md';
    return 'sm';
  };

  const handleTagClick = (tag: RequestTag) => {
    setSelectedTag(tag);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedTag(null);
  };

  const sortedTags = type === 'popular' 
    ? tags.sort((a, b) => b.count - a.count)
    : tags.sort((a, b) => b.growth - a.growth);

  return (
    <>
      <Card className="h-[400px]">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {type === 'popular' ? 'Most Requested Topics' : 'Fastest Growing Requests'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-center justify-center h-[280px] overflow-hidden">
            {sortedTags.slice(0, 15).map((tag) => (
              <TagCloudItem
                key={tag.id}
                tag={tag}
                size={getTagSize(type === 'popular' ? tag.count : tag.growth)}
                onClick={() => handleTagClick(tag)}
              />
            ))}
          </div>
          
          {tags.length > 15 && (
            <div className="text-center mt-4">
              <Button variant="ghost" size="sm">
                View All {tags.length} {type === 'popular' ? 'Popular' : 'Growing'} Requests
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <TagDetailsDialog
        tag={selectedTag}
        isOpen={showDetails}
        onClose={handleCloseDetails}
      />
    </>
  );
}