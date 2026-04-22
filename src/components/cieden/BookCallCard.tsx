"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export interface BookCallCardProps {
  className?: string;
  compact?: boolean;
  onUserAction?: ((text: string) => void) | null;
}

export function BookCallCard({ className, compact = false }: BookCallCardProps) {
  const managerEmail = "yulia.mahera@cieden.com";

  const mailtoHref = useMemo(
    () => `mailto:${managerEmail}?subject=${encodeURIComponent("Book a call with Cieden")}`,
    [managerEmail],
  );

  return (
    <Card
      className={cn(
        "relative overflow-hidden bg-black/85 border border-white/10 rounded-[32px] backdrop-blur-2xl shadow-[0_24px_70px_-24px_rgba(0,0,0,0.9)] font-[Gilroy]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/18 via-transparent to-violet-500/16 pointer-events-none" />

      <CardHeader className="relative flex flex-row items-start gap-3 pt-6 pb-4 px-6">
        <div className="shrink-0 p-2.5 rounded-2xl bg-emerald-500/25 border border-emerald-300/40 text-emerald-50 shadow-lg">
          <div className="text-[12px] font-semibold tracking-wide uppercase">Manager</div>
        </div>
        <div>
          <CardTitle className="text-white text-[24px] font-semibold leading-tight">Book a call</CardTitle>
          <CardDescription className="text-white/70 text-[16px] leading-relaxed mt-1">
            30-minute discovery call with our manager.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="relative p-6 sm:p-7 pt-3 space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full overflow-hidden border border-white/10 bg-black/20 shrink-0">
            <img src="/managers/yulia-mahera.png" alt="Yulia Mahera" className="h-full w-full object-cover" />
          </div>

          <div className="min-w-0">
            <div className="text-[16px] font-semibold text-white/90 leading-tight">Yulia Mahera</div>
            <a
              href={mailtoHref}
              className="inline-flex items-center mt-1 text-[13px] text-violet-200/90 hover:text-violet-100 underline underline-offset-2 transition-colors"
              aria-label={`Email ${managerEmail}`}
            >
              {managerEmail}
              <ExternalLink className="h-3.5 w-3.5 ml-1" aria-hidden />
            </a>
            <div className="mt-2 text-[13px] text-white/55 leading-relaxed">
              We’ll discuss your project goals, scope, and next steps.
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              if (typeof window === "undefined") return;
              window.dispatchEvent(new CustomEvent("open-book-call-panel"));
            }}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/35 bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-transparent px-5 py-3 text-sm font-semibold text-white hover:border-violet-400/55 hover:from-violet-500/30 transition-all cursor-pointer"
            aria-label="Open booking form in side panel"
          >
            Open booking form
          </button>
          <a
            href={mailtoHref}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-transparent px-5 py-3 text-sm font-semibold text-white/95 hover:border-violet-400/50 hover:from-violet-500/20 transition-all cursor-pointer"
            aria-label="Email Yulia Mahera to book a call"
          >
            Or email directly
          </a>

          {!compact && (
            <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/60 leading-relaxed">
              Prefer another format? Just write a short note in your email — we’ll reply and schedule the call.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

