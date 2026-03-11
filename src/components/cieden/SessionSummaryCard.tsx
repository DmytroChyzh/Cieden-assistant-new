"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, ListChecks, ArrowRight } from "lucide-react";

interface SessionSummaryData {
  projectName?: string;
  keyPoints?: string[];
  decisions?: string[];
  openQuestions?: string[];
  recommendedNextStep?: string;
}

interface SessionSummaryCardProps {
  data?: SessionSummaryData;
  className?: string;
  compact?: boolean;
  onUserAction?: ((text: string) => void) | null;
}

export function SessionSummaryCard({
  data,
  className,
  compact = false,
  onUserAction,
}: SessionSummaryCardProps) {
  const summary: SessionSummaryData = data || {};

  const safeList = (items?: string[]) => (items && items.length ? items : undefined);

  const handleConfirm = () => {
    const message = `User confirmed session summary and is ready for next step: ${
      summary.recommendedNextStep || "not specified"
    }`;
    onUserAction?.(message);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 215, damping: 22 }}
      className={cn("max-w-5xl w-full mx-auto", className)}
    >
      <Card className="relative overflow-hidden bg-black/90 border border-white/12 rounded-[36px] backdrop-blur-2xl shadow-[0_30px_80px_-28px_rgba(0,0,0,0.9)]">
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/18 via-transparent to-violet-500/18 pointer-events-none" />

        <CardHeader className="relative flex flex-row items-start gap-4 pb-4 pt-7 px-7">
          <div className="p-3 rounded-2xl bg-sky-500/25 border border-sky-300/40 text-sky-50 shadow-lg">
            <ListChecks className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-white text-xl sm:text-2xl font-semibold">
              Session summary
            </CardTitle>
            <CardDescription className="text-white/70 text-sm sm:text-base">
              Quick recap of what we discussed and what should happen next.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="relative p-6 sm:p-7 pt-3 space-y-5">
          {summary.projectName && (
            <p className="text-sm text-white/85">
              <span className="text-white/55">Project:</span>{" "}
              <span className="font-medium">{summary.projectName}</span>
            </p>
          )}

          {safeList(summary.keyPoints) && (
            <SummarySection title="Key points">
              <BulletList items={summary.keyPoints!} />
            </SummarySection>
          )}

          {safeList(summary.decisions) && (
            <SummarySection title="Decisions we made">
              <BulletList items={summary.decisions!} icon="check" />
            </SummarySection>
          )}

          {safeList(summary.openQuestions) && (
            <SummarySection title="Open questions">
              <BulletList items={summary.openQuestions!} icon="dot" />
            </SummarySection>
          )}

          {summary.recommendedNextStep && (
            <div className="mt-2 rounded-2xl border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-50 flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs uppercase tracking-wide text-emerald-100/70 mb-0.5">
                  Recommended next step
                </div>
                <div>{summary.recommendedNextStep}</div>
              </div>
            </div>
          )}

          {!compact && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 rounded-full bg-white text-slate-900 px-4 py-2 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Looks good — continue
              </button>
              <p className="text-[11px] text-white/55">
                If something is missing, just tell me in chat and I’ll update the plan.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface SummarySectionProps {
  title: string;
  children: React.ReactNode;
}

function SummarySection({ title, children }: SummarySectionProps) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs uppercase tracking-wide text-white/55">{title}</div>
      {children}
    </div>
  );
}

interface BulletListProps {
  items: string[];
  icon?: "dot" | "check";
}

function BulletList({ items, icon = "dot" }: BulletListProps) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 16)}`} className="flex items-start gap-2 text-sm">
          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60 flex-shrink-0">
            {icon === "check" && (
              <CheckCircle2 className="h-3 w-3 text-emerald-300 -mt-0.5 -ml-0.5" />
            )}
          </span>
          <span className="text-white/90 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

