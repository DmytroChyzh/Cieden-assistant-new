"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SystemMetric } from "@/lib/types/system-insights";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  HelpCircle,
  FileX,
  Wrench,
  Target,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemMetricsOverviewProps {
  metrics: SystemMetric[];
}

interface MetricCardProps {
  metric: SystemMetric;
  onClick?: () => void;
}

const MetricCard = ({ metric, onClick }: MetricCardProps) => {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Minus;
    }
  };

  const getTrendColor = (trend: string) => {
    // For metrics like escalations/gaps, "up" is bad, "down" is good
    const isBadMetric = metric.id.includes('escalation') || metric.id.includes('gap') || metric.id.includes('failure');
    
    if (isBadMetric) {
      switch (trend) {
        case 'up': return 'text-red-600';
        case 'down': return 'text-green-600';
        default: return 'text-gray-600';
      }
    } else {
      switch (trend) {
        case 'up': return 'text-green-600';
        case 'down': return 'text-red-600';
        default: return 'text-gray-600';
      }
    }
  };

  const getMetricIcon = (iconName: string) => {
    switch (iconName) {
      case 'AlertTriangle': return AlertTriangle;
      case 'HelpCircle': return HelpCircle;
      case 'FileX': return FileX;
      case 'Wrench': return Wrench;
      default: return Target;
    }
  };

  const TrendIcon = getTrendIcon(metric.trend);
  const MetricIcon = getMetricIcon(metric.icon);
  const trendColor = getTrendColor(metric.trend);
  
  // Calculate progress percentage for target comparison
  const targetProgress = metric.target ? Math.min((metric.target / metric.value) * 100, 100) : undefined;
  const isOnTarget = metric.target ? metric.value <= metric.target : true;

  return (
    <Card className={cn(
      "group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
      onClick && "hover:shadow-lg"
    )} onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-lg bg-gradient-to-br",
              metric.color.accent
            )}>
              <MetricIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                {metric.name}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
            </div>
          </div>
          {onClick && (
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Main Metric Value */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">
                  {metric.value.toLocaleString()}
                </span>
                <span className="text-sm text-gray-600">{metric.unit}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Previous: {metric.previousValue.toLocaleString()}
              </p>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-1">
                <TrendIcon className={cn("h-4 w-4", trendColor)} />
                <span className={cn("text-sm font-medium", trendColor)}>
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </span>
              </div>
              <Badge 
                className={cn(
                  "mt-2",
                  metric.trend === 'up' 
                    ? (metric.id.includes('escalation') || metric.id.includes('gap') || metric.id.includes('failure') 
                        ? 'bg-red-50 text-red-800 border-red-200' 
                        : 'bg-green-50 text-green-800 border-green-200')
                    : metric.trend === 'down'
                    ? (metric.id.includes('escalation') || metric.id.includes('gap') || metric.id.includes('failure')
                        ? 'bg-green-50 text-green-800 border-green-200'
                        : 'bg-red-50 text-red-800 border-red-200')
                    : 'bg-gray-50 text-gray-800 border-gray-200'
                )}
              >
                {metric.trend.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Target Progress (if applicable) */}
          {metric.target && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Target: {metric.target} {metric.unit}</span>
                <span className={cn(
                  "font-medium",
                  isOnTarget ? "text-green-600" : "text-red-600"
                )}>
                  {isOnTarget ? "On Target" : "Above Target"}
                </span>
              </div>
              <Progress 
                value={targetProgress} 
                className={cn(
                  "h-2",
                  isOnTarget ? "bg-green-100" : "bg-red-100"
                )}
              />
              <p className="text-xs text-gray-500">
                {Math.abs(metric.value - metric.target)} {metric.unit} {metric.value > metric.target ? 'above' : 'below'} target
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export function SystemMetricsOverview({ metrics }: SystemMetricsOverviewProps) {
  const handleMetricClick = (metric: SystemMetric) => {
    console.log('Metric clicked:', metric.name);
    // TODO: Implement detailed view or drill-down functionality
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {metrics.map((metric) => (
        <MetricCard 
          key={metric.id} 
          metric={metric} 
          onClick={() => handleMetricClick(metric)}
        />
      ))}
    </div>
  );
}