"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useState, useEffect } from "react";
import {
  ExternalLink,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  X,
  Clock,
  Handshake,
  Users,
  Compass,
  Workflow,
  LayoutTemplate,
  LifeBuoy,
  FolderOpen,
  Cpu,
  Building2,
  HeartPulse,
  ShoppingBag,
  GraduationCap,
  CreditCard,
  Truck,
  BriefcaseBusiness,
  Clapperboard,
  Globe2,
} from "lucide-react";
import { motion } from "framer-motion";

export type CaseId = string;

export interface CaseSummary {
  id: CaseId;
  title: string;
  domain: string[];
  description: string;
  url: string;
  highlight?: string;
  image?: string;
}

export const CASES: CaseSummary[] = [
  { id: "revvedup", title: "RevvedUp: redesigning an ABM software MVP for scale", domain: ["Martech & Sales"], description: "Transforming a code-first account-based marketing software MVP into an AI-driven sales platform used by revenue teams to run personalized, multi-channel campaigns.", url: "https://cieden.com/redesigning-account-based-marketing-software", image: "https://cieden.com/cieden/images/article/listmainimg-3.png" },
  { id: "voice-ui-banking", title: "Voice user interface design for AI-native banking", domain: ["AI", "Fintech"], description: "Combined Generative UI with voice user interface design to let users switch seamlessly between speaking and typing, reducing the cognitive load of borrowing money.", url: "https://cieden.com/voice-user-interface-design", highlight: "AI + Voice UI", image: "https://cieden.com/cieden/images/article/listmainimg-4.png" },
  { id: "support-ticket", title: "Redesigning support ticket UI & UX in Slack", domain: ["Professional Services"], description: "Rebuilt the ticketing experience with a modular kanban board and customizable reports, so internal support teams can move faster without changing how they work.", url: "https://cieden.com/redesigning-a-support-ticket-ui", image: "https://cieden.com/cieden/images/article/support-ticket-system-uiux-design.png" },
  { id: "ai-agent-logistics", title: "AI agent UI design for logistics automation", domain: ["Logistics", "AI"], description: "Reimagined logistics automation through a conversational interface, turning technical processes into intuitive interactions that anyone can control.", url: "https://cieden.com/ai-agent-ui-design", highlight: "AI Agent Design", image: "https://cieden.com/cieden/images/article/2025-11-20_17-44-17-tandemai-1.png" },
  { id: "wealth-management", title: "Wealth management UX with AI prototyping", domain: ["Fintech", "AI"], description: "Used AI-driven prototyping to validate business logic and speed up delivery for a multi-role wealth-management platform, turning high-stakes decisions into testable steps before release.", url: "https://cieden.com/wealth-management-ux-design", highlight: "+35% product adoption", image: "https://cieden.com/cieden/images/article/listmainimg-1.png" },
  { id: "payroll", title: "Payroll management system design", domain: ["Fintech"], description: "Redesigned the payroll experience to prioritize usability with a modular UI library, accelerating development cycles and allowing HR teams to manage salary adjustments with zero friction.", url: "https://cieden.com/payroll-management-system-design", image: "https://cieden.com/cieden/images/article/group-75-1-1.png" },
  { id: "inventory-management", title: "Inventory management UI for faster verification", domain: ["Logistics", "AI"], description: "Redesigned Vimaan's inventory verification UI into an image-driven workflow that helps warehouse teams resolve discrepancies faster and with far less cognitive load.", url: "https://cieden.com/inventory-management-ui", image: "https://cieden.com/cieden/images/article/2025-11-20_17-51-09-listmainimg.png" },
  { id: "sitenna", title: "Sitenna: telecom site acquisition platform", domain: ["B2B SaaS"], description: "Developed a powerful visual identity and created a stunning product and marketing website design for a telecom site acquisition & management platform.", url: "https://cieden.com/telecom-design-sitenna", highlight: "$5.1M raised post-redesign", image: "https://cieden.com/cieden/images/article/2023-08-01_11-17-11-listmainimg.png" },
  { id: "ai-email", title: "AI email assistant for actionable workflows", domain: ["AI", "Martech & Sales"], description: "An AI email assistant that saves hours each week by surfacing critical emails and pushing tasks straight into project tools.", url: "https://cieden.com/ai-email-assistant", image: "https://cieden.com/cieden/images/article/2025-09-10_11-25-59-listmainimg.png" },
  { id: "ai-data-bookstore", title: "AI data management for bookstore operations", domain: ["E-commerce", "AI"], description: "Automated data entry, unified messy records, and built AI-driven dashboards, helping online bookstores manage catalogs and analytics without the manual grind.", url: "https://cieden.com/ai-data-management-tool", image: "https://cieden.com/cieden/images/article/2025-09-04_17-33-44-listmainimg.png" },
  { id: "ai-meeting", title: "AI meeting management with 6 smart features", domain: ["AI", "Professional Services"], description: "Smoothed out online meetings with AI features that cut noise and generate structured notes, so teams can focus less on admin and more on actual work.", url: "https://cieden.com/ai-meeting-management-tool", image: "https://cieden.com/cieden/images/article/2025-09-10_18-54-48-listmainimg.png" },
  { id: "b2b-fintech-dashboards", title: "Centralized dashboards in B2B fintech app", domain: ["Fintech", "Professional Services"], description: "Built a role-based platform that helps finance, sales, and product teams make smarter pricing decisions — no manual work, no gatekeepers.", url: "https://cieden.com/b2b-fintech-app-design", image: "https://cieden.com/cieden/images/article/2025-07-25_15-21-52-listmainimg.png" },
  { id: "optahaul", title: "OptaHaul: dairy logistics dashboards", domain: ["Logistics"], description: "Designed purpose-built dashboards that let logistics managers and finance leads track performance, simulate routes, and hold hauliers accountable.", url: "https://cieden.com/optahaul", image: "https://cieden.com/cieden/images/article/2025-05-01_13-43-55-listmainimg.png" },
  { id: "wellness-platform", title: "Wellness platform: 75% faster onboarding", domain: ["Digital Health"], description: "Redesigned a mobile-first wellness platform with personalized flows, multi-role UX, automated refunds, and a modular admin system.", url: "https://cieden.com/wellness-platform", highlight: "+75% faster onboarding, +25% ARPU", image: "https://cieden.com/cieden/images/article/2025-04-15_12-53-06-listmainimg.png" },
  { id: "lykon", title: "LYKON: smarter health app design", domain: ["Digital Health"], description: "Turned a data-heavy health app into a user-friendly experience with flexible nutrition plans, clearer reports, and smoother onboarding.", url: "https://cieden.com/lykon", highlight: "+135% NPS growth", image: "https://cieden.com/cieden/images/article/2025-03-20_12-57-39-listmainimg.png" },
  { id: "sidekick", title: "Sidekick: fast-track design for massage app", domain: ["Digital Health"], description: "Designed an intuitive app that athletes can easily navigate during training. Created a scalable, modular framework ensuring the app can grow and adapt.", url: "https://cieden.com/sidekick-fast-track-design-for-massage-app", image: "https://cieden.com/cieden/images/article/2024-06-05_19-16-43-listmainimg.png" },
  { id: "healthcare-data-mvp", title: "MVP for united healthcare data application", domain: ["Digital Health"], description: "Clickable prototypes in Figma that convincingly explicate the competitive advantages of a product to investors, fully applicable for further development.", url: "https://cieden.com/case-mvp-for-united-healthcare-data-application", image: "https://cieden.com/cieden/images/article/2023-05-25_16-10-38-listmainimg.png" },
  { id: "telehealth", title: "Telehealth platform", domain: ["Digital Health"], description: "Clickable wireframes and several UI concepts to be presented to investors for a telehealth solution.", url: "https://cieden.com/telehealth-platform", image: "https://cieden.com/cieden/images/article/telehealth00ban.png" },
  { id: "momenta", title: "Momenta: relaxing design for a meditation app", domain: ["Digital Health"], description: "Created a solution that harmoniously combined the initial requirements; came up with smooth and relaxing animations for a calming user experience.", url: "https://cieden.com/meditation-app", image: "https://cieden.com/cieden/images/article/2023-08-03_15-29-22-listmainimg.png" },
  { id: "lie-detector", title: "Desktop lie detector software", domain: ["AI"], description: "Transformed a complex suite of separate desktop apps into a single, intuitive solution for human behavior analysis across on-site screenings and video recordings.", url: "https://cieden.com/desktop-lie-detector-software", image: "https://cieden.com/cieden/images/article/2023-06-27_18-07-06-listmainimg.png" },
  { id: "food-delivery", title: "Food delivery e-commerce platform", domain: ["E-commerce"], description: "UX research report on a Miro board; usability testing with a clickable prototype for a food delivery platform.", url: "https://cieden.com/article-food-delivery-ecommerce-platform", image: "https://cieden.com/cieden/images/article/delivery.png" },
  { id: "fiksuruoka", title: "Sustainable food consumption platform", domain: ["E-commerce"], description: "Improved e-commerce user experience and reduced the average time spent before checkout for a sustainable food marketplace.", url: "https://cieden.com/fiksuruoka", image: "https://cieden.com/cieden/images/article/group-8.png" },
  { id: "grocery-delivery", title: "Grocery delivery app", domain: ["E-commerce"], description: "Created a better experience for customers shopping in multiple retail chains from scratch.", url: "https://cieden.com/grocery-delivery-app", image: "https://cieden.com/cieden/images/all/group-10-1-1-1.png" },
  { id: "medentry", title: "MedEntry: improving UX of an educational platform", domain: ["Edtech", "Digital Health"], description: "Refreshed branding, improved and simplified the product UX, created a web platform and a responsive mobile app.", url: "https://cieden.com/e-learning-platform-design", image: "https://cieden.com/cieden/images/article/2023-08-07_15-49-31-listmainimg.png" },
  { id: "elearning-progressionist", title: "Designing a progressionist e-learning platform", domain: ["Edtech"], description: "Delivered appealing UX design that corresponds to the request and meets user needs; developed a comprehensive style guide.", url: "https://cieden.com/elearning-platform", image: "https://cieden.com/cieden/images/article/2023-08-09_19-37-51-listmainimg.png" },
  { id: "language-learning", title: "Language learning platform", domain: ["Edtech", "Media"], description: "The design has been implemented into a functional product. Active users complimented on the improved look, feel, and new functionality.", url: "https://cieden.com/language-learning-platform", image: "https://cieden.com/cieden/images/all/languageblog.png" },
  { id: "usernurture", title: "Interactive training tool", domain: ["Edtech", "Media"], description: "Designed an interactive training tool currently in development, combining learning and engagement in a modern interface.", url: "https://cieden.com/usernurture", image: "https://cieden.com/cieden/images/all/un_hero_img-min-1.png" },
  { id: "exceeders", title: "IT solutions marketplace", domain: ["HR Tech"], description: "The fully functional application launched for multiple personas and flows in an IT solutions marketplace.", url: "https://cieden.com/exceeders-marketplace", image: "https://cieden.com/cieden/images/all/exceeders_hero_banner_img-1.png" },
  { id: "recruitment-marketplace", title: "Recruitment marketplace", domain: ["HR Tech"], description: "Turned an idea into a functional product through design, marketing, and product management for a B2B recruitment platform.", url: "https://cieden.com/b2b-recruitment-platform", image: "https://cieden.com/cieden/images/all/b2b09.png" },
  { id: "fleximenu", title: "Multi-brand loyalty and management systems", domain: ["Lifestyle & Sport"], description: "Fully functional application for FlexyMenu; the rest of the products are in the phase of development for multi-brand loyalty systems.", url: "https://cieden.com/multi-brand-loyalty-and-management-systems", image: "https://cieden.com/cieden/images/article/flexyboxcov.png" },
  { id: "grocery-rewards", title: "Grocery rewards", domain: ["Lifestyle & Sport"], description: "A Miro board incorporating findings from the discovery phase, and a clickable prototype of a final grocery rewards product.", url: "https://cieden.com/grocery-rewards", image: "https://cieden.com/cieden/images/article/growshr.png" },
  { id: "fitness-app", title: "Fitness app", domain: ["Lifestyle & Sport"], description: "Designed a mobile & web application to improve user engagement via gamification for a fitness platform.", url: "https://cieden.com/fitness-app", image: "https://cieden.com/cieden/images/article/tma.png" },
  { id: "property-investment", title: "Revamped UX for sustainable property investment", domain: ["Real Estate"], description: "Revamped the app's design and usability, provided branding assistance, and developed an adaptive mobile app for a property investment project.", url: "https://cieden.com/article-revamped-ux-design-for-a-sustainable-property-investment-project", image: "https://cieden.com/cieden/images/article/2023-10-03_13-17-42-listmainimg.png" },
  { id: "real-estate-wizard", title: "Real estate Wizard wireframes", domain: ["Real Estate"], description: "Product in back-end implementation and design in UI stage for a real estate wireframing wizard.", url: "https://cieden.com/real-estate-wizard-wireframes", image: "https://cieden.com/cieden/images/article/wizimgoo.png" },
  { id: "smart-home", title: "Smart home monitoring system", domain: ["Real Estate"], description: "Created a better experience for landlords and tenants on any scale with a smart home monitoring solution.", url: "https://cieden.com/smart-home-system", image: "https://cieden.com/cieden/images/all/group-62-1-1536x1075.png" },
  { id: "video-conference", title: "Merging UX/UI of three video conference platforms", domain: ["Media"], description: "Designed a prototype, optimized user flows and improved UX/UI of existing tools, introduced new features, and developed a highly adaptable design system.", url: "https://cieden.com/solutions-merging-three-video-conference-platforms-into-one", image: "https://cieden.com/cieden/images/article/2023-07-17_18-41-17-listmainimg.png" },
  { id: "open-iq", title: "Open IQ: redesigning call center software in the cloud", domain: ["Media"], description: "Modernized, scalable UX/UI design, reduced development time and costs, simplified onboarding, and highly customizable dashboard design.", url: "https://cieden.com/article-open-iq-redesigning-a-leading-call-center-software-in-the-cloud", image: "https://cieden.com/cieden/images/article/listmainimga.png" },
  { id: "flybox", title: "Flybox: communication platform", domain: ["Media"], description: "Operable MVP including full product design, design system, and product documentation for a communication platform.", url: "https://cieden.com/flybox", image: "https://cieden.com/cieden/images/article/flybox03-1.png" },
  { id: "podcast-app", title: "Audio social media app", domain: ["Media"], description: "Designed an audio social media app almost from scratch, creating an engaging experience for podcast listeners and creators.", url: "https://cieden.com/podcast-app", image: "https://cieden.com/cieden/images/article/audo.png" },
  { id: "construction-marketplace", title: "Construction marketplace", domain: ["Other"], description: "Discovery phase activities in Miro, clickable wireframes and UI concepts to be presented to investors for a construction marketplace.", url: "https://cieden.com/construction-marketplace", image: "https://cieden.com/cieden/images/article/2022-03-21_17-12-55-cm.png" },
  { id: "photo-frame", title: "Touch-screen photo frame", domain: ["Other"], description: "Created Calendar interface for a hardware solution meeting the needs of all age groups. Created an appealing design for a mobile app.", url: "https://cieden.com/touch-screen-photo-frame", image: "https://cieden.com/cieden/images/all/group-14-1-1-1536x1075.png" },
  { id: "ecological-platform", title: "Ecological maintenance platform", domain: ["Other"], description: "The design implemented in the functional product after two months of work for an ecological maintenance platform.", url: "https://cieden.com/ecological-platform", image: "https://cieden.com/cieden/images/all/group-61-1-1536x1075.png" },
];

const DOMAIN_COLORS: Record<string, string> = {
  "AI": "text-violet-300 border-violet-400/30 bg-violet-500/10",
  "Fintech": "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
  "Logistics": "text-amber-300 border-amber-400/30 bg-amber-500/10",
  "Digital Health": "text-cyan-300 border-cyan-400/30 bg-cyan-500/10",
  "E-commerce": "text-pink-300 border-pink-400/30 bg-pink-500/10",
  "B2B SaaS": "text-blue-300 border-blue-400/30 bg-blue-500/10",
  "Martech & Sales": "text-orange-300 border-orange-400/30 bg-orange-500/10",
  "Professional Services": "text-slate-300 border-slate-400/30 bg-slate-500/10",
  "Edtech": "text-indigo-300 border-indigo-400/30 bg-indigo-500/10",
  "HR Tech": "text-rose-300 border-rose-400/30 bg-rose-500/10",
  "Lifestyle & Sport": "text-lime-300 border-lime-400/30 bg-lime-500/10",
  "Real Estate": "text-teal-300 border-teal-400/30 bg-teal-500/10",
  "Media": "text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10",
  "Other": "text-zinc-300 border-zinc-400/30 bg-zinc-500/10",
};

/** Uniform purple background for all case card screenshot areas (like main app background) */
const CASE_CARD_BG =
  "bg-gradient-to-br from-violet-950/98 via-purple-900/95 to-violet-950/98";

const DOMAIN_GRADIENTS: Record<string, string> = {
  "AI": "from-violet-500/30 via-purple-600/20 to-transparent",
  "Fintech": "from-emerald-500/30 via-teal-600/20 to-transparent",
  "Logistics": "from-amber-500/30 via-orange-600/20 to-transparent",
  "Digital Health": "from-cyan-500/30 via-blue-600/20 to-transparent",
  "E-commerce": "from-pink-500/30 via-rose-600/20 to-transparent",
  "B2B SaaS": "from-blue-500/30 via-indigo-600/20 to-transparent",
  "Martech & Sales": "from-orange-500/30 via-red-600/20 to-transparent",
  "Professional Services": "from-slate-400/30 via-gray-600/20 to-transparent",
  "Edtech": "from-indigo-500/30 via-violet-600/20 to-transparent",
  "HR Tech": "from-rose-500/30 via-pink-600/20 to-transparent",
  "Lifestyle & Sport": "from-lime-500/30 via-green-600/20 to-transparent",
  "Real Estate": "from-teal-500/30 via-emerald-600/20 to-transparent",
  "Media": "from-fuchsia-500/30 via-purple-600/20 to-transparent",
  "Other": "from-zinc-400/30 via-gray-600/20 to-transparent",
};

const DOMAIN_DOT_COLORS: Record<string, string> = {
  "AI": "bg-violet-400",
  "Fintech": "bg-emerald-400",
  "Logistics": "bg-amber-400",
  "Digital Health": "bg-cyan-400",
  "E-commerce": "bg-pink-400",
  "B2B SaaS": "bg-blue-400",
  "Martech & Sales": "bg-orange-400",
  "Professional Services": "bg-slate-400",
  "Edtech": "bg-indigo-400",
  "HR Tech": "bg-rose-400",
  "Lifestyle & Sport": "bg-lime-400",
  "Real Estate": "bg-teal-400",
  "Media": "bg-fuchsia-400",
  "Other": "bg-zinc-400",
};

function DomainBadge({ domain }: { domain: string }) {
  const color = DOMAIN_COLORS[domain] || "text-slate-300 border-slate-400/30 bg-slate-500/10";
  return (
    <span className={`inline-block text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${color}`}>
      {domain}
    </span>
  );
}

/* ── Category Selector ── */

function CategorySelector() {
  const domainEntries = Array.from(new Set(CASES.flatMap((c) => c.domain)))
    .sort()
    .map((name) => ({
      name,
      count: CASES.filter((c) => c.domain.includes(name)).length,
    }));

  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  const iconForDomain = (name: string) => {
    switch (name) {
      case "AI":
        return Cpu;
      case "B2B SaaS":
        return Building2;
      case "Digital Health":
        return HeartPulse;
      case "E-commerce":
        return ShoppingBag;
      case "Edtech":
        return GraduationCap;
      case "Fintech":
        return CreditCard;
      case "Logistics":
        return Truck;
      case "Professional Services":
        return BriefcaseBusiness;
      case "Media":
        return Clapperboard;
      default:
        return Globe2;
    }
  };

  const handleSelect = (domain: string) => {
    setActiveDomain(domain);
    window.dispatchEvent(
      new CustomEvent("open-cases-panel", { detail: { domain } })
    );
  };

  return (
    <Card className="bg-transparent backdrop-blur-xl border-white/[0.08] font-[Gilroy]">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="text-center space-y-1">
          <h3 className="text-lg sm:text-xl font-semibold text-white/90">Browse case studies by focus area</h3>
          <p className="text-sm text-white/45">
            Select a category to open matching Cieden case studies in the side panel
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {domainEntries.map(({ name, count }) => {
            const Icon = iconForDomain(name);
            const isActive = activeDomain === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => handleSelect(name)}
                className={`group relative overflow-hidden rounded-xl border backdrop-blur-md px-4 py-3.5 text-left ring-1 ring-inset cursor-pointer transition-all duration-300 ${
                  isActive
                    ? "border-violet-300/80 bg-white/[0.10] ring-violet-400/60 shadow-[0_10px_24px_rgba(76,81,191,0.4)]"
                    : "border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.2] hover:shadow-md hover:shadow-white/[0.03] ring-white/[0.04]"
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${
                    DOMAIN_GRADIENTS[name] || "from-zinc-400/20 to-transparent"
                  } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />
                <div className="relative flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 text-white/85">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/6 text-white/55 group-hover:bg-white/12 group-hover:text-white/80 transition-colors">
                      <ChevronRight className="h-3 w-3" aria-hidden />
                    </span>
                  </div>
                  <span className="text-[16px] font-semibold text-white/85 group-hover:text-white transition-colors">
                    {name}
                  </span>
                  <div className="mt-1 flex items-center justify-start text-[13px] text-white/45 group-hover:text-white/65 transition-colors">
                    <div className="inline-flex items-center gap-1.5">
                      <FolderOpen className="h-3.5 w-3.5" aria-hidden />
                      <span>
                        {count} {count === 1 ? "case" : "cases"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center pt-1">
          <a
            href="https://cieden.com/discover-our-work"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            See all {CASES.length} cases on cieden.com <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Cases Grid (category selector only — cases open in side panel) ── */

interface CasesGridProps {
  onSelectCase?: (id: string) => void;
}

export function CasesGrid({ onSelectCase }: CasesGridProps) {
  return <CategorySelector />;
}

/* ── Cases Side Panel (slides in from the right, shows list → detail) ── */

interface CaseStudyPanelProps {
  domain: string;
  initialCaseId?: string | null;
  onClose: () => void;
}

export function CaseStudyPanel({ domain, initialCaseId, onClose }: CaseStudyPanelProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedCaseId) setSelectedCaseId(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, selectedCaseId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const caseId = (e as CustomEvent).detail?.caseId;
      if (caseId) setSelectedCaseId(caseId);
    };
    window.addEventListener("open-case-study", handler);
    return () => window.removeEventListener("open-case-study", handler);
  }, []);

  // When opened from a case card in chat, show that case immediately
  useEffect(() => {
    if (initialCaseId) setSelectedCaseId(initialCaseId);
  }, [initialCaseId]);

  // Reset selection when domain changes (and we didn't open with a specific case)
  useEffect(() => {
    if (!initialCaseId) setSelectedCaseId(null);
  }, [domain, initialCaseId]);

  const filtered = CASES.filter((c) => c.domain.includes(domain));
  const selectedCase = selectedCaseId ? CASES.find((c) => c.id === selectedCaseId) : null;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className={`fixed right-0 top-0 h-full w-full sm:w-1/2 border-l border-white/[0.12] z-50 flex flex-col ring-1 ring-inset ring-white/[0.05] ${
        selectedCase ? "bg-white backdrop-blur-none" : "bg-[#0a0a0f]/80 backdrop-blur-2xl"
      }`}
    >
      {/* Header bar */}
      <div className={`flex items-center justify-between px-5 py-2.5 border-b shrink-0 ${
        selectedCase ? "bg-[#0a0a0f] border-white/[0.06]" : "border-white/[0.06]"
      }`}>
        <div className="flex items-center gap-2">
          {selectedCase ? (
            <button
              onClick={() => setSelectedCaseId(null)}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to list
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${DOMAIN_DOT_COLORS[domain] || "bg-zinc-400"}`} />
              <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
                {domain}
              </span>
              <span className="text-[10px] text-white/30">({filtered.length})</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedCase && (
            <a
              href={selectedCase.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
            >
              Open on site <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className={`flex-1 min-h-0 ${selectedCase ? "flex flex-col" : "overflow-y-auto overflow-x-hidden scrollbar-chat"}`}>
        {selectedCase ? (
          <CaseDetailView caseData={selectedCase} />
        ) : (
          <CaseListView cases={filtered} onSelect={setSelectedCaseId} />
        )}
      </div>
    </motion.div>
  );
}

/* ── Case List View (inside side panel) ── */

function CaseListView({ cases, onSelect }: { cases: CaseSummary[]; onSelect: (id: string) => void }) {
  return (
    <div className="p-4 space-y-3">
      {cases.map((item) => (
        <SidePanelCaseCard key={item.id} item={item} onSelect={() => onSelect(item.id)} />
      ))}
      <div className="text-center pt-2 pb-4">
        <a
          href="https://cieden.com/discover-our-work"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          See all on cieden.com <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

function SidePanelCaseCard({ item, onSelect }: { item: CaseSummary; onSelect: () => void }) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group text-left w-full rounded-xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] hover:border-white/[0.2] transition-all duration-200 overflow-hidden ring-1 ring-inset ring-white/[0.04] cursor-pointer"
    >
      <div className={`relative min-h-[280px] h-[320px] sm:h-[360px] md:h-[400px] ${CASE_CARD_BG} overflow-hidden`}>
        {item.image && !imgError && (
          <img
            src={item.image}
            alt=""
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-2 left-2.5 flex flex-wrap gap-1">
          {item.domain.map((d) => <DomainBadge key={d} domain={d} />)}
        </div>
      </div>
      <div className="p-3 space-y-1">
        <h4 className="text-sm font-semibold text-white/90 group-hover:text-white leading-snug transition-colors line-clamp-2">
          {item.title}
        </h4>
        {item.highlight && (
          <p className="text-[11px] font-semibold text-emerald-400">{item.highlight}</p>
        )}
        <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{item.description}</p>
        <span className="flex items-center gap-1 text-[11px] text-white/25 group-hover:text-white/50 transition-colors">
          View details <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}

/* ── Case Detail View (iframe with full page, fallback to summary) ── */

function CaseDetailView({ caseData }: { caseData: CaseSummary }) {
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const proxyUrl = `/api/proxy-case?url=${encodeURIComponent(caseData.url)}`;

  if (iframeError) {
    return <CaseDetailFallback caseData={caseData} />;
  }

  return (
    <div className="flex flex-col h-full">
      {iframeLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-white/40">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            <span className="text-sm">Loading case study...</span>
          </div>
        </div>
      )}
      <iframe
        src={proxyUrl}
        title={caseData.title}
        onLoad={() => setIframeLoading(false)}
        onError={() => { setIframeError(true); setIframeLoading(false); }}
        className={`w-full flex-1 border-0 bg-white ${iframeLoading ? "h-0 overflow-hidden" : "min-h-[calc(100vh-48px)]"}`}
        sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-redirect-away"
      />
    </div>
  );
}

function CaseDetailFallback({ caseData }: { caseData: CaseSummary }) {
  return (
    <>
      <div className={`relative h-52 ${CASE_CARD_BG} overflow-hidden`}>
        {caseData.image && (
          <img src={caseData.image} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {caseData.domain.map((d) => <DomainBadge key={d} domain={d} />)}
          </div>
          <h2 className="text-lg font-bold text-white leading-snug">{caseData.title}</h2>
        </div>
      </div>
      <div className="p-5 space-y-5">
        {caseData.highlight && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-emerald-300/70 mb-0.5">Key result</p>
            <p className="text-base font-semibold text-emerald-400">{caseData.highlight}</p>
          </div>
        )}
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">About the project</h3>
          <p className="text-sm text-white/70 leading-relaxed">{caseData.description}</p>
        </div>
        <a
          href={caseData.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-white text-black py-3 px-4 text-sm font-semibold hover:bg-white/90 transition-colors"
        >
          Read full case study
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </>
  );
}

/* ── Single Case Details (for show_case_details / show_best_case) ── */

interface CaseDetailsProps {
  id?: string;
  filter?: string;
}

export function CaseDetails({ id, filter }: CaseDetailsProps) {
  const selected =
    (id ? CASES.find((c) => c.id === id) : undefined) ??
    (filter?.trim() ? CASES.find((c) => c.domain.some((d) => d.toLowerCase().includes(filter.toLowerCase()))) : undefined) ??
    CASES[0];
  const [imgError, setImgError] = useState(false);

  const openInSidePanel = (e: React.MouseEvent) => {
    e.preventDefault();
    const domain = selected.domain[0] ?? "Other";
    window.dispatchEvent(
      new CustomEvent("open-case-in-panel", { detail: { domain, caseId: selected.id } })
    );
  };

  return (
    <a
      href={selected.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={openInSidePanel}
      className="group block w-full rounded-xl border border-white/[0.1] bg-white/[0.04] overflow-hidden hover:bg-white/[0.06] hover:border-white/[0.2] transition-all duration-200 ring-1 ring-inset ring-white/[0.04] cursor-pointer"
    >
      {/* Upper section: purple background + screenshot (same as second screen) */}
      <div className={`relative min-h-[280px] h-[320px] sm:h-[360px] md:h-[400px] ${CASE_CARD_BG} overflow-hidden`}>
        {selected.image && !imgError && (
          <img
            src={selected.image}
            alt=""
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-2 left-2.5 flex flex-wrap gap-1">
          {selected.domain.map((d) => (
            <DomainBadge key={d} domain={d} />
          ))}
        </div>
      </div>
      {/* Lower section: tag, title, highlight, description, CTA */}
      <div className="p-3 sm:p-4 space-y-1.5">
        <h4 className="text-sm sm:text-base font-semibold text-white/90 group-hover:text-white leading-snug transition-colors line-clamp-2">
          {selected.title}
        </h4>
        {selected.highlight && (
          <p className="text-[11px] sm:text-xs font-semibold text-emerald-400">{selected.highlight}</p>
        )}
        <p className="text-xs text-white/40 leading-relaxed line-clamp-2 sm:line-clamp-3">{selected.description}</p>
        <span className="inline-flex items-center gap-1 text-[11px] text-white/25 group-hover:text-white/50 transition-colors mt-1">
          View details <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </a>
  );
}

export function BestCaseCard() {
  return <CaseDetails id="sitenna" />;
}

const COLLAB_CARDS = [
  {
    id: "tam",
    icon: Clock,
    label: "Trusted · Time & Material",
    title: "Flexible scope, pay for actual effort",
    description: "Best when the product is still evolving and you need fast iteration without heavy fixed‑scope commitments.",
    bestFor: "Early‑stage products and ongoing roadmaps.",
    accent: "from-emerald-500/20",
  },
  {
    id: "partnership",
    icon: Handshake,
    label: "Partnership · Product outcome",
    title: "Focus on results, not hours",
    description: "We fix goals and an approximate budget, share part of the risk, and help with product decisions — not just drawing screens.",
    bestFor: "Outcome‑driven work when you want a strategic design partner.",
    accent: "from-sky-500/20",
  },
  {
    id: "dedicated",
    icon: Users,
    label: "Dedicated team",
    title: "Your own product designers / PM as an extension of your team",
    description: "Works well for scale‑ups and enterprise products that need a stable design team for 6+ months.",
    bestFor: "Scale‑ups and enterprise products that need a long‑term embedded team.",
    accent: "from-violet-500/25",
  },
] as const;

export function EngagementModelsCard() {
  return (
    <Card className="bg-transparent backdrop-blur-xl border-white/[0.08] font-[Gilroy]">
      <CardContent className="space-y-6 p-6 sm:p-7">
        <div className="text-center sm:text-left">
          <h3 className="text-lg sm:text-xl font-semibold text-white/95">
            Collaboration models
          </h3>
          <p className="mt-1 text-xs text-white/45">
            Three simple ways to structure our work together.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {COLLAB_CARDS.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className={`group relative flex flex-col rounded-3xl border border-white/[0.16] bg-gradient-to-b ${item.accent} to-white/[0.04] px-6 py-6 min-h-[220px] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[0_26px_70px_rgba(15,23,42,0.85)]`}
              >
                <div className="flex items-center gap-3 min-h-[22px]">
                  <div className="inline-flex h-12 w-12 items-center justify-center text-white/90">
                    <Icon className="h-8 w-8" aria-hidden strokeWidth={1} />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-white/80 leading-none font-semibold truncate whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
                <div className="mt-[18px] h-[132px] space-y-2">
                  <h4 className="text-[16px] font-semibold leading-snug text-white line-clamp-2">
                    {item.title}
                  </h4>
                  <p className="text-[14px] leading-relaxed text-white/80 line-clamp-3">
                    {item.description}
                  </p>
                </div>
                <div className="mt-[18px] rounded-2xl border border-white/[0.18] bg-white/8/10 bg-white/[0.06] px-3.5 py-2.5 text-[11px] text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                  <span className="block font-semibold text-white/85">
                    Best for
                  </span>
                  <span className="block mt-0.5">{item.bestFor}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-1">
          <a
            href="https://cieden.com/project-cost-calculator"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          >
            Open full pricing calculator on cieden.com
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

interface EstimateSummaryProps {
  productType?: string;
  complexity?: string;
  scope?: string;
  timeline?: string;
  rangeFrom: number;
  rangeTo: number;
  currency?: string;
}

export function EstimateSummaryCard({ productType, complexity, scope, timeline, rangeFrom, rangeTo, currency = "USD" }: EstimateSummaryProps) {
  const format = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

  return (
    <Card className="bg-gradient-to-b from-white/[0.07] to-white/[0.02] border-white/[0.08]">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl text-white/90">Preliminary estimate</CardTitle>
        <p className="text-xs text-white/40">This is an approximate range. The final cost is refined after a joint workshop or detailed requirements gathering.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-xs text-white/40">
          {productType && <p><span className="text-white/60">Product type:</span> {productType}</p>}
          {complexity && <p><span className="text-white/60">Complexity:</span> {complexity}</p>}
          {scope && <p><span className="text-white/60">Scope:</span> {scope}</p>}
          {timeline && <p><span className="text-white/60">Desired timeline:</span> {timeline}</p>}
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-emerald-300/80">Estimated range</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-100">{format(rangeFrom)} – {format(rangeTo)}</p>
        </div>
      </CardContent>
      <CardFooter>
        <a href="https://cieden.com/pricing" target="_blank" rel="noopener noreferrer"
          className="text-center w-full text-xs text-white/30 hover:text-white/60 transition-colors flex items-center justify-center gap-1">
          Use Cieden pricing calculator for a detailed estimate <ExternalLink className="w-3 h-3" />
        </a>
      </CardFooter>
    </Card>
  );
}

/* ── About Cieden card ── */
export function AboutCiedenCard() {
  return (
    <Card
      className="group relative overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-white/[0.01] backdrop-blur-2xl shadow-[0_22px_60px_rgba(0,0,0,0.75)] transition-all duration-300 hover:-translate-y-1.5 hover:border-violet-300/80 hover:shadow-[0_32px_90px_rgba(129,140,248,0.9)] cursor-pointer font-[Gilroy]"
      role="button"
      tabIndex={0}
      aria-label="Open Cieden about page"
      onClick={() => {
        window.dispatchEvent(new CustomEvent("open-about-panel"));
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          window.dispatchEvent(new CustomEvent("open-about-panel"));
        }
      }}
    >
      {/* subtle glow on hover */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -top-20 -left-16 h-44 w-44 rounded-full bg-violet-500/35" />
        <div className="absolute bottom-[-88px] right-[-56px] h-56 w-56 rounded-full bg-emerald-400/30" />
      </div>

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
              About
            </p>
            <div>
              <CardTitle className="text-[24px] text-white/95">
                Cieden
              </CardTitle>
              <CardDescription className="mt-1.5 text-[16px] text-white/65 leading-relaxed">
                Digital product design agency since 2016. We combine design, business analysis, and AI expertise for B2B SaaS and enterprise.
              </CardDescription>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2 text-right">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-medium text-white/75 whitespace-nowrap">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              98% satisfaction
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-1 text-sm text-white/75">
        <div className="space-y-6">
          {/* Photo block */}
          <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-white/[0.03] p-1.5">
            <div className="absolute inset-3 -z-10 rounded-3xl border border-white/20 bg-gradient-to-tr from-violet-500/30 via-transparent to-emerald-400/20" />
            <div className="relative overflow-hidden rounded-2xl aspect-[4/3] sm:aspect-[16/9]">
              <img
                src="/teamabout.png"
                alt="Cieden design team"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1.5 text-[11px] text-white/85 backdrop-blur-md">
                Cieden team · 50+ people
              </div>
            </div>
          </div>

          {/* Three info pills under photo */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-3.5 shadow-[0_10px_26px_rgba(15,23,42,0.55)]">
              <h4 className="mb-1 text-[14px] font-semibold uppercase tracking-wide text-white/55">
                What we do
              </h4>
              <p className="text-[12px] leading-relaxed text-white/80">
                Product design, UX/UI, AI product design, business analysis, dedicated teams, design sprints, video production, technology consultancy (CaaS).
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-3.5 shadow-[0_10px_26px_rgba(15,23,42,0.55)]">
              <h4 className="mb-1 text-[14px] font-semibold uppercase tracking-wide text-white/55">
                Industries
              </h4>
              <p className="text-[12px] leading-relaxed text-white/80">
                AI, SaaS, fintech, healthcare, digital health, edtech, real estate, e‑commerce, BPM, ERP, martech, logistics, B2B.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-3.5 shadow-[0_10px_26px_rgba(15,23,42,0.55)]">
              <h4 className="mb-1 text-[14px] font-semibold uppercase tracking-wide text-white/55">
                Design &amp; development
              </h4>
              <p className="text-[12px] leading-relaxed text-white/80">
                Full cycle from UX research to launch and post‑launch support. You can choose design only or design + development under one roof.
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-2 flex flex-col gap-2 border-t border-white/7 pt-4 sm:flex-row sm:items-center">
        <p className="text-[16px] leading-relaxed text-white/70">
          Cherishing the difference between leaders and bosses, partners and customers is the basis of our
          team cooperation. We share the responsibility for our company among us and in return, everyone is
          granted motivating compensation, unlimited vacations, and a remote-friendly working environment. This
          is our vision of a perfect world and we invite you to join us.
        </p>
      </CardFooter>
    </Card>
  );
}

/* ── About Cieden side panel (slides in from the right, shows about page) ── */

interface AboutPanelProps {
  onClose: () => void;
}

export function AboutPanel({ onClose }: AboutPanelProps) {
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const aboutUrl = "https://cieden.com/about";
  const proxyUrl = `/api/proxy-case?url=${encodeURIComponent(aboutUrl)}`;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-white/[0.12] bg-white ring-1 ring-inset ring-white/[0.05] sm:w-1/2"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/[0.12] bg-[#0a0a0f] px-5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium uppercase tracking-wider text-white/75">
            About Cieden
          </span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={aboutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-white/45 hover:text-white/80 transition-colors"
          >
            Open on site
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 bg-white">
        {iframeError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-slate-700">
              We couldn&apos;t load the about page inside the app.
            </p>
            <a
              href={aboutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Open about page on cieden.com
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            {iframeLoading && (
              <div className="flex items-center justify-center py-10">
                <div className="flex items-center gap-3 text-slate-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
                  <span className="text-sm">Loading Cieden about page...</span>
                </div>
              </div>
            )}
            <iframe
              src={proxyUrl}
              title="About Cieden"
              onLoad={() => setIframeLoading(false)}
              onError={() => {
                setIframeError(true);
                setIframeLoading(false);
              }}
              className={`h-full w-full border-0 bg-white ${
                iframeLoading ? "h-0 overflow-hidden" : ""
              }`}
              sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-redirect-away"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Process & Timeline card (covers questions 16–25: process, timeline, start speed, iterations, team, communication, discovery) ── */
const PROCESS_STEPS = [
  {
    id: 1,
    label: "Discovery",
    caption: "User / market / competitor research, workshops, requirements.",
    detail:
      "We clarify goals, risks, and constraints, run discovery workshops, and study users, market, and competitors so the team solves the right problem.",
    bullets: [
      "User research & interviews",
      "Market and competitor review",
      "Discovery workshops with your team",
      "Requirements and success metrics definition",
    ],
    icon: Compass,
    colorClasses:
      "bg-violet-500/40 border-violet-200/70 shadow-[0_0_10px_rgba(139,92,246,0.6)]",
  },
  {
    id: 2,
    label: "UX sprints",
    caption: "Flows, wireframes, UX design sprints with testing and feedback.",
    detail:
      "We map user flows, build and test wireframes in short UX sprints, collect feedback, and adjust scope before investing in visuals.",
    bullets: [
      "User flows and information architecture",
      "Wireframes and interactive prototypes",
      "Design sprints with quick validation",
      "Scope and priorities aligned with your goals",
    ],
    icon: Workflow,
    colorClasses:
      "bg-sky-500/40 border-sky-200/70 shadow-[0_0_10px_rgba(56,189,248,0.6)]",
  },
  {
    id: 3,
    label: "UI & system",
    caption: "Visual language, components, high‑fidelity screens & prototypes.",
    detail:
      "We create the visual language, components, and design system, then ship clickable high‑fidelity prototypes your team can walk through.",
    bullets: [
      "Visual language and UI concepts",
      "Design system and reusable components",
      "High‑fidelity screens & clickable prototypes",
      "Handoff‑ready specs built into the design",
    ],
    icon: LayoutTemplate,
    colorClasses:
      "bg-amber-500/40 border-amber-200/70 shadow-[0_0_10px_rgba(245,158,11,0.6)]",
  },
  {
    id: 4,
    label: "Handoff & support",
    caption: "Specs, documentation, dev support, QA and continuous product work.",
    detail:
      "We prepare specs and documentation, support developers during implementation, help with QA, and continue iterating after launch.",
    bullets: [
      "Specs and implementation guidelines",
      "Design support for developers & QA",
      "Post‑launch UX improvements",
      "Optional long‑term product partnership",
    ],
    icon: LifeBuoy,
    colorClasses:
      "bg-emerald-500/40 border-emerald-200/70 shadow-[0_0_10px_rgba(16,185,129,0.6)]",
  },
] as const;

const PROCESS_STEP_DETAIL_STYLES: Record<
  number,
  { border: string; dot: string }
> = {
  1: {
    border: "border-violet-300/70 bg-violet-500/10",
    dot: "bg-violet-300",
  },
  2: {
    border: "border-sky-300/70 bg-sky-500/10",
    dot: "bg-sky-300",
  },
  3: {
    border: "border-amber-300/70 bg-amber-500/10",
    dot: "bg-amber-300",
  },
  4: {
    border: "border-emerald-300/70 bg-emerald-500/10",
    dot: "bg-emerald-300",
  },
};

const PROCESS_STEP_ICON_COLORS: Record<number, string> = {
  // Keep step icons neutral (no strong colored tiles)
  1: "bg-white/[0.06] border border-white/[0.14] text-white/90",
  2: "bg-white/[0.06] border border-white/[0.14] text-white/90",
  3: "bg-white/[0.06] border border-white/[0.14] text-white/90",
  4: "bg-white/[0.06] border border-white/[0.14] text-white/90",
};

const PROCESS_STEP_CARD_BG: Record<number, string> = {
  // Mirror-like alternation by gradient direction and accent color
  1: "bg-gradient-to-br from-violet-500/14 via-white/[0.05] to-white/[0.03]",
  2: "bg-gradient-to-bl from-sky-500/14 via-white/[0.05] to-white/[0.03]",
  3: "bg-gradient-to-br from-amber-500/14 via-white/[0.05] to-white/[0.03]",
  4: "bg-gradient-to-bl from-emerald-500/14 via-white/[0.05] to-white/[0.03]",
};

export function ProcessTimelineCard() {
  // Start collapsed: the step details popup should appear only after user clicks.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const currentStep =
    selectedIndex != null ? PROCESS_STEPS[selectedIndex] : PROCESS_STEPS[0];

  return (
    <Card className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-transparent backdrop-blur-xl font-[Gilroy]">
      {/* subtle glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute top-0 right-[-80px] h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />
      </div>
      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="text-[24px] text-white/90">
          Process, team & communication
        </CardTitle>
        <CardDescription className="text-white/60 text-[16px] leading-relaxed">
          Four clear stages from first conversation to ongoing support.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 space-y-6 text-[16px] text-white/75">
        <div className="space-y-4">
          <h4 className="text-[16px] font-semibold text-white/90">
            Process timeline
          </h4>

          {/* Compact cards instead of busy timeline */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS_STEPS.map((step, index) => {
              const isActive = selectedIndex === index;
              const Icon = step.icon;
              return (
                <motion.button
                  key={step.id}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  aria-label={`Open details for step ${step.label}`}
                  className={`group relative flex h-full min-h-[260px] flex-col items-start rounded-2xl border px-5 py-6 text-left backdrop-blur-xl transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70 ${
                    isActive
                      ? "border-violet-300/80 shadow-[0_14px_35px_rgba(124,58,237,0.22)]"
                      : "border-white/[0.12] hover:border-violet-200/70 hover:shadow-[0_12px_28px_rgba(15,23,42,0.55)]"
                  } ${PROCESS_STEP_CARD_BG[step.id] ?? "bg-white/[0.04]"}`}
                >
                  <div className="mb-6 flex w-full items-center gap-3">
                    <div
                      className={`inline-flex h-14 w-14 items-center justify-center rounded-xl p-2 text-white/90 ${
                        PROCESS_STEP_ICON_COLORS[step.id] ?? "bg-black/30 text-white"
                      }`}
                    >
                      {Icon && (
                        <Icon
                          className="h-8 w-8"
                          aria-hidden
                          // Make the icon lines thinner to match the new visual balance.
                          strokeWidth={1}
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/50">
                      Step {step.id}
                    </span>
                  </div>
                  <p className="text-[16px] font-semibold uppercase tracking-wide text-white/90">
                    {step.label}
                  </p>
                  <p className="mt-1 text-[14px] leading-snug text-white/75 line-clamp-4">
                    {step.caption}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[11px] font-medium text-violet-300 group-hover:text-violet-200">
                    View details
                    <ChevronRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Popup with full details for selected step */}
        {selectedIndex != null && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={`relative w-full max-w-3xl rounded-3xl border px-6 py-6 text-[16px] text-white/85 backdrop-blur-3xl ${
                PROCESS_STEP_DETAIL_STYLES[currentStep.id]?.border ??
                "border-white/[0.16] bg-white/[0.10]"
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white/80 hover:bg-white/25 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
              <div className="flex items-center gap-3 pb-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${currentStep.colorClasses}`}
                >
                  {currentStep.id}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/80">
                    Step {currentStep.id}
                  </p>
                  <h4 className="text-sm font-semibold text-white">
                    {currentStep.label}
                  </h4>
                </div>
              </div>
              <p className="mt-2 text-[16px] leading-relaxed text-white/95">
                {currentStep.detail}
              </p>
              {currentStep.bullets && (
                <ul className="mt-4 grid gap-2 text-[16px] text-white/90 sm:grid-cols-2">
                  {currentStep.bullets.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/90" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </div>
        )}
      </CardContent>
      <CardFooter className="relative z-10">
        <a
          href="https://cieden.com/services"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          See services <ExternalLink className="w-3.5 h-3.5" aria-hidden />
        </a>
      </CardFooter>
    </Card>
  );
}

/* ── Getting Started card ── */
export function GettingStartedCard() {
  const [activeModel, setActiveModel] = useState<"project" | "extension" | "bot">("project");

  return (
    <Card className="bg-transparent backdrop-blur-xl border-white/[0.08] font-[Gilroy]">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl text-white/90">How to start</CardTitle>
        <CardDescription className="text-white/50 text-sm sm:text-base">
          We reply in under 24 hours. First call is free — we align on your goals and suggest next steps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 text-sm sm:text-[16px] text-white/70">
        <ol className="space-y-2 list-decimal list-inside text-sm sm:text-[15px]">
          <li>Write to us (chat or form on cieden.com/contact) — briefly about your project</li>
          <li>We schedule a call and ask about your vision, goals, and requirements</li>
          <li>You get a free consultation: what we can offer for your budget and timeline</li>
        </ol>
        <p className="text-xs sm:text-sm text-white/50">If we’re not a fit, we’ll say so and recommend alternatives. No obligation.</p>

        {/* Inline pricing & models preview */}
        <div className="mt-2 space-y-4">
          <h4 className="text-base sm:text-lg font-semibold text-white/85">Pricing & collaboration models</h4>
          <p className="text-xs text-white/55 max-w-3xl">
            Three main ways we usually work together. Exact numbers are refined after we understand scope, team size, and timelines.
          </p>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto w-full">
            {/* Project-based */}
            <div className="rounded-3xl border border-violet-300/70 bg-gradient-to-b from-violet-500/22 via-violet-600/10 to-white/[0.02] backdrop-blur-xl px-6 py-8 flex flex-col justify-between min-h-[340px] transition-all duration-200 hover:border-violet-200 hover:bg-violet-500/24">
              <div className="space-y-3">
                <div className="inline-flex h-[72px] w-[72px] items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.14] text-white/90">
                  <Clock className="h-12 w-12" aria-hidden strokeWidth={1} />
                </div>
                <p className="text-[13px] font-semibold uppercase tracking-widest text-white/50">Project-based</p>
                <p className="text-[15px] sm:text-[16px] text-white/60">
                  You delegate the entire project to us, from planning to final delivery. Our team is responsible for completing all deliverables on time.
                </p>
                <div className="mt-2">
                  <p className="text-[11px] uppercase tracking-wide text-white/40">Starting at</p>
                  <p className="text-2xl font-semibold text-white/95">
                    $50<span className="text-xs font-normal text-white/60"> /hour</span>
                  </p>
                  <p className="text-[12px] text-white/45">Designers based in USA/Canada: from $80/hour.</p>
                </div>
                <div className="mt-3 space-y-1.5 text-[12px] text-white/60">
                  <p className="font-semibold text-white/70">You get:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>a one‑stop design journey</li>
                    <li>research‑backed design decisions</li>
                    <li>transparent billing and progress reports</li>
                    <li>final design files you own, plus next‑step recommendations</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.08]">
                <a
                  href="https://cieden.com/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-300 bg-transparent py-2.5 px-3 text-sm font-semibold text-violet-100 hover:border-violet-200 transition-colors"
                >
                  Contact us
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                </a>
              </div>
            </div>

            {/* Team extension */}
            <div className="rounded-3xl border border-sky-300/70 bg-gradient-to-b from-sky-500/22 via-sky-600/10 to-white/[0.02] backdrop-blur-xl px-6 py-8 flex flex-col justify-between min-h-[340px] transition-all duration-200 hover:border-sky-200 hover:bg-sky-500/24">
              <div className="space-y-3">
                <div className="inline-flex h-[72px] w-[72px] items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.14] text-white/90">
                  <Users className="h-12 w-12" aria-hidden strokeWidth={1} />
                </div>
                <p className="text-[13px] font-semibold uppercase tracking-widest text-white/50">Team extension</p>
                <p className="text-[15px] sm:text-[16px] text-white/60">
                  You outsource our specialists to fill skill gaps or expand your team&apos;s capacity, integrating them with your in‑house team.
                </p>
                <div className="mt-2">
                  <p className="text-[11px] uppercase tracking-wide text-white/40">Starting at</p>
                  <p className="text-2xl font-semibold text-white/95">
                    $7,200<span className="text-xs font-normal text-white/60"> /month per person</span>
                  </p>
                  <p className="text-[12px] text-white/45">Designers based in USA/Canada: from $11,520/month.</p>
                </div>
                <div className="mt-3 space-y-1.5 text-[12px] text-white/60">
                  <p className="font-semibold text-white/70">You get:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>designers who feel like part of your in‑house crew</li>
                    <li>freedom to scale your team up or down</li>
                    <li>regular check‑ins &amp; strategy alignment</li>
                    <li>access to our full design expertise</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.08]">
                <a
                  href="https://cieden.com/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300 bg-transparent py-2.5 px-3 text-sm font-semibold text-sky-100 hover:border-sky-200 transition-colors"
                >
                  Contact us
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                </a>
              </div>
            </div>

            {/* Build-operate-transfer */}
            <div className="rounded-3xl border border-emerald-300/70 bg-gradient-to-b from-emerald-500/22 via-emerald-600/10 to-white/[0.02] backdrop-blur-xl px-6 py-7 flex flex-col justify-between min-h-[300px] transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-500/24">
              <div className="space-y-3">
                <div className="inline-flex h-[72px] w-[72px] items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.14] text-white/90">
                  <Handshake className="h-12 w-12" aria-hidden strokeWidth={1} />
                </div>
                <p className="text-[13px] font-semibold uppercase tracking-widest text-white/50">Build‑operate‑transfer</p>
                <p className="text-[15px] sm:text-[16px] text-white/60">
                  We recruit, onboard, and train a team for your project, then smoothly transfer the team to you when you are ready.
                </p>
                <div className="mt-2">
                  <p className="text-[11px] uppercase tracking-wide text-white/40">Starting at</p>
                  <p className="text-2xl font-semibold text-white/95">
                    $25,000<span className="text-xs font-normal text-white/60"> /per person</span>
                  </p>
                </div>
                <div className="mt-3 space-y-1.5 text-[12px] text-white/60">
                  <p className="font-semibold text-white/70">You get:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>a handpicked team, recruited and trained just for you</li>
                    <li>full day‑to‑day management and oversight handled by us</li>
                    <li>regular check‑ins so you&apos;re always in the loop</li>
                    <li>a smooth transfer to your payroll or EOR model</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.08]">
                <a
                  href="https://cieden.com/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-transparent py-2.5 px-3 text-sm font-semibold text-emerald-100 hover:border-emerald-200 transition-colors"
                >
                  Contact us
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                </a>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3" />
    </Card>
  );
}

/* ── Post-delivery & Support card ── */
export function SupportCard() {
  const [activeTab, setActiveTab] = useState<"deliverables" | "ongoing" | "models">("deliverables");

  const faqItems = [
    {
      id: 0,
      q: "What exactly do I get at the end of the project?",
      a: "You get full ownership of design files, documentation and design system. We also run a handoff session with your team so everyone knows how to use it.",
    },
    {
      id: 1,
      q: "Can you help our dev team after launch?",
      a: "Yes. We stay available for UX questions, edge cases, new feature design and design system updates, either in a light or weekly support mode.",
    },
    {
      id: 2,
      q: "Is support only long-term retainers?",
      a: "No. We can start from a small package of hours or a short trial month and then scale to a stable retainer if it makes sense.",
    },
  ] as const;

  return (
    <Card className="relative overflow-hidden bg-black/85 border border-white/10 rounded-[32px] backdrop-blur-2xl shadow-[0_24px_70px_-24px_rgba(0,0,0,0.9)] font-[Gilroy]">
      <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/14 via-transparent to-violet-500/16 pointer-events-none" />

      <CardHeader className="relative z-10 pb-4 pt-6 px-6">
        <CardTitle className="text-white text-[24px] font-semibold leading-tight">
          After delivery &amp; support
        </CardTitle>
        <CardDescription className="text-white/70 text-[16px] leading-relaxed mt-1.5">
          What happens after launch: what you get, how we stay involved, and which support model fits you best.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 space-y-4 px-6 sm:px-7 pb-2 text-[14px] text-white/75">
        {/* Tabs */}
        <div
          className="inline-flex flex-wrap rounded-full bg-white/[0.06] p-1 text-[13px] text-white/60 ring-1 ring-white/[0.08]"
          role="tablist"
          aria-label="Support sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "deliverables"}
            onClick={() => setActiveTab("deliverables")}
            className={`px-3 py-1.5 rounded-full transition-all ${
              activeTab === "deliverables"
                ? "bg-white text-slate-950 shadow-sm font-semibold"
                : "hover:bg-white/[0.06]"
            }`}
          >
            Deliverables
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "ongoing"}
            onClick={() => setActiveTab("ongoing")}
            className={`px-3 py-1.5 rounded-full transition-all ${
              activeTab === "ongoing"
                ? "bg-white text-slate-950 shadow-sm font-semibold"
                : "hover:bg-white/[0.06]"
            }`}
          >
            Ongoing support
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "models"}
            onClick={() => setActiveTab("models")}
            className={`px-3 py-1.5 rounded-full transition-all ${
              activeTab === "models"
                ? "bg-white text-slate-950 shadow-sm font-semibold"
                : "hover:bg-white/[0.06]"
            }`}
          >
            Retainer models
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "deliverables" && (
          <div className="space-y-3">
            <h4 className="text-[16px] font-semibold text-white/90">What you get at handoff</h4>
            <ul className="space-y-2 text-[14px] text-white/75 list-disc list-inside leading-relaxed">
              <li>
                <span className="font-semibold text-white/90">Figma files:</span> design system, low‑/high‑fidelity
                prototypes, dev‑ready components.
              </li>
              <li>
                <span className="font-semibold text-white/90">UX docs (on request):</span> user flows, personas, customer
                journeys, information architecture.
              </li>
              <li>
                <span className="font-semibold text-white/90">Specs for developers:</span> clickable prototypes, redlines,
                tokens, component usage guidelines.
              </li>
              <li>
                <span className="font-semibold text-white/90">Knowledge transfer:</span> walkthrough session and recording
                so your team can continue without us.
              </li>
            </ul>
          </div>
        )}

        {activeTab === "ongoing" && (
          <div className="space-y-3">
            <h4 className="text-[16px] font-semibold text-white/90">How we support you after launch</h4>
            <ul className="space-y-2 text-[14px] text-white/75 list-disc list-inside leading-relaxed">
              <li>Fix UX issues spotted by real users and your team.</li>
              <li>Design and validate new features in small, focused sprints.</li>
              <li>Review analytics and session recordings to find quick wins.</li>
              <li>Support developers with UI/UX questions, edge cases, and QA.</li>
              <li>Keep the design system healthy as the product grows.</li>
            </ul>
            <p className="text-[13px] text-white/55 leading-relaxed">
              You can pause or scale support up/down depending on your roadmap — we adapt to your release cadence.
            </p>
          </div>
        )}

        {activeTab === "models" && (
          <div className="space-y-4">
            <h4 className="text-[16px] font-semibold text-white/90">Typical support formats</h4>
            <div className="grid gap-3 sm:grid-cols-3 text-[13px] text-white/75">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-white/45 mb-1.5">Light</p>
                <p className="font-semibold text-white/90 mb-1">A few days per month</p>
                <p className="text-white/65 leading-relaxed">
                  Best when product is stable and you need occasional tweaks, reviews, and design support.
                </p>
              </div>
              <div className="rounded-2xl border border-violet-300/60 bg-violet-500/15 p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-violet-100 mb-1.5">Standard</p>
                <p className="font-semibold text-white/90 mb-1">Weekly involvement</p>
                <p className="text-white/80 leading-relaxed">
                  Designers join planning, refine UX for new features, and keep the design system in sync with dev.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-white/45 mb-1.5">Intensive</p>
                <p className="font-semibold text-white/90 mb-1">Embedded in your team</p>
                <p className="text-white/65 leading-relaxed">
                  For fast‑moving roadmaps: designers work almost like in‑house, with tight loops to your PM and devs.
                </p>
              </div>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed">
              Exact scope and pricing depend on your roadmap — we usually start with a short call to pick the right model.
            </p>
          </div>
        )}

        {/* FAQ — static (no accordion) */}
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <p className="text-[11px] uppercase tracking-wide text-white/40">FAQ about support</p>
          {faqItems.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[14px] text-white/75"
            >
              <p className="font-semibold text-white/90">{item.q}</p>
              <p className="mt-2 text-[14px] text-white/65 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="relative z-10 px-6 sm:px-7 pb-6 pt-0">
        <a
          href="https://cieden.com/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[14px] text-white/50 hover:text-white/80 transition-colors"
          aria-label="Contact for support options (opens in new tab)"
        >
          Contact for support options <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
        </a>
      </CardFooter>
    </Card>
  );
}
