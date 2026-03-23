"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GitBranch,
  Plus,
  Play,
  Edit,
  Pause,
  Square,
  RotateCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  Activity,
  Zap,
  MoreVertical,
  Eye,
} from "lucide-react";

interface WorkflowStep {
  id: string;
  name: string;
  agent: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped" | "paused";
  duration?: string;
  input?: string;
  output?: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: "idle" | "running" | "completed" | "failed" | "paused";
  progress: number;
  steps: WorkflowStep[];
  createdAt: string;
  lastRun?: string;
  totalRuns: number;
  successRate: number;
}

export default function WorkflowsPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);

  const workflows: Workflow[] = [
    {
      id: "feature-dev",
      name: "Feature Development Pipeline",
      description: "End-to-end feature implementation with testing",
      status: "running",
      progress: 65,
      steps: [
        { id: "1", name: "Research & Analysis", agent: "RESEARCH-ORCHESTRATOR", status: "completed", duration: "2m 15s" },
        { id: "2", name: "Design & Planning", agent: "DESIGN-ORCHESTRATOR", status: "completed", duration: "3m 42s" },
        { id: "3", name: "Implementation", agent: "BUILD-ORCHESTRATOR", status: "running" },
        { id: "4", name: "Testing", agent: "TESTING-ORCHESTRATOR", status: "pending" },
        { id: "5", name: "Review & Validation", agent: "VALIDATOR-ORCHESTRATOR", status: "pending" }
      ],
      createdAt: "2024-01-15",
      lastRun: "10 minutes ago",
      totalRuns: 42,
      successRate: 95
    },
    {
      id: "bug-fix",
      name: "Bug Resolution Workflow",
      description: "Automated bug detection, analysis, and resolution",
      status: "completed",
      progress: 100,
      steps: [
        { id: "1", name: "Bug Analysis", agent: "RESEARCH-ORCHESTRATOR", status: "completed", duration: "1m 30s" },
        { id: "2", name: "Root Cause Analysis", agent: "VALIDATOR-ORCHESTRATOR", status: "completed", duration: "2m 10s" },
        { id: "3", name: "Fix Implementation", agent: "BUILD-ORCHESTRATOR", status: "completed", duration: "4m 20s" },
        { id: "4", name: "Regression Testing", agent: "TESTING-ORCHESTRATOR", status: "completed", duration: "3m 15s" }
      ],
      createdAt: "2024-01-10",
      lastRun: "2 hours ago",
      totalRuns: 156,
      successRate: 89
    },
    {
      id: "poc-rapid",
      name: "Rapid POC Development",
      description: "Quick proof of concept implementation",
      status: "idle",
      progress: 0,
      steps: [
        { id: "1", name: "Concept Validation", agent: "PLANNING-ORCHESTRATOR", status: "pending" },
        { id: "2", name: "POC Implementation", agent: "build-poc", status: "pending" },
        { id: "3", name: "Demo Preparation", agent: "DESIGN-ORCHESTRATOR", status: "pending" }
      ],
      createdAt: "2024-01-20",
      lastRun: "1 day ago",
      totalRuns: 23,
      successRate: 92
    },
    {
      id: "code-review",
      name: "Comprehensive Code Review",
      description: "Multi-agent code quality and security review",
      status: "paused",
      progress: 40,
      steps: [
        { id: "1", name: "Static Analysis", agent: "VALIDATOR-ORCHESTRATOR", status: "completed", duration: "45s" },
        { id: "2", name: "Security Scan", agent: "TESTING-ORCHESTRATOR", status: "completed", duration: "1m 20s" },
        { id: "3", name: "Performance Analysis", agent: "RESEARCH-ORCHESTRATOR", status: "paused" },
        { id: "4", name: "Recommendations", agent: "PLANNING-ORCHESTRATOR", status: "pending" }
      ],
      createdAt: "2024-01-18",
      lastRun: "4 hours ago",
      totalRuns: 67,
      successRate: 94
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "running":
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "paused":
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case "pending":
      case "idle":
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Commented out unused function
  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case "completed":
  //       return "bg-green-500";
  //     case "running":
  //       return "bg-blue-500";
  //     case "failed":
  //       return "bg-red-500";
  //     case "paused":
  //       return "bg-yellow-500";
  //     default:
  //       return "bg-gray-500";
  //   }
  // };

  const selectedWorkflowData = workflows.find(w => w.id === selectedWorkflow);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Management</h1>
          <p className="text-muted-foreground mt-1">
            Design and execute multi-agent workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Layers className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Workflow List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Workflows</CardTitle>
              <CardDescription>Select a workflow to view details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {workflows.map((workflow) => (
                <Card 
                  key={workflow.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedWorkflow === workflow.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedWorkflow(workflow.id)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(workflow.status)}
                            <h3 className="font-medium">{workflow.name}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {workflow.description}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{workflow.progress}%</span>
                        </div>
                        <Progress value={workflow.progress} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            {workflow.steps.length} steps
                          </span>
                          <span className="text-muted-foreground">
                            {workflow.totalRuns} runs
                          </span>
                        </div>
                        {workflow.lastRun && (
                          <span className="text-muted-foreground">
                            Last run: {workflow.lastRun}
                          </span>
                        )}
                      </div>

                      {workflow.status === "running" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Pause className="h-3 w-3 mr-1" />
                            Pause
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            <Square className="h-3 w-3 mr-1" />
                            Stop
                          </Button>
                        </div>
                      )}

                      {workflow.status === "paused" && (
                        <Button size="sm" variant="outline" className="w-full">
                          <Play className="h-3 w-3 mr-1" />
                          Resume
                        </Button>
                      )}

                      {(workflow.status === "idle" || workflow.status === "completed" || workflow.status === "failed") && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            <RotateCw className="h-3 w-3 mr-1" />
                            Restart
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Workflow Details */}
        <div className="space-y-4">
          {selectedWorkflowData ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Workflow Steps</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View Logs
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Execution pipeline for {selectedWorkflowData.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedWorkflowData.steps.map((step, index) => (
                    <div key={step.id} className="relative">
                      {index < selectedWorkflowData.steps.length - 1 && (
                        <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border" />
                      )}
                      <div className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          step.status === "completed" ? "bg-green-500/10" :
                          step.status === "running" ? "bg-blue-500/10" :
                          step.status === "failed" ? "bg-red-500/10" :
                          "bg-gray-500/10"
                        }`}>
                          {step.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : step.status === "running" ? (
                            <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                          ) : step.status === "failed" ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{step.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {step.agent}
                              </Badge>
                            </div>
                            {step.duration && (
                              <span className="text-xs text-muted-foreground">
                                {step.duration}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={step.status === "completed" ? "default" : 
                                      step.status === "running" ? "secondary" : 
                                      step.status === "failed" ? "destructive" : "outline"}
                              className="text-xs"
                            >
                              {step.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workflow Metrics</CardTitle>
                  <CardDescription>Performance and reliability statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <div className="flex items-center gap-2">
                        <Zap className={`h-4 w-4 ${
                          selectedWorkflowData.successRate >= 90 ? "text-green-500" :
                          selectedWorkflowData.successRate >= 70 ? "text-yellow-500" :
                          "text-red-500"
                        }`} />
                        <span className="text-2xl font-bold">
                          {selectedWorkflowData.successRate}%
                        </span>
                      </div>

                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Total Runs</p>
                      <p className="text-2xl font-bold">{selectedWorkflowData.totalRuns}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="text-sm">{selectedWorkflowData.createdAt}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Last Run</p>
                      <p className="text-sm">{selectedWorkflowData.lastRun || "Never"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-20">
                <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Select a workflow to view details
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}