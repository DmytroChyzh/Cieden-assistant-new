"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Activity,
  AlertTriangle,
  Bot, 
  Building,
  CheckCircle2,
  Clock,
  DollarSign,
  Rocket,
  Settings,
  Target,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";

export default function OrchestrationDashboard() {
  // Dashboard always shows Service Design role
  const serviceDesignRole = {
    name: "Service Designer",
    description: "Design policies, offers, arbitration, and paths"
  };
  
  // Fleet Statistics
  const fleetStats = [
    {
      title: "Active Personal Agents",
      value: "2,847",
      change: "+127 from yesterday",
      icon: Users,
      trend: "up"
    },
    {
      title: "Total AUM",
      value: "$47.2M",
      change: "Under management",
      icon: DollarSign,
      trend: "stable"
    },
    {
      title: "Avg Response Time",
      value: "3.2min",
      change: "-0.4min improvement",
      icon: Zap,
      trend: "up"
    },
    {
      title: "Success Rate",
      value: "96.8%",
      change: "+1.2% this week",
      icon: CheckCircle2,
      trend: "up"
    }
  ];

  // Active Customer Sessions
  const activeSessions = [
    {
      id: 1,
      customerName: "Sarah M.",
      segment: "High Net Worth",
      agents: ["Estate Planning", "Tax Strategy"],
      activity: "Processing $1.2M portfolio review",
      duration: "24m",
      status: "analyzing",
      value: "$1.2M"
    },
    {
      id: 2,
      customerName: "TechStart LLC",
      segment: "Small Business",
      agents: ["Cash Flow", "Payroll", "Invoice Processing"],
      activity: "Processing $89K monthly operations",
      duration: "1h 15m",
      status: "optimizing",
      value: "$89K"
    },
    {
      id: 3,
      customerName: "John K.",
      segment: "Young Professional",
      agents: ["Budget Coach", "Investment Learning"],
      activity: "Setting up $500/mo investment plan",
      duration: "8m",
      status: "recommending",
      value: "$500"
    },
    {
      id: 4,
      customerName: "Maria Rodriguez",
      segment: "Retiree",
      agents: ["Income Planning", "Healthcare Cost"],
      activity: "Optimizing Social Security timing",
      duration: "45m",
      status: "processing",
      value: "$340K"
    }
  ];

  // Fleet Performance by Segment
  const segmentPerformance = [
    {
      name: "High-Net-Worth",
      clientCount: 234,
      satisfaction: 94,
      agentsPerClient: 3.0,
      avgAUM: "$2.1M",
      color: "bg-purple-500"
    },
    {
      name: "Small Business",
      clientCount: 1089,
      satisfaction: 91,
      agentsPerClient: 2.3,
      avgAUM: "$47K",
      color: "bg-blue-500"
    },
    {
      name: "Young Professionals",
      clientCount: 3447,
      satisfaction: 89,
      agentsPerClient: 1.8,
      avgAUM: "$12K",
      color: "bg-green-500"
    },
    {
      name: "Retirees",
      clientCount: 892,
      satisfaction: 97,
      agentsPerClient: 2.7,
      avgAUM: "$340K",
      color: "bg-orange-500"
    }
  ];

  // Draft Agents in Development
  const draftAgents = [
    {
      name: "Payment Risk Advisor Agent",
      description: "Bankruptcy prevention & debt restructuring",
      stage: "Code Review",
      progress: 67,
      deployDate: "Jan 8",
      affectedUsers: 1203,
      status: "development"
    },
    {
      name: "Consumer Loan Advisor Agent v2.1",
      description: "Instant personal loan approvals & EMI optimization",
      stage: "Beta Testing",
      progress: 89,
      deployDate: "Dec 15",
      affectedUsers: 2847,
      status: "beta"
    },
    {
      name: "Small Business Loan Advisor",
      description: "SBA compliance + risk assessment",
      stage: "QA Testing",
      progress: 78,
      deployDate: "Jan 22",
      affectedUsers: 450,
      status: "testing"
    },
    {
      name: "Tax Loss Harvesting Agent",
      description: "Advanced portfolio optimization",
      stage: "Alpha Testing",
      progress: 34,
      deployDate: "Feb 5",
      affectedUsers: 234,
      status: "alpha"
    }
  ];

  // Recent Activities
  const recentActivities = [
    {
      id: 1,
      action: "Deployed Budget Coach v3.1 to Young Professionals (3,447)",
      result: "+23% engagement, +15% savings rate",
      time: "2h ago",
      status: "success"
    },
    {
      id: 2,
      action: "Migrated Small Business clients to new Cash Flow Agent",
      result: "Processing 15% faster, 8% better accuracy",
      time: "4h ago",
      status: "success"
    },
    {
      id: 3,
      action: "A/B Testing: Retiree Income Planning Agent (Group A: 446)",
      result: "Preliminary: +7% satisfaction vs control group",
      time: "1d ago",
      status: "running"
    },
    {
      id: 4,
      action: "Alert: High-Net-Worth segment showing 12% increase in Estate Planning requests",
      result: "Status: Investigating capacity scaling needs",
      time: "3d ago",
      status: "alert"
    }
  ];

  // Current focused segment for deep dive
  const focusedSegment = segmentPerformance[0]; // High-Net-Worth

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "analyzing": return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "optimizing": return <Settings className="h-4 w-4 text-green-500 animate-spin" style={{ animationDuration: '3s' }} />;
      case "recommending": return <Target className="h-4 w-4 text-purple-500" />;
      case "processing": return <Zap className="h-4 w-4 text-orange-500" />;
      case "success": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "running": return <Activity className="h-4 w-4 text-blue-500" />;
      case "alert": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case "alpha": return "bg-red-100 text-red-800";
      case "beta": return "bg-yellow-100 text-yellow-800";
      case "testing": return "bg-blue-100 text-blue-800";
      case "development": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Good morning, {serviceDesignRole.name}</h1>
          <p className="text-muted-foreground mt-1">
            {serviceDesignRole.description}
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button variant="default" className="gap-2">
            <Rocket className="h-4 w-4" />
            Launch Agent Fleet
          </Button>
          <Button variant="outline" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Review Performance
          </Button>
          <Button variant="outline" className="gap-2">
            <Bot className="h-4 w-4" />
            Deploy New Agent
          </Button>
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            Segment Analysis
          </Button>
        </div>
      </div>

      {/* Fleet Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {fleetStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Customer Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              Active Customer Sessions
            </CardTitle>
            <CardDescription>Live agent activity across your customer base</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSessions.map((session) => (
              <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      {session.segment === "Small Business" ? (
                        <Building className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Users className="h-4 w-4 text-purple-500" />
                      )}
                      <span className="font-medium">{session.customerName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {session.segment}
                      </Badge>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {session.agents.map((agent) => (
                        <Badge key={agent} variant="outline" className="text-xs">
                          🤖 {agent}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">{session.activity}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(session.status)}
                      <span className="text-xs capitalize">{session.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Active {session.duration}</div>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="ghost" className="w-full mt-4">
              View All 47 Active Sessions →
            </Button>
          </CardContent>
        </Card>

        {/* Fleet Performance by Segment */}
        <Card>
          <CardHeader>
            <CardTitle>Fleet Performance by Segment</CardTitle>
            <CardDescription>Customer satisfaction and utilization metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {segmentPerformance.map((segment) => (
              <div key={segment.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {segment.name === "High-Net-Worth" && "💎"}
                      {segment.name === "Small Business" && "🏢"}
                      {segment.name === "Young Professionals" && "👨‍💼"}
                      {segment.name === "Retirees" && "👴"}
                      <span className="font-medium">{segment.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ({segment.clientCount} clients)
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      🤖 {segment.agentsPerClient} agents/client | {segment.avgAUM} avg assets
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{segment.satisfaction}%</div>
                    <div className="text-xs text-muted-foreground">satisfaction</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${segment.color}`}
                    style={{ width: `${segment.satisfaction}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Draft Agents Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>🚧 Agents in Development</CardTitle>
            <CardDescription>Development pipeline and deployment timeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {draftAgents.map((agent) => (
              <div key={agent.name} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-sm text-gray-600">{agent.description}</div>
                      <Badge className={getStageColor(agent.status)}>
                        {agent.stage}
                      </Badge>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">Deploy: {agent.deployDate}</div>
                      <div className="text-muted-foreground">{agent.affectedUsers} users</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{agent.progress}%</span>
                    </div>
                    <Progress value={agent.progress} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="ghost" className="w-full mt-4">
              View Full Development Pipeline →
            </Button>
          </CardContent>
        </Card>

        {/* Customer Segment Deep Dive */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 Customer Segment Deep Dive</CardTitle>
            <CardDescription>Current Focus: {focusedSegment.name} Segment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <span className="font-medium">{focusedSegment.clientCount} clients</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ${(focusedSegment.clientCount * parseFloat(focusedSegment.avgAUM.replace(/[^0-9.]/g, '')) / 1000).toFixed(0)}M total AUM
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{focusedSegment.satisfaction}%</div>
                  <div className="text-sm text-muted-foreground">satisfaction</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">🤖 Agent Configuration:</div>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>• Private Banking Agent (Core)</div>
                  <div>• Estate Planning Agent (Advanced)</div>
                  <div>• Tax Strategy Agent (Seasonal)</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">📊 Performance Metrics:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Agent Utilization: 87%</div>
                  <div>Revenue per Client: +12%</div>
                  <div>Customer Satisfaction: {focusedSegment.satisfaction}%</div>
                  <div>Retention Rate: 98.7%</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Switch Segment ▼
              </Button>
              <Button size="sm">
                Optimize Config
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Recent Segment Activities</CardTitle>
          <CardDescription>Latest deployments and performance updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="border-l-4 border-l-blue-500 pl-4 py-2">
              <div className="flex items-start gap-3">
                {getStatusIcon(activity.status)}
                <div className="flex-1 space-y-1">
                  <div className="font-medium">{activity.action}</div>
                  <div className="text-sm text-gray-600">{activity.result}</div>
                </div>
                <div className="text-xs text-muted-foreground">{activity.time}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}