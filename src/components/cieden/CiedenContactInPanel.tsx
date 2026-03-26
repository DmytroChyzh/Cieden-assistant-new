"use client";

import { useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const CIEDEN_CONTACT_URL = "https://cieden.com/contact";

type ContactBodyLayout = "inline" | "panelFill";

/** cieden.com sends frame-blocking headers — iframe stays blank; use a new-tab link instead. */
export function CiedenContactExternalBody({ layout = "inline" }: { layout?: ContactBodyLayout }) {
  const isFill = layout === "panelFill";
  return (
    <div
      className={
        isFill
          ? "flex flex-1 flex-col items-center justify-center min-h-0 px-6 py-10 text-center gap-6"
          : "flex flex-col gap-4"
      }
    >
      <p className={`text-sm text-white/70 leading-relaxed ${isFill ? "max-w-md" : ""}`}>
        The contact page at{" "}
        <span className="text-white/90 font-medium">cieden.com</span> cannot be embedded here
        (the site blocks iframes for security). Use the button below to open the full page in a new
        tab — it will load normally.
      </p>
      <a
        href={CIEDEN_CONTACT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600/40 hover:bg-violet-600/55 border border-violet-400/40 px-6 py-4 text-sm font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.2)] transition-colors cursor-pointer"
        aria-label="Open Cieden contact page in a new tab"
      >
        <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
        Open cieden.com/contact
      </a>
      <p className="text-[11px] text-white/40 break-all max-w-full">{CIEDEN_CONTACT_URL}</p>
    </div>
  );
}

type CiedenContactInPanelProps = {
  /** Tailwind classes for the primary CTA when closed */
  buttonClassName?: string;
};

export function CiedenContactInPanel({
  buttonClassName,
}: CiedenContactInPanelProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          buttonClassName ??
          "flex items-center justify-center gap-2 w-full rounded-xl bg-violet-600/30 hover:bg-violet-600/45 backdrop-blur-md border border-violet-400/30 py-3 px-4 text-sm font-medium text-white transition-all cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.15),inset_0_1px_0_rgba(255,255,255,0.08)] mt-4"
        }
        aria-label="Contact Cieden"
        aria-disabled={false}
      >
        Contact our manager
      </button>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="inline-flex items-center gap-2 self-start rounded-lg px-2 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Back to estimate"
        aria-disabled={false}
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Back
      </button>

      <CiedenContactExternalBody layout="inline" />
    </div>
  );
}
