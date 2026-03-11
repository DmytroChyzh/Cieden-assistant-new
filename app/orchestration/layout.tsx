"use client";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { usePathname } from "next/navigation";
import { Component, BarChart3, Workflow, Home, Users } from "lucide-react";
import { ElevenLabsProvider } from '@/src/providers/ElevenLabsProvider';

const getPageInfo = (pathname: string) => {
  switch (pathname) {
    case '/orchestration/tools':
      return { title: 'Tool Testing', icon: Component };
    case '/orchestration/agents':
      return { title: 'Agent Management', icon: BarChart3 };
    case '/orchestration/workflows':
      return { title: 'Workflow Control', icon: Workflow };
    case '/orchestration/customer-engagement':
      return { title: 'Customer Engagement', icon: Users };
    case '/orchestration':
    default:
      return { title: 'Dashboard', icon: Home };
  }
};

export default function OrchestrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { title, icon: Icon } = getPageInfo(pathname);

  return (
    <ElevenLabsProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-6">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <Icon className="h-6 w-6" />
                <h1 className="text-xl font-semibold">{title}</h1>
              </div>
              <div className="flex-1" />
            </header>
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ElevenLabsProvider>
  );
}