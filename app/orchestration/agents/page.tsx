"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Plus,
  Search,
  Settings,
  Power,
  Activity,
  Brain,
  Code,
  Sparkles,
  Zap,
  Shield,
  Target,
  GitBranch,
  MoreHorizontal,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Agent {
  id: string;
  name: string;
  type: string;
  description: string;
  status: "active" | "idle" | "offline";
  capability: string[];
  lastActive: string;
  performance: number;
  icon: React.ReactNode;
}

export default function AgentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const agents: Agent[] = [
    {
      id: "research-orchestrator",
      name: "RESEARCH-ORCHESTRATOR",
      type: "Orchestrator",
      description: "Coordinates codebase analysis and documentation research",
      status: "active",
      capability: ["Task Management", "Code Analysis", "Documentation"],
      lastActive: "2 minutes ago",
      performance: 98,
      icon: <Brain className="h-5 w-5" />
    },
    {
      id: "design-orchestrator",
      name: "DESIGN-ORCHESTRATOR",
      type: "Orchestrator",
      description: "Visual quality and aesthetic appeal coordinator",
      status: "active",
      capability: ["UI/UX Design", "Visual Analysis", "Design Systems"],
      lastActive: "5 minutes ago",
      performance: 95,
      icon: <Sparkles className="h-5 w-5" />
    },
    {
      id: "build-orchestrator",
      name: "BUILD-ORCHESTRATOR",
      type: "Orchestrator",
      description: "Coordinates code implementation across change types",
      status: "idle",
      capability: ["Code Generation", "Implementation", "Refactoring"],
      lastActive: "1 hour ago",
      performance: 92,
      icon: <Code className="h-5 w-5" />
    },
    {
      id: "testing-orchestrator",
      name: "TESTING-ORCHESTRATOR",
      type: "Orchestrator",
      description: "Coordinates comprehensive test strategy & execution",
      status: "active",
      capability: ["Test Generation", "Test Execution", "Coverage Analysis"],
      lastActive: "10 minutes ago",
      performance: 88,
      icon: <Shield className="h-5 w-5" />
    },
    {
      id: "validator-orchestrator",
      name: "VALIDATOR-ORCHESTRATOR",
      type: "Orchestrator",
      description: "Coordinates agent analysis and validation",
      status: "idle",
      capability: ["Validation", "Quality Assurance", "Compliance"],
      lastActive: "30 minutes ago",
      performance: 90,
      icon: <Target className="h-5 w-5" />
    },
    {
      id: "planning-orchestrator",
      name: "PLANNING-ORCHESTRATOR",
      type: "Orchestrator",
      description: "Coordinates development planning and strategy",
      status: "offline",
      capability: ["Planning", "Strategy", "Task Breakdown"],
      lastActive: "2 hours ago",
      performance: 85,
      icon: <GitBranch className="h-5 w-5" />
    },
    {
      id: "build-poc",
      name: "build-poc",
      type: "Builder",
      description: "Speed-focused POC implementation with demo quality",
      status: "active",
      capability: ["POC Development", "Rapid Prototyping", "Demo Creation"],
      lastActive: "15 minutes ago",
      performance: 94,
      icon: <Zap className="h-5 w-5" />
    },
    {
      id: "build-mvp",
      name: "build-mvp",
      type: "Builder",
      description: "Production-quality MVP implementation with robustness",
      status: "idle",
      capability: ["MVP Development", "Production Code", "Architecture"],
      lastActive: "45 minutes ago",
      performance: 91,
      icon: <Bot className="h-5 w-5" />
    },
    {
      id: "design-aesthetic",
      name: "design-aesthetic-visual",
      type: "Designer",
      description: "Evaluate visual design quality and emotional impact",
      status: "active",
      capability: ["Visual Design", "Color Theory", "Typography"],
      lastActive: "8 minutes ago",
      performance: 96,
      icon: <Sparkles className="h-5 w-5" />
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "idle":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 90) return "text-green-500";
    if (performance >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || agent.type === filterType;
    const matchesStatus = filterStatus === "all" || agent.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const agentTypes = ["all", "Orchestrator", "Builder", "Designer", "Analyzer"];
  const statusTypes = ["all", "active", "idle", "offline"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Management</h1>
          <p className="text-muted-foreground mt-1">
            Configure and monitor your AI agent network
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Agent
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {agentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "all" ? "All Types" : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {statusTypes.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "all" ? "All Statuses" : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} className="relative hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {agent.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {agent.type}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {agent.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(agent.status)}`} />
                  <span className="text-xs capitalize">{agent.status}</span>
                </div>
                <span className="text-xs text-muted-foreground">{agent.lastActive}</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Performance</span>
                  <span className={`text-xs font-bold ${getPerformanceColor(agent.performance)}`}>
                    {agent.performance}%
                  </span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      agent.performance >= 90 ? "bg-green-500" :
                      agent.performance >= 70 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${agent.performance}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {agent.capability.map((cap) => (
                  <Badge key={cap} variant="secondary" className="text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Settings className="h-3 w-3 mr-1" />
                  Configure
                </Button>
                {agent.status === "offline" ? (
                  <Button size="sm" variant="outline" className="flex-1">
                    <Power className="h-3 w-3 mr-1" />
                    Start
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="flex-1">
                    <Activity className="h-3 w-3 mr-1" />
                    Monitor
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Network Statistics</CardTitle>
          <CardDescription>Overall performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Total Agents</p>
              <p className="text-2xl font-bold">{agents.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Active Agents</p>
              <p className="text-2xl font-bold text-green-500">
                {agents.filter(a => a.status === "active").length}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Average Performance</p>
              <p className="text-2xl font-bold">
                {Math.round(agents.reduce((acc, a) => acc + a.performance, 0) / agents.length)}%
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Orchestrators</p>
              <p className="text-2xl font-bold">
                {agents.filter(a => a.type === "Orchestrator").length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}