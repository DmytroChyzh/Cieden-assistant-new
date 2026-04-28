"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PhoneCall, Sparkles } from "lucide-react";

interface NextStepsData {
  primaryAction?: "schedule_call" | "request_deck" | "request_estimate";
  preferredTimeframe?: string;
  contactChannel?: "email" | "calendar" | "slack" | "other";
}

interface NextStepsCardProps {
  data?: NextStepsData;
  className?: string;
  compact?: boolean;
  onUserAction?: ((text: string) => void) | null;
}

export function NextStepsCard({
  data,
  className,
  compact = false,
  onUserAction,
}: NextStepsCardProps) {
  const current = data || {};

  const handleClick = (action: NextStepsData["primaryAction"]) => {
    if (!action) return;
    switch (action) {
      case "schedule_call":
        onUserAction?.("OPEN_BOOK_CALL_PANEL");
        break;
      case "request_deck":
        onUserAction?.("TOOL_CALL:show_cases:{\"mode\":\"default\"}");
        break;
      case "request_estimate":
        onUserAction?.("TOOL_CALL:open_calculator:{\"mode\":\"default\"}");
        break;
      default:
        break;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 215, damping: 22 }}
      className={cn("w-full max-w-[900px] mx-auto", className)}
    >
      <Card className="relative overflow-hidden bg-black/85 border border-white/10 rounded-[32px] backdrop-blur-2xl shadow-[0_24px_70px_-24px_rgba(0,0,0,0.9)] font-[Gilroy]">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/18 via-transparent to-violet-500/16 pointer-events-none" />

        <CardHeader className="relative flex flex-row items-start gap-3 pt-6 pb-4 px-6">
          <div className="p-2.5 rounded-2xl bg-emerald-500/25 border border-emerald-300/40 text-emerald-50 shadow-lg">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <CardTitle className="text-white text-[24px] font-semibold leading-tight">
              Next steps with Cieden
            </CardTitle>
            <CardDescription className="text-white/70 text-[16px] leading-relaxed mt-1">
              Choose how you’d like to continue — we’ll adapt the flow for you.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="relative p-6 sm:p-7 pt-3 space-y-4">
          <NextStepButton
            mirrorVariant={0}
            icon={<PhoneCall className="h-4 w-4" aria-hidden />}
            title="Schedule a call"
            description="30–45 minute discovery call to review your product, goals, and constraints."
            active={current.primaryAction === "schedule_call"}
            onClick={() => handleClick("schedule_call")}
          />

          <NextStepButton
            mirrorVariant={1}
            icon={<Sparkles className="h-4 w-4" aria-hidden />}
            title="Ask for a rough estimate"
            description="We’ll turn your brief into a ballpark budget and timeline, not a final quote."
            active={current.primaryAction === "request_estimate"}
            onClick={() => handleClick("request_estimate")}
          />

          {!compact && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-[14px] text-white/60 leading-relaxed">
                You can change your mind at any point — think of this as a starting direction, not a
                hard commitment.
              </p>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden border border-white/10 bg-black/20">
              <img
                src="/managers/yulia-mahera.png"
                alt="Yulia Mahera"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-white/90 leading-tight">
                Yulia Mahera
              </div>
              <a
                href="mailto:yulia.mahera@cieden.com"
                className="text-[12px] text-violet-200/90 hover:text-violet-100 underline underline-offset-2 transition-colors"
                aria-label="Email Yulia Mahera"
              >
                yulia.mahera@cieden.com
              </a>
              <div className="text-[12px] text-white/55 leading-relaxed">
                Manager · book a call
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface NextStepButtonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  active?: boolean;
  onClick: () => void;
  /** Alternating “mirror” gradient like process step cards */
  mirrorVariant?: number;
}

function NextStepButton({
  icon,
  title,
  description,
  active,
  onClick,
  mirrorVariant = 0,
}: NextStepButtonProps) {
  const mirrorBg =
    mirrorVariant % 2 === 0
      ? "bg-gradient-to-br from-emerald-500/14 via-white/[0.06] to-transparent"
      : "bg-gradient-to-bl from-violet-500/12 via-white/[0.06] to-transparent";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${title}. ${description}`}
      className={cn(
        "w-full flex items-start gap-3 rounded-2xl border px-3.5 py-3.5 text-left transition-all duration-200",
        !active && mirrorBg,
        active
          ? "border-emerald-300/80 bg-emerald-500/25 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]"
          : "border-white/12 hover:bg-white/[0.07] hover:border-white/30",
      )}
    >
      <div className="mt-0.5 shrink-0 rounded-xl bg-black/40 p-2 text-emerald-200 border border-white/10">
        {icon}
      </div>
      <div className="space-y-0.5 min-w-0">
        <div className="text-[16px] font-semibold text-white leading-snug">{title}</div>
        <p className="text-[14px] text-white/70 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}

