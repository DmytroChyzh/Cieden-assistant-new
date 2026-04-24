"use client";

import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock3, Loader2, MessageCircleMore, ShieldCheck, Sparkles, X } from "lucide-react";

type BookCallSidePanelProps = {
  onClose: () => void;
  initialProjectDetails?: string;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

type BookCallFormBodyProps = {
  layout?: "inline" | "panelFill";
  initialProjectDetails?: string;
};

const SOURCE_PRESETS = [
  "Referral",
  "LinkedIn",
  "Google",
  "Clutch",
  "Dribbble",
  "Other",
] as const;

const MIN_PROJECT_CHARS = 20;

export function BookCallFormBody({
  layout = "inline",
  initialProjectDetails = "",
}: BookCallFormBodyProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [heardFrom, setHeardFrom] = useState("");
  const [projectDetails, setProjectDetails] = useState(initialProjectDetails);
  const [status, setStatus] = useState<SubmitState>("idle");
  const [errorText, setErrorText] = useState("");
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedProjectDetails = projectDetails.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const projectCharsLeft = Math.max(0, MIN_PROJECT_CHARS - trimmedProjectDetails.length);

  const canSubmit = useMemo(
    () =>
      trimmedName.length >= 2 &&
      isEmailValid &&
      trimmedProjectDetails.length >= MIN_PROJECT_CHARS,
    [trimmedName, isEmailValid, trimmedProjectDetails],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || status === "submitting") return;

    setStatus("submitting");
    setErrorText("");

    try {
      const response = await fetch("/api/book-call/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          heardFrom: heardFrom.trim(),
          projectDetails: trimmedProjectDetails,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Failed to send the form.");
      }
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorText(error instanceof Error ? error.message : "Could not submit your request.");
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setHeardFrom("");
    setProjectDetails(initialProjectDetails);
    setErrorText("");
    setStatus("idle");
  };

  const rootClassName =
    layout === "panelFill"
      ? "flex-1 min-h-0 overflow-y-auto scrollbar-drawer px-4 py-5 sm:px-6 sm:py-6 lg:px-7"
      : "w-full";

  const inputClassName =
    "w-full rounded-xl border border-white/22 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/50 focus:border-violet-300/80 focus:bg-white/[0.08]";

  return (
    <div className={rootClassName}>
      <div className="mx-auto w-full max-w-[860px] space-y-5 font-[Gilroy]">
        <div className="rounded-2xl border border-violet-300/35 bg-gradient-to-br from-violet-500/20 via-indigo-500/14 to-transparent p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/35 bg-violet-500/20 text-violet-100">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold text-white">Schedule a discovery call</h3>
              <p className="text-sm leading-relaxed text-white/82">
                Share project basics and we will come back with the next step and realistic timeline.
              </p>
            </div>
          </div>
        </div>

        {status === "success" ? (
          <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-5 text-emerald-50">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="text-base font-semibold">Request sent successfully.</p>
                <p className="mt-1 text-sm text-emerald-100/90">
                  We received your form and will get back to you shortly.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-emerald-200/35 bg-emerald-400/15 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/25"
              aria-label="Send another request"
              aria-disabled={false}
            >
              Send another request
            </button>
          </div>
        ) : (
          <form className="space-y-4 rounded-2xl border border-white/16 bg-white/[0.045] p-4 sm:p-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/72">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClassName}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                  aria-label="Your name"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/72">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClassName}
                  placeholder="name@company.com"
                  autoComplete="email"
                  type="email"
                  required
                  aria-label="Work email"
                />
                {trimmedEmail.length > 0 && !isEmailValid && (
                  <p className="mt-1 text-xs text-rose-200/90">Please enter a valid email.</p>
                )}
              </label>
            </div>

            <div className="space-y-2">
              <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/72">How did you hear about us?</span>
              <div className="flex flex-wrap gap-2">
                {SOURCE_PRESETS.map((preset) => {
                  const active = heardFrom.trim().toLowerCase() === preset.toLowerCase();
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setHeardFrom(preset)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "border-violet-300/70 bg-violet-500/25 text-violet-100"
                          : "border-white/20 bg-white/[0.05] text-white/88 hover:bg-white/[0.10]"
                      }`}
                      aria-label={`Select source ${preset}`}
                      aria-disabled={false}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
              <input
                value={heardFrom}
                onChange={(e) => setHeardFrom(e.target.value)}
                className={inputClassName}
                placeholder="Or type your source"
                aria-label="How did you hear about us"
              />
            </div>

            <label className="block">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="block text-xs uppercase tracking-wide text-white/72">Tell us about your project</span>
                <span className={`text-xs ${projectCharsLeft > 0 ? "text-amber-200/90" : "text-emerald-200/90"}`}>
                  {projectCharsLeft > 0 ? `${projectCharsLeft} chars left` : "Looks good"}
                </span>
              </div>
              <textarea
                value={projectDetails}
                onChange={(e) => setProjectDetails(e.target.value)}
                className={`${inputClassName} min-h-[150px] resize-y`}
                placeholder="Project type, goals, stage, deadlines, and expectations."
                required
                aria-label="Project details"
              />
            </label>

            {status === "error" && (
              <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {errorText || "Submission failed. Please try again."}
              </div>
            )}

            <div className="rounded-xl border border-white/16 bg-black/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/68">What happens next</p>
              <div className="mt-2 space-y-1.5 text-sm text-white/88">
                <p className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-violet-200/90" aria-hidden />
                  Response within 1 business day
                </p>
                <p className="inline-flex items-center gap-2">
                  <MessageCircleMore className="h-4 w-4 text-violet-200/90" aria-hidden />
                  30-min discovery call with clear next actions
                </p>
                <p className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-violet-200/90" aria-hidden />
                  Your details are used only for this request
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || status === "submitting"}
              aria-label="Submit booking request"
              aria-disabled={!canSubmit || status === "submitting"}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-sm font-semibold transition ${
                !canSubmit || status === "submitting"
                  ? "cursor-not-allowed border-white/16 bg-white/[0.08] text-white/60"
                  : "border-violet-200/75 bg-gradient-to-r from-violet-500/40 to-indigo-500/35 text-white hover:from-violet-500/50 hover:to-indigo-500/45"
              }`}
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Sending...
                </>
              ) : (
                "Book my consultation"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function BookCallSidePanel({ onClose, initialProjectDetails = "" }: BookCallSidePanelProps) {
  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-white/[0.12] bg-[#0a0a0f]/95 backdrop-blur-2xl ring-1 ring-inset ring-white/[0.05] sm:w-[58%] sm:max-w-[980px]"
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium uppercase tracking-wider text-white/75">Book a call</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close booking panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <BookCallFormBody layout="panelFill" initialProjectDetails={initialProjectDetails} />
    </motion.div>
  );
}
