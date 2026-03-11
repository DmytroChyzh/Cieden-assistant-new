"use client";

import {
  AlertTriangle,
  BarChart3,
  Bot,
  Cable,
  DollarSign,
  FileCode,
  LayoutDashboard,
  Microscope,
  Network,
  Settings,
  Shield,
  Target,
  TestTube,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const roles = [
  {
    id: "ai-ops-lead",
    name: "AI Ops Lead",
    description: "Keep fleet healthy; manage spend/latency; kill-switches",
    icon: Zap,
    color: "text-blue-600"
  },
  {
    id: "service-design",
    name: "Service Design", 
    description: "Design policies, offers, arbitration, and paths",
    icon: Target,
    color: "text-purple-600"
  },
  {
    id: "growth-marketing-manager",
    name: "Growth/Marketing Manager",
    description: "Launch promos, set objectives, read uplift",
    icon: TrendingUp,
    color: "text-green-600"
  },
  {
    id: "risk-compliance-officer",
    name: "Risk/Compliance Officer",
    description: "Enforce guardrails, review incidents, audit",
    icon: Shield,
    color: "text-red-600"
  },
  {
    id: "data-scientist-ml",
    name: "Data Scientist/ML",
    description: "Evaluate models/bandits, drift, and explainability",
    icon: BarChart3,
    color: "text-orange-600"
  }
];

const roleNavigationMap = {
  "ai-ops-lead": {
    main: [
      { title: "Fleet Health", url: "/orchestration/fleet-health", icon: Bot },
      { title: "Performance Monitor", url: "/orchestration/performance", icon: Zap },
      { title: "Cost Management", url: "/orchestration/cost", icon: DollarSign },
      { title: "Kill Switches", url: "/orchestration/kill-switches", icon: AlertTriangle },
    ],
    resources: [
      { title: "System Monitor", url: "/orchestration/system", icon: Network },
      { title: "API Explorer", url: "/orchestration/api-explorer", icon: FileCode },
      { title: "Integrations", url: "/orchestration/integrations", icon: Cable },
    ]
  },
  "service-design": {
    main: [
      { title: "Tools", url: "/orchestration/tools", icon: Settings },
      { title: "Customer Engagement", url: "/orchestration/customer-engagement", icon: Users },
      { title: "Journey Design", url: "/orchestration/journeys", icon: Workflow },
      { title: "Policy Builder", url: "/orchestration/policies", icon: Settings },
      { title: "Offer Management", url: "/orchestration/offers", icon: Target },
      { title: "Arbitration Rules", url: "/orchestration/arbitration", icon: Users },
    ],
    resources: [
      { title: "Templates", url: "/orchestration/templates", icon: FileCode },
      { title: "A/B Testing", url: "/orchestration/ab-testing", icon: TestTube },
    ]
  },
  "growth-marketing-manager": {
    main: [
      { title: "Campaigns", url: "/orchestration/campaigns", icon: TrendingUp },
      { title: "Promotions", url: "/orchestration/promotions", icon: Target },
      { title: "Analytics", url: "/orchestration/analytics", icon: BarChart3 },
      { title: "Customer Engagement", url: "/orchestration/customer-engagement", icon: Users },
    ],
    resources: [
      { title: "Segment Builder", url: "/orchestration/segments", icon: Users },
      { title: "Content Library", url: "/orchestration/content", icon: FileCode },
    ]
  },
  "risk-compliance-officer": {
    main: [
      { title: "Risk Dashboard", url: "/orchestration/risk", icon: Shield },
      { title: "Compliance Rules", url: "/orchestration/compliance", icon: Settings },
      { title: "Incident Review", url: "/orchestration/incidents", icon: AlertTriangle },
      { title: "Audit Trails", url: "/orchestration/audit", icon: FileCode },
    ],
    resources: [
      { title: "Policy Enforcement", url: "/orchestration/enforcement", icon: Shield },
      { title: "Reports", url: "/orchestration/reports", icon: BarChart3 },
    ]
  },
  "data-scientist-ml": {
    main: [
      { title: "Model Performance", url: "/orchestration/models", icon: BarChart3 },
      { title: "Experiment Tracking", url: "/orchestration/experiments", icon: TestTube },
      { title: "Data Drift Monitor", url: "/orchestration/drift", icon: TrendingUp },
      { title: "Explainability", url: "/orchestration/explainability", icon: Microscope },
    ],
    resources: [
      { title: "Datasets", url: "/orchestration/datasets", icon: FileCode },
      { title: "Feature Store", url: "/orchestration/features", icon: Cable },
      { title: "Lab", url: "/orchestration/lab", icon: Microscope },
    ]
  }
};

const commonNavigation = [
  { title: "Dashboard", url: "/orchestration", icon: LayoutDashboard },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [selectedRole, setSelectedRole] = useState<string>("service-design");

  useEffect(() => {
    const savedRole = localStorage.getItem("selected-role");
    if (savedRole && roles.find(r => r.id === savedRole)) {
      setSelectedRole(savedRole);
    }
  }, []);

  const handleRoleChange = (roleId: string) => {
    setSelectedRole(roleId);
    localStorage.setItem("selected-role", roleId);
  };

  const currentRole = roles.find(r => r.id === selectedRole) || roles[0];
  const currentNavigation = roleNavigationMap[selectedRole as keyof typeof roleNavigationMap] || roleNavigationMap["service-design"];

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4 border-b">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Agent Orchestrator</span>
              <span className="text-xs text-muted-foreground">v0.1.0</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Select value={selectedRole} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <currentRole.icon className={`h-4 w-4 ${currentRole.color}`} />
                    <span className="font-medium">{currentRole.name}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex items-center gap-2">
                      <role.icon className={`h-4 w-4 ${role.color}`} />
                      <span>{role.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{currentRole.description}</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Common Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Common</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {commonNavigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Role-specific Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <currentRole.icon className={`h-3 w-3 ${currentRole.color}`} />
              <span>Main</span>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {currentNavigation.main.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Role-specific Resources Navigation */}
        {currentNavigation.resources && currentNavigation.resources.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Resources</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {currentNavigation.resources.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={pathname === item.url}>
                        <a href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="px-4 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/orchestration/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}