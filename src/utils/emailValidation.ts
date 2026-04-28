const EMAIL_CANDIDATE_RE = /\b[^\s<>()"']+@[^\s<>()"']+\b/g;
const EMAIL_STRICT_RE =
  /^(?=.{6,254}$)(?!.*\.\.)([A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*)@([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,63})$/;

export const normalizeEmail = (value?: string | null): string => (value || "").trim().toLowerCase();

export const isValidEmailStrict = (value?: string | null): boolean =>
  EMAIL_STRICT_RE.test(normalizeEmail(value));

export const extractEmailCandidates = (text?: string | null): string[] =>
  ((text || "").match(EMAIL_CANDIDATE_RE) || []).map((c) => c.trim());

export const containsValidEmailInText = (text?: string | null): boolean =>
  extractEmailCandidates(text).some((candidate) => isValidEmailStrict(candidate));

export const hasInvalidEmailLikeInput = (text?: string | null): boolean => {
  const value = (text || "").trim();
  if (!value || !value.includes("@")) return false;
  return !containsValidEmailInText(value);
};
