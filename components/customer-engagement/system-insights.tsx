"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SystemMetricsOverview } from "./system-metrics-overview";
import { RequestTagCloud } from "./request-tag-cloud";
import { GapAnalysisSection } from "./gap-analysis-section";
import { mockSystemInsights } from "@/lib/mock-data/system-insights";
import { getAlertSeverityColor } from "@/lib/types/system-insights";
import { 
  AlertTriangle, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Target,
  Activity,
  Zap
} from "lucide-react";
import { format } from "date-fns";

export function SystemInsights() {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const insights = mockSystemInsights;

  const toggleAlert = (alertId: string) => {
    setExpandedAlert(expandedAlert === alertId ? null : alertId);
  };

  const criticalAlerts = insights.alerts.filter(alert => alert.severity === 'critical');
  const warningAlerts = insights.alerts.filter(alert => alert.severity === 'warning');

  return (
    <div className="space-y-8">
      {/* Page Header with Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Conversations</p>
                <p className="text-2xl font-bold text-gray-900">{insights.summary.totalConversations.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Resolution Rate</p>
                <p className="text-2xl font-bold text-gray-900">{insights.summary.resolutionRate}%</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">System Health</p>
                <p className="text-2xl font-bold text-gray-900">{insights.summary.systemHealthScore}/100</p>
              </div>
              <Zap className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{insights.summary.avgResponseTime}s</p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Critical Alerts</h2>
            <Badge variant="destructive" className="ml-2">
              {criticalAlerts.length}
            </Badge>
          </div>
          
          {criticalAlerts.map((alert) => (
            <Alert key={alert.id} className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <AlertTitle className="text-red-800">{alert.title}</AlertTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={getAlertSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-red-600">
                      {alert.count} instances
                    </span>
                  </div>
                </div>
                <AlertDescription className="text-red-700 mt-1">
                  {alert.description}
                </AlertDescription>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-red-600">
                    Last seen: {format(alert.timestamp, 'MMM dd, HH:mm')}
                  </span>
                  <Button variant="destructive" size="sm">
                    Take Action
                  </Button>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* System Metrics Overview */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Performance Metrics</h2>
        <SystemMetricsOverview metrics={insights.metrics} />
      </div>

      {/* Request Analytics - Tag Clouds */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Popular Requests</h2>
            <Badge variant="secondary">Top volume queries</Badge>
          </div>
          <RequestTagCloud 
            tags={insights.popularRequests} 
            type="popular"
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Growing Requests</h2>
            <Badge variant="secondary">Trending up</Badge>
          </div>
          <RequestTagCloud 
            tags={insights.growingRequests} 
            type="growing"
          />
        </div>
      </div>

      {/* Gap Analysis */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Gap Analysis & Improvement Opportunities</h2>
        <GapAnalysisSection gaps={insights.gaps} toolFailures={insights.toolFailures} />
      </div>

      {/* Warning Alerts */}
      {warningAlerts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Warnings & Recommendations</h2>
            <Badge variant="secondary">
              {warningAlerts.length}
            </Badge>
          </div>
          
          {warningAlerts.map((alert) => (
            <Collapsible 
              key={alert.id}
              open={expandedAlert === alert.id}
              onOpenChange={() => toggleAlert(alert.id)}
            >
              <CollapsibleTrigger asChild>
                <Alert className="border-orange-200 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <AlertTitle className="text-orange-800 flex items-center gap-2">
                        {alert.title}
                        {expandedAlert === alert.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </AlertTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getAlertSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-orange-600">
                          {alert.count} instances
                        </span>
                      </div>
                    </div>
                  </div>
                </Alert>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <Alert className="border-orange-200 bg-orange-50">
                  <div className="ml-6">
                    <AlertDescription className="text-orange-700">
                      {alert.description}
                    </AlertDescription>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-orange-600">
                        Category: {alert.category} • Last seen: {format(alert.timestamp, 'MMM dd, HH:mm')}
                      </span>
                      <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                        View Details
                      </Button>
                    </div>
                  </div>
                </Alert>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Footer with Last Updated */}
      <div className="text-center text-sm text-gray-500 pt-6 border-t">
        Last updated: {format(insights.lastUpdated, 'MMM dd, yyyy \'at\' HH:mm')}
      </div>
    </div>
  );
}