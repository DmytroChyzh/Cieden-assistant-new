"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity,
  AlertTriangle,
  Car,
  Home,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  Clock,
  Brain,
  Database,
  Zap,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Send,
  BarChart3
} from "lucide-react";

interface KnowledgeUpdate {
  id: string;
  agentType: 'car' | 'home' | 'personal' | 'investment';
  title: string;
  description: string;
  source: string;
  confidence: number;
  impact: string;
  timestamp: string;
  status: 'active' | 'processing' | 'alert';
}

interface KnowledgeSource {
  name: string;
  accuracy: number;
  status: 'active' | 'error';
  updatesCount: number;
}

interface PendingApproval {
  id: string;
  title: string;
  source: string;
  confidence: number;
  agentType: 'car' | 'home' | 'personal' | 'investment';
}

export function KnowledgeManagement() {
  // Agent Statistics
  const agentStats = [
    {
      type: 'car',
      title: 'Car Loans',
      icon: Car,
      updates: 47,
      status: 'active',
      color: 'bg-blue-500'
    },
    {
      type: 'home',
      title: 'Home Loans', 
      icon: Home,
      updates: 23,
      status: 'processing',
      color: 'bg-green-500'
    },
    {
      type: 'personal',
      title: 'Personal Loans',
      icon: CreditCard,
      updates: 31,
      status: 'alert',
      color: 'bg-purple-500'
    },
    {
      type: 'investment',
      title: 'Investment',
      icon: TrendingUp,
      updates: 89,
      status: 'active',
      color: 'bg-orange-500'
    }
  ];

  // Live Knowledge Updates
  const liveUpdates: KnowledgeUpdate[] = [
    {
      id: '1',
      agentType: 'car',
      title: 'Ford F-150 Lightning incentive update',
      description: 'Price: $52,995, 0.9% financing for 36 months',
      source: 'Ford.com',
      confidence: 96,
      impact: 'Loan desk expects 38 new auto inquiries ↑',
      timestamp: '2m ago',
      status: 'active'
    },
    {
      id: '2',
      agentType: 'home',
      title: 'Seattle: Median condo prices ↑5% MoM',
      description: 'Light-rail expansion boosting downtown demand',
      source: 'Zillow Research',
      confidence: 89,
      impact: 'Agent briefing: 67% complete',
      timestamp: '8m ago',
      status: 'processing'
    },
    {
      id: '3',
      agentType: 'personal',
      title: 'Federal Reserve signals +0.25% hike',
      description: 'Prime rate expected to move to 8.75% this quarter',
      source: 'FederalReserve.gov',
      confidence: 98,
      impact: 'Update workflows: URGENT',
      timestamp: '15m ago',
      status: 'alert'
    },
    {
      id: '4',
      agentType: 'investment',
      title: 'Tech Stocks Rally: S&P 500 +2.1%',
      description: 'U.S. SaaS names leading gains after earnings beats',
      source: 'Bloomberg',
      confidence: 92,
      impact: 'Investment recommendations updated',
      timestamp: '22m ago',
      status: 'active'
    }
  ];

  // Knowledge Sources
  const knowledgeSources: KnowledgeSource[] = [
    { name: 'Wall Street Journal', accuracy: 98, status: 'active', updatesCount: 234 },
    { name: 'Kelley Blue Book', accuracy: 94, status: 'active', updatesCount: 156 },
    { name: 'Zillow Research', accuracy: 96, status: 'active', updatesCount: 89 },
    { name: 'Bloomberg', accuracy: 97, status: 'active', updatesCount: 203 },
    { name: 'Federal Reserve', accuracy: 100, status: 'active', updatesCount: 45 },
    { name: 'SEC Filings', accuracy: 99, status: 'error', updatesCount: 67 }
  ];

  // Pending Approvals
  const pendingApprovals: PendingApproval[] = [
    {
      id: '1',
      title: 'BMW launches new 3-Series variant',
      source: 'BMW India',
      confidence: 89,
      agentType: 'car'
    },
    {
      id: '2',
      title: 'Noida property rates expected to rise 15%',
      source: 'PropTiger',
      confidence: 76,
      agentType: 'home'
    },
    {
      id: '3',
      title: 'HDFC reduces personal loan rates by 0.5%',
      source: 'HDFC website',
      confidence: 94,
      agentType: 'personal'
    }
  ];

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'car': return Car;
      case 'home': return Home;
      case 'personal': return CreditCard;
      case 'investment': return TrendingUp;
      default: return Database;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-4 w-4 text-green-500 animate-pulse" />;
      case 'processing': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'alert': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Database className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'border-l-green-500';
      case 'processing': return 'border-l-yellow-500';
      case 'alert': return 'border-l-red-500';
      default: return 'border-l-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-blue-500" />
          Agent Knowledge Updates
        </h2>
        <p className="text-muted-foreground mt-1">
          Live intelligence feeds and knowledge management
        </p>
      </div>

      {/* Agent Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {agentStats.map((agent) => {
          const IconComponent = agent.icon;
          return (
            <Card key={agent.type} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{agent.title}</CardTitle>
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agent.updates}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {getStatusIcon(agent.status)}
                  new updates
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Knowledge Injection Feed */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                Live Knowledge Injection
              </CardTitle>
              <CardDescription>Real-time updates being processed and distributed to agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {liveUpdates.map((update) => {
                const AgentIcon = getAgentIcon(update.agentType);
                return (
                  <div 
                    key={update.id} 
                    className={`border-l-4 ${getStatusColor(update.status)} pl-4 py-3 bg-gray-50 rounded-r-lg hover:bg-gray-100 transition-colors`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <AgentIcon className="h-4 w-4 text-blue-500" />
                          <span className="font-medium capitalize">{update.agentType} Agent</span>
                          <Badge variant="secondary" className="text-xs">
                            {update.confidence}% confidence
                          </Badge>
                          {getStatusIcon(update.status)}
                        </div>
                        <div>
                          <div className="font-medium">{update.title}</div>
                          <div className="text-sm text-gray-600">{update.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Source: {update.source} • {update.impact}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{update.timestamp}</div>
                    </div>
                  </div>
                );
              })}
              <Button variant="ghost" className="w-full mt-4">
                View All Updates →
              </Button>
            </CardContent>
          </Card>

          {/* Manual Knowledge Injection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Manual Knowledge Injection
              </CardTitle>
              <CardDescription>Emergency updates and manual knowledge distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Agent</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">🚗 Car Loan Agent</SelectItem>
                      <SelectItem value="home">🏠 Home Loan Agent</SelectItem>
                      <SelectItem value="personal">💳 Personal Loan Agent</SelectItem>
                      <SelectItem value="investment">💰 Investment Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Knowledge Type</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="promotion">🎯 Promotion</SelectItem>
                      <SelectItem value="policy">📋 Policy Update</SelectItem>
                      <SelectItem value="market">📊 Market Intelligence</SelectItem>
                      <SelectItem value="emergency">🚨 Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Knowledge Update</label>
                <Textarea 
                  placeholder="Emergency Update: Chevrolet announces 0% APR on Bolt EUV for the next 48 hours. Available financing includes $0 down on approved credit."
                  className="min-h-[100px]"
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Auto-Validation Results</span>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <div>✅ Source verification: Verified from official website</div>
                  <div>📈 Impact prediction: +67 loan applications expected</div>
                  <div>🎯 Distribution: Ready to push to 234 active agents</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 gap-2">
                  <Send className="h-4 w-4" />
                  Inject Knowledge
                </Button>
                <Button variant="outline" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule Later
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Knowledge Sources & Approvals */}
        <div className="space-y-4">
          {/* Knowledge Source Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                Knowledge Sources
              </CardTitle>
              <CardDescription>Source reliability and quality metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {knowledgeSources.map((source, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${source.status === 'active' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                      <span className="font-medium text-sm">{source.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{source.updatesCount}/day</div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Accuracy</span>
                    <span className="font-medium">{source.accuracy}%</span>
                  </div>
                  <Progress value={source.accuracy} className="h-1" />
                </div>
              ))}

              <div className="border-t pt-3 mt-4 space-y-2">
                <div className="text-sm font-medium">Pipeline Metrics</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Fact Checking:</span>
                    <span>847 items/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pass Rate:</span>
                    <span className="text-green-600">92%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Human Review:</span>
                    <span className="text-orange-600">23 flagged</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Knowledge Approval Workflow */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-purple-500" />
                Pending Approvals
              </CardTitle>
              <CardDescription>Knowledge updates awaiting review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingApprovals.map((item) => {
                const AgentIcon = getAgentIcon(item.agentType);
                return (
                  <div key={item.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AgentIcon className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-sm">{item.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Source: {item.source} • {item.confidence}% confidence
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <ThumbsDown className="h-3 w-3" />
                        Deny
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button variant="ghost" className="w-full text-xs">
                View All Pending (12 items) →
              </Button>
            </CardContent>
          </Card>

          {/* Impact Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-green-500" />
                Impact Metrics
              </CardTitle>
              <CardDescription>Knowledge effectiveness measurement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Customer Satisfaction</span>
                  <span className="text-green-600 font-medium">+12%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Query Resolution Speed</span>
                  <span className="text-green-600 font-medium">+34%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Upsell Success Rate</span>
                  <span className="text-green-600 font-medium">+28%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Agent Accuracy</span>
                  <span className="text-green-600 font-medium">94%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}