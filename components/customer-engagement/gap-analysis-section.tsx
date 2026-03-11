"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { GapAnalysisItem, ToolFailure, getGapSeverityColor } from "@/lib/types/system-insights";
import { 
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  HelpCircle,
  FileX,
  Database,
  Wrench,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface GapAnalysisSectionProps {
  gaps: GapAnalysisItem[];
  toolFailures: ToolFailure[];
}

interface GapItemProps {
  gap: GapAnalysisItem;
  isExpanded: boolean;
  onToggle: () => void;
}

const GapItem = ({ gap, isExpanded, onToggle }: GapItemProps) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'knowledge': return HelpCircle;
      case 'documentation': return FileX;
      case 'data': return Database;
      case 'tool': return Wrench;
      default: return AlertTriangle;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'knowledge': return 'from-orange-500 to-orange-600';
      case 'documentation': return 'from-amber-500 to-amber-600';
      case 'data': return 'from-blue-500 to-blue-600';
      case 'tool': return 'from-purple-500 to-purple-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const TypeIcon = getTypeIcon(gap.type);
  const typeGradient = getTypeColor(gap.type);

  return (
    <Card className="border-l-4 border-l-orange-400">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-lg bg-gradient-to-br", typeGradient)}>
                  <TypeIcon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {gap.title}
                    </CardTitle>
                    <Badge className={getGapSeverityColor(gap.impact)}>
                      {gap.impact.toUpperCase()} IMPACT
                    </Badge>
                    <Badge variant="outline">
                      {gap.frequency} occurrences
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{gap.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {gap.type}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Root Cause Analysis */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Root Cause Analysis
                </h4>
                <Card className="p-4 bg-red-50 border-red-200">
                  <p className="text-sm text-red-800">{gap.rootCause}</p>
                </Card>

                {/* Affected Topics */}
                <div className="mt-4">
                  <h5 className="font-medium text-gray-900 mb-2">Affected Topics</h5>
                  <div className="flex flex-wrap gap-2">
                    {gap.affectedTopics.map((topic, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommended Actions */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Recommended Actions
                </h4>
                <div className="space-y-3">
                  {gap.recommendedActions
                    .sort((a, b) => a.priority - b.priority)
                    .map((action, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {action.action}
                            </p>
                            <p className="text-xs text-gray-600">
                              Owner: {action.owner}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getEffortColor(action.effort)}>
                              {action.effort} effort
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              P{action.priority}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            </div>

            {/* Example Cases */}
            {gap.examples.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Example Cases
                </h4>
                <div className="space-y-3">
                  {gap.examples.map((example, index) => (
                    <Card key={index} className="p-4 bg-gray-50">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">CUSTOMER QUERY</p>
                          <p className="text-sm text-gray-900 italic">&ldquo;{example.query}&rdquo;</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">AI RESPONSE</p>
                          <p className="text-sm text-gray-700">&ldquo;{example.response}&rdquo;</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-1">OUTCOME</p>
                          <p className="text-sm text-orange-700 font-medium">{example.outcome}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const ToolFailureItem = ({ failure }: { failure: ToolFailure }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return CheckCircle;
      case 'active': return XCircle;
      case 'investigating': return AlertCircle;
      default: return AlertTriangle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600 bg-green-50 border-green-200';
      case 'active': return 'text-red-600 bg-red-50 border-red-200';
      case 'investigating': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const StatusIcon = getStatusIcon(failure.status);

  return (
    <Card className="border-l-4 border-l-purple-400">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {failure.toolName}
              </CardTitle>
              <p className="text-sm text-gray-600">{failure.errorType}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(failure.status)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {failure.status.toUpperCase()}
            </Badge>
            <Badge variant="outline">
              {failure.frequency}x
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h5 className="font-medium text-gray-900 mb-1">Impact</h5>
            <p className="text-sm text-gray-700">{failure.impact}</p>
          </div>
          <div>
            <h5 className="font-medium text-gray-900 mb-1">Proposed Resolution</h5>
            <p className="text-sm text-gray-700">{failure.resolution}</p>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Last occurred: {format(failure.lastOccurrence, 'MMM dd, yyyy HH:mm')}</span>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function GapAnalysisSection({ gaps, toolFailures }: GapAnalysisSectionProps) {
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set());

  const toggleGap = (gapId: string) => {
    const newExpanded = new Set(expandedGaps);
    if (newExpanded.has(gapId)) {
      newExpanded.delete(gapId);
    } else {
      newExpanded.add(gapId);
    }
    setExpandedGaps(newExpanded);
  };

  const criticalGaps = gaps.filter(gap => gap.impact === 'high');
  const mediumGaps = gaps.filter(gap => gap.impact === 'medium');
  const lowGaps = gaps.filter(gap => gap.impact === 'low');

  const activeFailures = toolFailures.filter(f => f.status === 'active' || f.status === 'investigating');
  const resolvedFailures = toolFailures.filter(f => f.status === 'resolved');

  return (
    <div className="space-y-6">
      <Tabs defaultValue="gaps" className="space-y-6">
        <TabsList>
          <TabsTrigger value="gaps" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Knowledge & Documentation Gaps ({gaps.length})
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Tool Failures ({toolFailures.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gaps" className="space-y-6">
          {/* Critical Gaps */}
          {criticalGaps.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Critical Issues Requiring Immediate Attention
                <Badge variant="destructive">{criticalGaps.length}</Badge>
              </h3>
              <div className="space-y-4">
                {criticalGaps.map((gap) => (
                  <GapItem
                    key={gap.id}
                    gap={gap}
                    isExpanded={expandedGaps.has(gap.id)}
                    onToggle={() => toggleGap(gap.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Medium Priority Gaps */}
          {mediumGaps.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Medium Priority Issues
                <Badge variant="secondary">{mediumGaps.length}</Badge>
              </h3>
              <div className="space-y-4">
                {mediumGaps.map((gap) => (
                  <GapItem
                    key={gap.id}
                    gap={gap}
                    isExpanded={expandedGaps.has(gap.id)}
                    onToggle={() => toggleGap(gap.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Low Priority Gaps */}
          {lowGaps.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    Low Priority Issues ({lowGaps.length})
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                {lowGaps.map((gap) => (
                  <GapItem
                    key={gap.id}
                    gap={gap}
                    isExpanded={expandedGaps.has(gap.id)}
                    onToggle={() => toggleGap(gap.id)}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          {/* Active Tool Failures */}
          {activeFailures.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Active Tool Issues
                <Badge variant="destructive">{activeFailures.length}</Badge>
              </h3>
              <div className="space-y-4">
                {activeFailures.map((failure) => (
                  <ToolFailureItem key={failure.id} failure={failure} />
                ))}
              </div>
            </div>
          )}

          {/* Recently Resolved */}
          {resolvedFailures.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Recently Resolved ({resolvedFailures.length})
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                {resolvedFailures.map((failure) => (
                  <ToolFailureItem key={failure.id} failure={failure} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}