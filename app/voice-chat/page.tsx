"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UnifiedChatInput } from "@/src/components/unified/UnifiedChatInput";
import { SpeakingHUD } from "@/src/components/voice/SpeakingHUD";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { useChatMessages } from "@/src/hooks/useChatMessages";
import { useConvexMessageSync } from "@/src/hooks/useConvexMessageSync";
import { useCopilotAction, useCopilotReadable, useCopilotContext } from "@copilotkit/react-core";
import { ChartMessage } from "@/src/components/charts/ChartMessage";
import { MessageCard } from "@/src/components/chat/MessageCard";
import { ChatWindow, ChatMessage } from "@/src/chatbot-ui";
import type { ChatbotMessage } from "@/src/chatbot-ui";
import { BalanceCard } from "@/src/components/charts/BalanceCard";
import { CreditScoreCard } from "@/src/components/charts/CreditScoreCard";
import { ActionHandlers } from "@/src/utils/toolBridge";
// import { useTextMessaging } from "@/src/hooks/useTextMessaging"; // Moved inside provider context
import { VoiceChatHeader } from "@/src/components/VoiceChatHeader";
import { SettingsPanel } from '@/src/components/unified/SettingsPanel';
import { useSettings } from '@/src/components/unified/hooks/useSettings';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { QuizProvider } from "@/src/components/quiz/QuizProvider";
import { ElevenLabsProvider, useElevenLabsConversation } from '@/src/providers/ElevenLabsProvider';
import { SessionResetter } from '@/src/components/voice/SessionResetter';
import { parseToolCall } from '@/src/utils/parseToolCall';
import LuminaGradientBackground from "@/components/LuminaGradientBackground";
// Legacy onboarding chat kept for reference; inline onboarding is now handled directly in this page.
// import { OnboardingChat } from "@/src/components/onboarding/OnboardingChat";
import {
  CasesGrid,
  BestCaseCard,
  EngagementModelsCard,
  CaseStudyPanel,
  AboutPanel,
} from "@/src/components/cieden/SalesUi";
import { EstimateWizardPanel } from "@/src/components/cieden/EstimateWizardPanel";

interface VoiceChatPageProps {
  isMobile?: boolean;
}

export default function VoiceChatPage(props: VoiceChatPageProps = {}) {
  // Session resetter moved to dedicated component
  const { isMobile = false } = props;
  const router = useRouter();
  const { signOut, signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [conversationId, setConversationId] = useState<Id<"conversations"> | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [lastMessage, setLastMessage] = useState<{ text: string; source: 'voice' | 'text' } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingQuizContextsRef = useRef<string[]>([]);
  const [sendContextualUpdate, setSendContextualUpdate] = useState<((text: string) => void) | null>(null);
  const [sendProgrammaticMessage, setSendProgrammaticMessage] = useState<((text: string) => Promise<void>) | null>(null);
  
  // Voice audio states for background animations
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [userAudioLevel, setUserAudioLevel] = useState(0);
  const [agentAudioLevel, setAgentAudioLevel] = useState(0);
  
  // Derive agent speaking state from voice status
  const isAgentSpeaking = voiceStatus === 'speaking';
  
  const { settings, updateSettings } = useSettings();

  const quickPrompts = [
    { title: "What does Cieden do?", valueEn: "What does Cieden do? Tell me about your company and services." },
    { title: "Show your portfolio", valueEn: "Show me your portfolio or case studies." },
    { title: "How much does a project cost?", valueEn: "How much does a typical project cost? I need a rough estimate." },
    { title: "What's your design process?", valueEn: "What is your design process and timeline?" },
    { title: "Do you do development too?", valueEn: "Do you do development as well, or design only?" },
    { title: "How do I start a project?", valueEn: "How can I start a project with Cieden? What's the first step?" },
  ];
  
  const conversations = useQuery(api.conversations.list);
  const currentUser = useQuery(api.users.getCurrentUser);
  const createConversation = useMutation(api.conversations.create);
  const createMessage = useMutation(api.messages.create);
  const clearHistory = useMutation(api.messages.clearForConversation);
  // Custom hook for Convex message integration
  const { convexMessages } = useChatMessages({ conversationId });

  // Onboarding state for unauthenticated users (collect name + email via main chat input)
  type OnboardingStep = "ask_name" | "ask_email" | "creating" | "done";
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("ask_name");
  const [onboardingMessages, setOnboardingMessages] = useState<ChatbotMessage[]>([]);
  const [onboardingName, setOnboardingName] = useState("");

  // Seed initial onboarding assistant message when not authenticated
  useEffect(() => {
    if (!isAuthenticated && onboardingMessages.length === 0) {
      setOnboardingMessages([
        {
          id: `onb-${Date.now()}`,
          role: "assistant",
          content:
            "Hi! Welcome to Cieden. I'm your AI design assistant. Before we begin, could you please tell me your name?",
          timestamp: Date.now(),
        },
      ]);
      setOnboardingStep("ask_name");
    }
  }, [isAuthenticated, onboardingMessages.length]);

  // Handle pre-auth messages (name + email) coming from the main chat input
  const handlePreAuthMessage = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value) return;

      const userMessage: ChatbotMessage = {
        id: `onb-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: "user",
        content: value,
        timestamp: Date.now(),
      };
      setOnboardingMessages((prev) => [...prev, userMessage]);

      if (onboardingStep === "ask_name") {
        setOnboardingName(value);
        setOnboardingStep("ask_email");
        setOnboardingMessages((prev) => [
          ...prev,
          {
            id: `onb-assistant-${Date.now()}`,
            role: "assistant",
            content: `Nice to meet you, ${value}! Now, could you share your email? Our team might reach out to discuss your project.`,
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      if (onboardingStep === "ask_email") {
        const email = value;
        setOnboardingStep("creating");
        setOnboardingMessages((prev) => [
          ...prev,
          {
            id: `onb-assistant-${Date.now()}`,
            role: "assistant",
            content: `Thank you, ${onboardingName || "there"}! Setting everything up for you...`,
            timestamp: Date.now(),
          },
        ]);

        try {
          const generatedPassword = `cieden_guest_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 10)}`;

          await signIn("password", {
            email,
            password: generatedPassword,
            name: onboardingName || "Guest",
            flow: "signUp",
          });

          setOnboardingStep("done");
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (errorMsg.includes("already exists") || errorMsg.includes("Could not create")) {
            const parts = email.split("@");
            const local = parts[0] || "guest";
            const domain = parts[1] || "cieden.guest";
            const fallbackEmail = `${local}+${Date.now()}@${domain}`;
            const fallbackPassword = `cieden_${Date.now()}`;
            try {
              await signIn("password", {
                email: fallbackEmail,
                password: fallbackPassword,
                name: onboardingName || "Guest",
                flow: "signUp",
              });
              setOnboardingStep("done");
              return;
            } catch {
              // fall through to error message
            }
          }

          setOnboardingStep("ask_email");
          setOnboardingMessages((prev) => [
            ...prev,
            {
              id: `onb-assistant-${Date.now()}`,
              role: "assistant",
              content: "Hmm, something went wrong. Could you try a different email address?",
              timestamp: Date.now(),
            },
          ]);
        }
      }
    },
    [onboardingStep, onboardingName, signIn],
  );

  // Простий авто‑скрол: тримаємо повзунок у самому низу,
  // без додаткового "хвоста" після останнього повідомлення
  useEffect(() => {
    if (!messagesEndRef.current) return;
    if (!convexMessages || convexMessages.length === 0) return;
    messagesEndRef.current.scrollIntoView({ block: "end" });
  }, [convexMessages?.length]);

  // Sync Convex messages to CopilotKit for chart actions only
  useConvexMessageSync({ conversationId });

  // Make conversation context available to CopilotKit
  useCopilotReadable({
    description: "Current conversation ID for saving financial charts",
    value: conversationId || "No conversation selected"
  });

  // === CIEDEN SALES ASSISTANT ACTIONS ===
  // 1) Portfolio / cases list
  useCopilotAction({
    name: "showCases",
    description:
      "Show Cieden case studies / portfolio in a compact card layout. Use when user asks about examples of work, portfolio, or case studies.",
    parameters: [],
    handler: async () => {
      return "Showing selected case studies from Cieden portfolio.";
    },
    render: () => (
      <div className="w-full max-w-4xl mx-auto">
        <CasesGrid />
      </div>
    ),
  });

  // 2) Specific case details
  // (Deprecated in favour of side panel navigation; keep CaseStudyPanel for detailed view)

  // 3) Best / highlight case
  useCopilotAction({
    name: "showBestCase",
    description:
      "Show the most impressive or most relevant Cieden case study for this user. Use when the user asks for the best / strongest example.",
    parameters: [],
    handler: async () => {
      return "Showing one flagship case study that best illustrates our impact.";
    },
    render: () => (
      <div className="w-full max-w-4xl mx-auto">
        <BestCaseCard />
      </div>
    ),
  });

  // 4) Engagement / pricing models
  useCopilotAction({
    name: "showEngagementModels",
    description:
      "Show the main collaboration and pricing models Cieden works with (Time & Material, Partnership, Dedicated team). Use when user asks how we work or pricing models.",
    parameters: [],
    handler: async () => {
      return "Showing main collaboration models we use with clients.";
    },
    render: () => (
      <div className="w-full max-w-4xl mx-auto">
        <EngagementModelsCard />
      </div>
    ),
  });

  // 5) Generate preliminary estimate card
  useCopilotAction({
    name: "generateEstimate",
    description:
      "Generate a preliminary cost estimate card for a design or design+development project, based on product type, complexity and scope. Always treat this as a rough range, not a final quote.",
    parameters: [
      {
        name: "productType",
        type: "string",
        description: "Product type: web app, mobile app, B2B SaaS, marketplace, internal tool, etc.",
        required: false,
      },
      {
        name: "complexity",
        type: "string",
        description: "Rough complexity: low / medium / high.",
        required: false,
      },
      {
        name: "scope",
        type: "string",
        description: "Design only or design + development, and high-level feature list.",
        required: false,
      },
      {
        name: "timeline",
        type: "string",
        description: "Desired timeline (e.g. 2-3 months, 3-6 months).",
        required: false,
      },
      {
        name: "budgetHint",
        type: "number",
        description: "Optional budget hint from the user (in USD).",
        required: false,
      },
    ],
    // Simple heuristic for rough ranges; this is not a contract quote.
    handler: async ({
      productType,
      complexity,
      scope,
      timeline,
      budgetHint,
    }: {
      productType?: string;
      complexity?: string;
      scope?: string;
      timeline?: string;
      budgetHint?: number;
    }) => {
      // Base in thousands USD
      let base = 25;
      if (complexity === "low") base = 15;
      if (complexity === "high") base = 40;
      if (productType && /mobile|two platforms|web \+ mobile/i.test(productType)) {
        base += 10;
      }
      if (scope && /development|full/i.test(scope)) {
        base += 20;
      }
      if (budgetHint && budgetHint > 0) {
        // Softly pull towards provided budget
        base = (base * 0.6 + budgetHint / 1000 * 0.4);
      }
      const from = Math.round(base * 0.8) * 1000;
      const to = Math.round(base * 1.3) * 1000;
      return `Preliminary estimate between ${from} and ${to} USD. This is a rough range, not a final quote.`;
    },
    render: ({ args, result }) => {
      // Parse back our approximate numbers if available, otherwise just default band.
      const match = typeof result === "string" ? result.match(/between (\d+) and (\d+)/) : null;
      const from = match ? Number(match[1]) : 20000;
      const to = match ? Number(match[2]) : 40000;
      return (
        <div className="w-full max-w-4xl mx-auto">
          <EstimateSummaryCard
            productType={args.productType}
            complexity={args.complexity}
            scope={args.scope}
            timeline={args.timeline}
            rangeFrom={from}
            rangeTo={to}
          />
        </div>
      );
    },
  });

  // 6) Lightweight “calculator” – more like an entry point card
  useCopilotAction({
    name: "openCalculator",
    description:
      "Open an interactive-style cost/effort calculator card. Use when the user explicitly asks for a calculator or wants to play with options.",
    parameters: [],
    handler: async () => {
      return "Opened a simple estimator card; you can now ask the assistant to adjust assumptions.";
    },
    render: () => (
      <div className="w-full max-w-4xl mx-auto">
        <EngagementModelsCard />
      </div>
    ),
  });

  // CopilotKit action for creating pie charts
  useCopilotAction({
    name: "createFinancialPieChart",
    description: "Create a pie chart for financial data visualization - perfect for expense breakdowns and portfolio allocation. Use this when users ask for pie charts, expense breakdowns, or budget visualization.",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Chart title (e.g. 'Monthly Expenses Breakdown')",
        required: true
      },
      {
        name: "data",
        type: "object[]",
        description: "Array of data points for the pie chart",
        required: true,
        items: {
          type: "object",
          attributes: [
            {
              name: "name",
              type: "string", 
              description: "Category name (e.g. 'Food', 'Rent')",
              required: true
            },
            {
              name: "value",
              type: "number",
              description: "Amount/value for the category",
              required: true
            },
            {
              name: "category",
              type: "string",
              description: "Optional subcategory",
              required: false
            }
          ]
        }
      }
    ],
    handler: async ({ title, data }) => {
      if (!conversationId) {
        throw new Error("No conversation selected");
      }

      // Create chart in Convex database
      await createChart({
        type: "pie",
        title,
        data,
        conversationId
      });

      return `Created pie chart: ${title}`;
    },
    render: ({ args, status }) => {
      if (status === "inProgress") {
        return <div className="p-4 rounded-lg bg-muted">Creating pie chart...</div>;
      }
      
      // For demo purposes, show chart inline
      return (
        <ChartMessage
          chart={{
            _id: `temp-${Date.now()}` as Id<"charts">,
            type: "pie",
            title: args.title,
            data: args.data,
            conversationId: conversationId!,
            _creationTime: Date.now()
          }}
          compact={true}
        />
      );
    }
  });

  // CopilotKit action for creating bar charts  
  useCopilotAction({
    name: "createFinancialBarChart",
    description: "Create a bar chart for comparing financial data over time - ideal for income vs expenses and trend analysis. Use this when users ask for bar charts, income comparisons, or time-based analysis.",
    parameters: [
      {
        name: "title",
        type: "string",
        description: "Chart title (e.g. 'Income vs Expenses - Last 6 Months')",
        required: true
      },
      {
        name: "data", 
        type: "object[]",
        description: "Array of time-series or categorical data",
        required: true,
        items: {
          type: "object",
          attributes: [
            {
              name: "period",
              type: "string",
              description: "Time period or category (e.g. 'Jan 2024')",
              required: true
            },
            {
              name: "income",
              type: "number", 
              description: "Income amount (optional)",
              required: false
            },
            {
              name: "expenses",
              type: "number",
              description: "Expenses amount (optional)", 
              required: false
            },
            {
              name: "value",
              type: "number",
              description: "Single value (optional)",
              required: false
            }
          ]
        }
      }
    ],
    handler: async ({ title, data }) => {
      if (!conversationId) {
        throw new Error("No conversation selected");
      }

      // Create chart in Convex database
      await createChart({
        type: "bar",
        title,
        data,
        conversationId
      });

      return `Created bar chart: ${title}`;
    },
    render: ({ args, status }) => {
      if (status === "inProgress") {
        return <div className="p-4 rounded-lg bg-muted">Creating bar chart...</div>;
      }
      
      // For demo purposes, show chart inline
      return (
        <ChartMessage
          chart={{
            _id: `temp-${Date.now()}` as Id<"charts">,
            type: "bar",
            title: args.title,
            data: args.data,
            conversationId: conversationId!,
            _creationTime: Date.now()
          }}
          compact={true}
        />
      );
    }
  });

  const createChart = useMutation(api.charts.create);

  // Set mounted state to true on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track onboarding completion to trigger re-render
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Cases side panel (domain filter → case detail; or open specific case from card)
  const [activePanelDomain, setActivePanelDomain] = useState<string | null>(null);
  const [initialPanelCaseId, setInitialPanelCaseId] = useState<string | null>(null);

  // About Cieden side panel
  const [showAboutPanel, setShowAboutPanel] = useState(false);

  // Estimate wizard side panel (unified for generate_estimate / open_calculator)
  const [showEstimatePanel, setShowEstimatePanel] = useState(false);
  useEffect(() => {
    const handleOpenEstimatePanel = () => setShowEstimatePanel(true);
    window.addEventListener("open-estimate-panel", handleOpenEstimatePanel);
    return () => window.removeEventListener("open-estimate-panel", handleOpenEstimatePanel);
  }, []);

  useEffect(() => {
    const handleCasesPanel = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const domain = detail?.domain;
      if (domain) {
        setActivePanelDomain(domain);
        setInitialPanelCaseId(detail?.caseId ?? null);
      }
    };
    const handleOpenCaseInPanel = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const domain = detail?.domain;
      const caseId = detail?.caseId;
      if (domain && caseId) {
        setActivePanelDomain(domain);
        setInitialPanelCaseId(caseId);
      }
    };
    window.addEventListener("open-cases-panel", handleCasesPanel);
    window.addEventListener("open-case-in-panel", handleOpenCaseInPanel);
    return () => {
      window.removeEventListener("open-cases-panel", handleCasesPanel);
      window.removeEventListener("open-case-in-panel", handleOpenCaseInPanel);
    };
  }, []);

  // Open About Cieden panel from about card
  useEffect(() => {
    const handleOpenAbout = () => setShowAboutPanel(true);
    window.addEventListener("open-about-panel", handleOpenAbout);
    return () => window.removeEventListener("open-about-panel", handleOpenAbout);
  }, []);

  const closeCasesPanel = useCallback(() => {
    setActivePanelDomain(null);
    setInitialPanelCaseId(null);
  }, []);

  // Get queueToolMessage from provider context - must be called inside provider tree
  // We'll use a ref to make it accessible to actionHandlers defined outside the provider
  const queueToolMessageRef = useRef<((content: string, metadata?: Record<string, any>) => void) | null>(null);

  // Action Handlers – Cieden sales tools only (must match ElevenLabs Agent Tools)
  const actionHandlers: ActionHandlers = {
    show_cases: async (params) => {
      console.log('🎨 Bridge Handler - show_cases called:', params);
      try {
        const toolCallMessage = `TOOL_CALL:show_cases:${JSON.stringify(params || {})}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'show_cases', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue show_cases:', error);
      }
      return 'Showing Cieden portfolio case studies on screen.';
    },

    show_best_case: async (params) => {
      console.log('⭐ Bridge Handler - show_best_case called:', params);
      try {
        const toolCallMessage = `TOOL_CALL:show_best_case:${JSON.stringify(params || {})}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'show_best_case', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue show_best_case:', error);
      }
      return 'Showing our flagship case study on screen.';
    },

    show_engagement_models: async (params) => {
      console.log('🤝 Bridge Handler - show_engagement_models called:', params);
      try {
        const toolCallMessage = `TOOL_CALL:show_engagement_models:${JSON.stringify(params || {})}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'show_engagement_models', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue show_engagement_models:', error);
      }
      return 'Showing Cieden collaboration and pricing models on screen.';
    },

    generate_estimate: async (params) => {
      console.log('💰 Bridge Handler - generate_estimate called:', params);
      window.dispatchEvent(new CustomEvent("open-estimate-panel"));
      try {
        const toolCallMessage = `TOOL_CALL:generate_estimate:${JSON.stringify(params || {})}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'generate_estimate', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue generate_estimate:', error);
      }
      return 'I\'ve opened the estimate wizard in the side panel. Answer a few questions to get a preliminary price range. For an exact quote, our manager will follow up.';
    },

    open_calculator: async (params) => {
      console.log('🧮 Bridge Handler - open_calculator called:', params);
      window.dispatchEvent(new CustomEvent("open-estimate-panel"));
      try {
        const toolCallMessage = `TOOL_CALL:open_calculator:${JSON.stringify(params || {})}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'open_calculator', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue open_calculator:', error);
      }
      return 'I\'ve opened the estimate wizard in the side panel. Answer a few questions to get a preliminary price range.';
    },

    show_about: async (params) => {
      console.log('🏢 Bridge Handler - show_about called:', params);
      try {
        const toolCallMessage = `TOOL_CALL:show_about:${JSON.stringify(params || {})}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'show_about', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue show_about:', error);
      }
      return 'Showing information about Cieden on screen.';
    },

    show_process: async (params) => {
      console.log('📋 Bridge Handler - show_process called:', params);
      try {
        const toolCallMessage = `TOOL_CALL:show_process:${JSON.stringify(params || {})}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'show_process', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue show_process:', error);
      }
      return 'Showing our process and timeline on screen.';
    },

    show_getting_started: async (params) => {
      console.log('🚀 Bridge Handler - show_getting_started called:', params);
      try {
        const toolCallMessage = `TOOL_CALL:show_getting_started:${JSON.stringify(params || {})}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'show_getting_started', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue show_getting_started:', error);
      }
      return 'Showing how to start a project with Cieden on screen.';
    },

    show_support: async (params) => {
      console.log('🛟 Bridge Handler - show_support called:', params);
      try {
        const toolCallMessage = `TOOL_CALL:show_support:${JSON.stringify(params || {})}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'show_support', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue show_support:', error);
      }
      return 'Showing post-delivery and support info on screen.';
    },

    show_project_brief: async (params) => {
      console.log('📝 Bridge Handler - show_project_brief called:', params);
      try {
        const toolCallMessage = `TOOL_CALL:show_project_brief:${JSON.stringify(params || {})}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'show_project_brief', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue show_project_brief:', error);
      }
      return 'Opening a structured project brief card on screen.';
    },

    show_next_steps: async (params) => {
      console.log('➡️ Bridge Handler - show_next_steps called:', params);
      try {
        const toolCallMessage = `TOOL_CALL:show_next_steps:${JSON.stringify(params || {})}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'show_next_steps', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue show_next_steps:', error);
      }
      return 'Showing next-step options (call, deck, or estimate) on screen.';
    },

    show_session_summary: async (params) => {
      console.log('📄 Bridge Handler - show_session_summary called:', params);
      try {
        const toolCallMessage = `TOOL_CALL:show_session_summary:${JSON.stringify(params || {})}`;
        queueToolMessageRef.current?.(toolCallMessage, {
          toolCall: true, toolName: 'show_session_summary', timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Failed to queue show_session_summary:', error);
      }
      return 'Summarizing this session on screen.';
    },
  };

  // Text messaging hook removed - now handled by UnifiedChatInput which is inside the provider context
  // const { sendTextMessage, isLoading: isTextLoading, error: textError } = useTextMessaging({
  //   conversationId,
  //   actionHandlers
  // });

  // CopilotKit action for showing balance visualization
  useCopilotAction({
    name: "showAccountBalance",
    description: "Display the user's current account balance with a beautiful visual representation. Use this when users ask about their balance, account status, or available funds.",
    parameters: [
      {
        name: "balance",
        type: "number",
        description: "Current account balance amount",
        required: true
      },
      {
        name: "previousBalance",
        type: "number",
        description: "Previous balance for comparison (optional)",
        required: false
      },
      {
        name: "currency",
        type: "string",
        description: "Currency code (e.g. USD, EUR). Defaults to USD.",
        required: false
      }
    ],
    handler: async ({ balance, previousBalance, currency = "USD" }) => {
      console.log('💰 Balance display requested:', { balance, previousBalance, currency });
      
      // Store tool execution in Convex with structured metadata
      if (conversationId) {
        await createMessage({
          conversationId,
          content: `Balance displayed: ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(balance)}`,
          role: 'assistant',
          source: 'contextual',
          metadata: {
            toolName: 'showAccountBalance',
            toolType: 'frontend_action',
            parameters: { balance, previousBalance, currency },
            executedAt: Date.now()
          }
        });
      }
      
      return `Displaying current balance: ${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(balance)}`;
    },
    render: ({ args, status }) => {
      if (status === "inProgress") {
        return <div className="p-4 rounded-lg bg-muted">Loading balance...</div>;
      }
      
      return (
        <div className="flex justify-center">
          <BalanceCard
            balance={args.balance}
            previousBalance={args.previousBalance}
            currency={args.currency || "USD"}
            compact={false}
          />
        </div>
      );
    }
  });


  useEffect(() => {
    // Create or get conversation - only when authenticated and conversations are loaded
    async function initConversation() {
      if (!isAuthenticated || conversations === undefined) return;

      if (conversations.length > 0) {
        setConversationId(conversations[0]._id);
      } else {
        try {
          const id = await createConversation({ title: "Voice Chat" });
          setConversationId(id);
        } catch (error) {
          console.warn('Failed to create conversation (auth may not be ready):', error);
        }
      }
    }
    initConversation();
  }, [isAuthenticated, conversations, createConversation]);

  // Handle messages from unified input
  const handleMessage = useCallback(async (text: string, source: 'voice' | 'text') => {
    setLastMessage({ text, source });
    console.log(`📝 Message received from ${source}:`, text);

    // When unauthenticated, text input is used only for onboarding;
    // actual onboarding logic is handled via onPreAuthMessage, so we do nothing here.
    if (!isAuthenticated) return;

    // Text messaging is now handled by UnifiedChatInput component which has access to the provider
    // The UnifiedChatInput's useTextInput hook internally uses the provider's text messaging
    if (source === 'text' && voiceStatus === 'idle') {
      console.log('📤 Text message will be handled by UnifiedChatInput component');
    }
    // Voice messages already handled by existing voice system
  }, [voiceStatus, isAuthenticated]);

  // Auto-scroll to bottom when new messages arrive - optimized to prevent unnecessary scrolls
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    if (isUserScrolling) return; // Don't auto-scroll if user is manually scrolling
    
    const element = messagesEndRef.current;
    if (!element) return;

    // Scroll instantly so new message appears above input, not under it
    requestAnimationFrame(() => {
      element.scrollIntoView({ 
        behavior: 'auto',
        block: 'end'
      });
    });
  }, [isUserScrolling]);

  // Detect user scrolling to prevent auto-scroll interference
  const handleScroll = useCallback(() => {
    setIsUserScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Reset user scrolling flag after 2 seconds of no scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 2000);
  }, []);

  // Scroll to bottom when conversation message count changes (excluding contextual updates)
  useEffect(() => {
    const conversationMessages = convexMessages?.filter(message => 
      !(message.role === 'system' && message.source === 'contextual')
    ) || [];
    const newMessageCount = conversationMessages.length;
    
    if (newMessageCount > messageCount && newMessageCount > 0) {
      setMessageCount(newMessageCount);
      
      // Use requestAnimationFrame for better performance
      const frameId = requestAnimationFrame(() => {
        scrollToBottom();
      });
      
      return () => cancelAnimationFrame(frameId);
    }
  }, [convexMessages, messageCount, scrollToBottom]);



  // Clear conversation history
  const handleClearHistory = useCallback(async () => {
    if (!conversationId || clearing) return;
    try {
      setClearing(true);
      const res = await clearHistory({ conversationId });
      console.log(`🧹 Cleared ${res?.deleted ?? 0} messages`);
      // Notify provider subtree to restart sessions fresh
      try {
        window.dispatchEvent(new CustomEvent('history-cleared'));
      } catch (_) {}
    } catch (e) {
      console.error('Failed to clear history', e);
    } finally {
      setClearing(false);
    }
  }, [conversationId, clearHistory, clearing]);
  
  // Extract mode from message content via shared util
  const getMessageMode = useCallback((content: string): 'default' | 'update' | 'overlay' => {
    return (parseToolCall(content)?.mode) || 'default';
  }, []);

  // Toggle between normal and go mode
  const toggleGoMode = useCallback(() => {
    updateSettings({ goMode: !settings.goMode });
  }, [settings.goMode, updateSettings]);

  const flushPendingQuizContexts = useCallback(() => {
    if (!sendContextualUpdate) return;
    while (pendingQuizContextsRef.current.length > 0) {
      const contextMessage = pendingQuizContextsRef.current.shift();
      if (!contextMessage) {
        continue;
      }
      try {
        sendContextualUpdate(contextMessage);
      } catch (error) {
        console.error('❌ Failed to send quiz context update:', error);
        pendingQuizContextsRef.current.unshift(contextMessage);
        break;
      }
    }
  }, [sendContextualUpdate]);

  useEffect(() => {
    flushPendingQuizContexts();
  }, [flushPendingQuizContexts]);

  // Hybrid callback that handles both tool calls to Convex and contextual updates to voice
  const handleUserAction = useCallback(async (text: string) => {
    if (text === 'CLOSE_QUIZ_MODAL') {
      // Handle quiz modal closure directly - let it bubble up to QuizMessage
      if (sendContextualUpdate) {
        sendContextualUpdate(text);
        // Also persist contextual update for traceability (hidden from UI rendering)
        if (conversationId) {
          try {
            await createMessage({
              conversationId,
              content: text,
              role: 'system',
              source: 'contextual'
            });
            console.log('🗂️ Saved contextual update to Convex (CLOSE_QUIZ_MODAL)');
          } catch (error) {
            console.error('❌ Failed to save contextual update message:', error);
          }
        }
      }
    } else if (text.startsWith('TOOL_CALL:') && conversationId) {
      // Tool calls should be saved to Convex as new messages
      console.log('💾 Saving tool call to Convex:', text);
      try {
        await createMessage({
          conversationId,
          content: text,
          role: 'assistant',
          source: 'contextual'
        });
        console.log('✅ Tool call message saved to Convex');
      } catch (error) {
        console.error('❌ Failed to save tool call message:', error);
      }
    } else if (text.startsWith('Selected "') && sendProgrammaticMessage) {
      // For user selections in quiz, send as a programmatic USER message so the agent replies
      // Format: "I selected [Option] for [Question]"
      const userMessage = `I selected: ${text.replace('Selected ', '')}`;
      console.log('🗣️ Sending programmatic user message for selection:', userMessage);
      
      // Send to voice agent (which will also save to Convex via its normal flow)
      await sendProgrammaticMessage(userMessage);
      
      // Also send contextual update for system tracking if needed, but the user message is primary
      if (sendContextualUpdate) {
        sendContextualUpdate(text);
      }
    } else if (sendContextualUpdate) {
      // Regular contextual updates go to voice system
      sendContextualUpdate(text);
      // Also persist contextual update for traceability (hidden from UI rendering)
      if (conversationId) {
        try {
          await createMessage({
            conversationId,
            content: text,
            role: 'system',
            source: 'contextual'
          });
          console.log('🗂️ Saved contextual update to Convex');
        } catch (error) {
          console.error('❌ Failed to save contextual update message:', error);
        }
      }
    }
  }, [conversationId, createMessage, sendContextualUpdate, sendProgrammaticMessage]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  // We no longer use a separate full-screen onboarding page.
  // Instead, inline onboarding chat is rendered inside the main layout below.

  // Helper component to get queueToolMessage from context and populate ref
  function ContextBridge() {
    const { queueToolMessage } = useElevenLabsConversation();
    useEffect(() => {
      queueToolMessageRef.current = queueToolMessage;
    }, [queueToolMessage]);
    return null;
  }

  return (
    <>
      <ElevenLabsProvider
        actionHandlers={actionHandlers}
        conversationId={conversationId}
      >
        <ContextBridge />
        <QuizProvider conversationId={conversationId}>
        <SessionResetter />
        <div 
          className={`${isMobile ? 'h-full' : 'min-h-screen'} relative page-fade-in-animation`}
        >
        {/* Background layer - Lumina-style gradients */}
        <LuminaGradientBackground />
        
        {/* Main content layer — pt-24 so content sits below fixed Chatbot-style header */}
        <div className={`relative z-10 h-full ${isMobile ? 'grid grid-rows-[auto,1fr,auto] min-h-0' : 'flex flex-col pt-24'}`}>
          {/* Header with full menu actions (fixed on desktop, Chatbot-style) */}
          <VoiceChatHeader
            className={isMobile ? 'relative' : undefined}
            onSettingsOpen={() => setShowSettings(true)}
            onClearHistory={handleClearHistory}
            onSignOut={async () => {
              await signOut();
              // After sign-out, keep user inside main experience (onboarding will handle identity).
              router.push('/voice-chat');
            }}
            clearing={clearing}
          />
          
          {/* Chat lane wrapper: groups messages + input so input can be absolute to this lane */}
            <motion.div
            className={cn('relative flex flex-col')}
            animate={{
              marginRight: isMobile
                ? 0
                : (activePanelDomain || showEstimatePanel || showAboutPanel
                    ? "50%"
                    : showSettings
                    ? 360
                    : 0),
            }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <main className={cn(
                `${isMobile ? 'min-h-0 overflow-hidden' : 'flex-1'} flex flex-col`,
                !isMobile && 'pb-[72px]'
              )}>
              {/* Messages Display — scroll area ends above fixed input so new messages stay visible */}
              <div 
                className={"flex-1 p-4 lg:p-6 xl:p-8 overflow-y-auto overflow-x-hidden scrollbar-chat min-h-0"}
                onScroll={handleScroll}
                style={{
                  contain: 'layout style paint',
                  willChange: 'scroll-position',
                  // Контролюємо відступ через внутрішній spacer, тут залишаємо 0
                  paddingBottom: 0
                }}
              >
              {(!isAuthenticated) ? (
                <ChatWindow
                  messages={onboardingMessages}
                  userName={onboardingName || currentUser?.name || currentUser?.email || "there"}
                  isLoading={onboardingStep === "creating"}
                  messagesEndRef={messagesEndRef}
                />
              ) : ((convexMessages && convexMessages.length > 0) || (voiceStatus !== 'idle')) ? (
                <div className="space-y-4 lg:space-y-6 max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full">
                  {/* Quick prompts – тепер завжди видно над історією, а не лише до першого повідомлення */}
                  {quickPrompts.length > 0 && (
                    <div className="mb-4">
                      <div className="text-center mb-3">
                        <h2 className="text-lg font-semibold text-white">Welcome — your Cieden assistant is here 👋</h2>
                        <p className="text-white/70 text-sm">Tell me about your project or pick one of the questions below.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
                        {quickPrompts.map((prompt, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={async () => {
                              const value = (prompt as any).valueUk || prompt.valueEn;
                              if (sendProgrammaticMessage) await sendProgrammaticMessage(value);
                            }}
                            className="p-4 bg-white/5 rounded-lg text-left hover:bg-white/10 transition-colors border border-white/10"
                          >
                            <h3 className="font-medium text-white mb-1">{prompt.title}</h3>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {convexMessages
                    .filter(message => {
                      if (message.role === 'system' && message.source === 'contextual') return false;
                      if (message.role === 'user' && message.content.startsWith('I selected:')) return false;
                      const mode = getMessageMode(message.content);
                      if (mode === 'update') return false;
                      return true;
                    })
                    .map((message) => {
                      const isToolCall = message.content.startsWith('TOOL_CALL:');
                      if (isToolCall) {
                        return (
                          <MessageCard
                            key={message._id}
                            message={message}
                            onUserAction={handleUserAction}
                            compact={isMobile}
                          />
                        );
                      }
                      const botMsg: ChatbotMessage = {
                        id: message._id,
                        role: message.role as 'user' | 'assistant',
                        content: message.content,
                        timestamp: (message as { _creationTime?: number })._creationTime ?? Date.now(),
                      };
                      return (
                        <ChatMessage
                          key={message._id}
                          message={botMsg}
                          onQuickPrompt={(text) => sendProgrammaticMessage?.(text)}
                          userName="You"
                        />
                      );
                    })}
                  {/* Spacer під останнім повідомленням, приблизно як висота інпуту */}
                  <div ref={messagesEndRef} className="h-20" />
                </div>
              ) : (
                <ChatWindow
                  messages={[]}
                  userName={currentUser?.name || currentUser?.email || "there"}
                  quickPrompts={quickPrompts}
                  onQuickPrompt={async (value) => {
                    if (sendProgrammaticMessage) await sendProgrammaticMessage(value);
                  }}
                  messagesEndRef={messagesEndRef}
                />
              )}
              </div>
            </main>
            
            {/* Unified Chat Input */}
              {isMobile ? (
            <footer className="flex-shrink-0 p-2 pb-1 bg-transparent pointer-events-none" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 8px), 24px)' }}>
              <UnifiedChatInput
                className="pointer-events-auto"
                conversationId={conversationId}
                onMessage={handleMessage}
                onStatusChange={setVoiceStatus}
                onContextualUpdate={(sendUpdate) => setSendContextualUpdate(() => sendUpdate)}
                onProgrammaticSendReady={(sendFn) => setSendProgrammaticMessage(() => sendFn)}
                actionHandlers={actionHandlers}
                showSettings={showSettings}
                onPreAuthMessage={!isAuthenticated ? handlePreAuthMessage : undefined}
                onRequestSelect={async (request) => {
                  console.log('🎯 Quick action selected:', request);
                  if (sendProgrammaticMessage) {
                    await sendProgrammaticMessage(request);
                  }
                }}
                isMobile={true}
                settings={settings}
                updateSettings={updateSettings}
                onVoiceAudioUpdate={(isUserSpeaking, userLevel, agentLevel) => {
                  setIsUserSpeaking(isUserSpeaking);
                  setUserAudioLevel(userLevel);
                  setAgentAudioLevel(agentLevel);
                }}
              />
            </footer>
          ) : (
            <UnifiedChatInput
              conversationId={conversationId}
              onMessage={handleMessage}
              onStatusChange={setVoiceStatus}
              onContextualUpdate={(sendUpdate) => setSendContextualUpdate(() => sendUpdate)}
              onProgrammaticSendReady={(sendFn) => setSendProgrammaticMessage(() => sendFn)}
              onPreAuthMessage={!isAuthenticated ? handlePreAuthMessage : undefined}
              actionHandlers={actionHandlers}
              showSettings={showSettings}
              alignLeft={!!activePanelDomain || !!showEstimatePanel || !!showAboutPanel}
              onRequestSelect={async (request) => {
                console.log('🎯 Quick action selected:', request);
                if (sendProgrammaticMessage) {
                  await sendProgrammaticMessage(request);
                }
              }}
              settings={settings}
              updateSettings={updateSettings}
              onVoiceAudioUpdate={(isUserSpeaking, userLevel, agentLevel) => {
                setIsUserSpeaking(isUserSpeaking);
                setUserAudioLevel(userLevel);
                setAgentAudioLevel(agentLevel);
              }}
            />
          )}
          </motion.div>
          
          {/* Settings Panel Overlay / Sidebar */}
          {showSettings && (
            <SettingsPanel
              isDesktop={!isMobile}
              settings={settings}
              onUpdateSettings={updateSettings}
              onClose={() => setShowSettings(false)}
              onToggleGoMode={toggleGoMode}
            />
          )}

          {/* Speaking HUD - Waveform indicators (client-only to avoid early fallback) */}
          {mounted && (
            <SpeakingHUD
              voiceStatus={voiceStatus}
              isUserSpeaking={isUserSpeaking}
              isAgentSpeaking={isAgentSpeaking}
              userAudioLevel={userAudioLevel}
              agentAudioLevel={agentAudioLevel}
              settings={settings}
              anchorId="unified-chat-input-root"
            />
          )}

          {/* Cases side panel */}
          <AnimatePresence>
            {activePanelDomain && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeCasesPanel}
                  className="fixed inset-0 bg-black/40 z-40 sm:hidden"
                />
                <CaseStudyPanel
                  domain={activePanelDomain}
                  initialCaseId={initialPanelCaseId}
                  onClose={closeCasesPanel}
                />
              </>
            )}
          </AnimatePresence>

          {/* Estimate wizard side panel */}
          <AnimatePresence>
            {showEstimatePanel && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowEstimatePanel(false)}
                  className="fixed inset-0 z-40 bg-black/40 sm:hidden"
                />
                <EstimateWizardPanel onClose={() => setShowEstimatePanel(false)} />
              </>
            )}
          </AnimatePresence>

          {/* About Cieden side panel */}
          <AnimatePresence>
            {showAboutPanel && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAboutPanel(false)}
                  className="fixed inset-0 z-40 bg-black/40 sm:hidden"
                />
                <AboutPanel onClose={() => setShowAboutPanel(false)} />
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      </QuizProvider>
      </ElevenLabsProvider>
    </>
  );
}
