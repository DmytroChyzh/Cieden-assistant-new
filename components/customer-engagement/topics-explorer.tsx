"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TopicsTreemap } from "./topics-treemap";
import { 
  Topic, 
  Filters, 
  getCXScoreColor, 
  CX_SCORE_PRESETS
} from "@/lib/types/customer-engagement";
import {
  filterTopicsByDateRange,
  filterTopicsByCXScore,
  searchTopics
} from "@/lib/mock-data/customer-engagement";
import { 
  CalendarIcon, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  MessageSquare,
  Star,
  LayoutGrid,
  Grid3x3
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TopicsExplorerProps {
  topics: Topic[];
  filters: Filters;
  onTopicSelect: (topic: Topic) => void;
  onFiltersChange: (filters: Partial<Filters>) => void;
}

// Sparkline component for trend visualization
const Sparkline = ({ data, trend }: { data: number[]; trend: 'up' | 'down' | 'stable' }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = range > 0 ? 100 - ((value - min) / range) * 100 : 50;
    return `${x},${y}`;
  }).join(' ');

  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6B7280';

  return (
    <div className="h-8 w-16">
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <polyline
          points={points}
          fill="none"
          stroke={trendColor}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};

// Topic Card component
const TopicCard = ({ topic, onClick }: { topic: Topic; onClick: () => void }) => {
  const trendIcon = topic.trend === 'up' ? TrendingUp : topic.trend === 'down' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendColor = topic.trend === 'up' ? 'text-green-600' : topic.trend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-100/50 border-2 hover:border-blue-200 overflow-hidden"
      onClick={onClick}
    >
      <div 
        className="h-1 w-full rounded-t-lg"
        style={{
          background: `linear-gradient(135deg, ${topic.gradient.from}, ${topic.gradient.to})`
        }}
      />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
            {topic.name}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Sparkline data={topic.sparklineData} trend={topic.trend} />
            <TrendIcon className={cn("h-4 w-4", trendColor)} />
          </div>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mt-2">
          {topic.description}
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Conversation Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Conversations</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              {topic.conversationCount.toLocaleString()}
            </span>
          </div>

          {/* CX Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700">CX Score</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn("border", getCXScoreColor(topic.cxScore))}>
                {topic.cxScore}%
              </Badge>
              <span className={cn("text-xs font-medium", trendColor)}>
                {topic.cxScoreChange > 0 ? '+' : ''}{topic.cxScoreChange}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function TopicsExplorer({ topics, filters, onTopicSelect, onFiltersChange }: TopicsExplorerProps) {
  const [dateRange, setDateRange] = useState({
    from: filters.dateRange.from,
    to: filters.dateRange.to
  });
  const [viewMode, setViewMode] = useState<'treemap' | 'grid'>('treemap');

  // Apply all filters to topics
  const filteredTopics = useMemo(() => {
    let filtered = topics;
    
    // Apply date range filter
    if (filters.dateRange.from && filters.dateRange.to) {
      filtered = filterTopicsByDateRange(filtered, filters.dateRange.from, filters.dateRange.to);
    }
    
    // Apply CX score filter
    filtered = filterTopicsByCXScore(filtered, filters.cxScoreRange.min, filters.cxScoreRange.max);
    
    // Apply search filter
    filtered = searchTopics(filtered, filters.searchQuery);
    
    return filtered;
  }, [topics, filters]);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ searchQuery: value });
  };

  const handleCXScoreChange = (presetKey: string) => {
    const preset = CX_SCORE_PRESETS[presetKey as keyof typeof CX_SCORE_PRESETS];
    if (preset) {
      onFiltersChange({ 
        cxScoreRange: { min: preset.min, max: preset.max }
      });
    }
  };

  const handleDateRangeChange = () => {
    onFiltersChange({ 
      dateRange: { from: dateRange.from, to: dateRange.to }
    });
  };

  const currentCXPreset = Object.entries(CX_SCORE_PRESETS).find(([_, preset]) => 
    preset.min === filters.cxScoreRange.min && preset.max === filters.cxScoreRange.max
  )?.[0] || 'ALL';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Topics Explorer</h2>
          <p className="text-gray-600 mt-1">
            {filteredTopics.length} highest-volume topics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {format(filters.dateRange.from, 'MMM dd, yyyy')} - {format(filters.dateRange.to, 'MMM dd, yyyy')}
          </div>
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'treemap' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('treemap')}
              className="px-2"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-2"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 p-4 bg-gray-50 rounded-lg">
        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range) {
                  setDateRange({ from: range.from!, to: range.to! });
                  if (range.from && range.to) {
                    handleDateRangeChange();
                  }
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {/* CX Score Filter */}
        <Select value={currentCXPreset} onValueChange={handleCXScoreChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Customer Experience (CX) score" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CX_SCORE_PRESETS).map(([key, preset]) => (
              <SelectItem key={key} value={key}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="flex-1 min-w-full sm:min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search topics..."
              value={filters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* View Options */}
        <Select defaultValue="10">
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">View 10</SelectItem>
            <SelectItem value="20">View 20</SelectItem>
            <SelectItem value="50">View 50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Topics Display - Treemap or Grid */}
      {viewMode === 'treemap' ? (
        <TopicsTreemap 
          topics={filteredTopics}
          onTopicSelect={onTopicSelect}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
          {filteredTopics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onClick={() => onTopicSelect(topic)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredTopics.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No topics found</h3>
          <p className="mt-2 text-gray-600">
            Try adjusting your filters or search terms to find topics.
          </p>
        </div>
      )}
    </div>
  );
}