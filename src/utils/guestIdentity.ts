export type GuestIdentity = {
  guestId: string;
  email?: string;
  name?: string;
};

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (!part) continue;
    const [k, ...rest] = part.split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}`;
}

export function getGuestIdentityFromCookie(): GuestIdentity | null {
  const guestId = getCookieValue("cieden_guest_id");
  if (!guestId) return null;

  const email = getCookieValue("cieden_guest_email") ?? undefined;
  const name = getCookieValue("cieden_guest_name") ?? undefined;
  return { guestId, email, name };
}

export function ensureGuestIdentityInCookie(args: {
  email?: string;
  name?: string;
}): GuestIdentity {
  const existing = getGuestIdentityFromCookie();
  if (existing) return existing;

  const guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  setCookie("cieden_guest_id", guestId, 60 * 60 * 24 * 7);
  if (args.email) setCookie("cieden_guest_email", args.email, 60 * 60 * 24 * 7);
  if (args.name) setCookie("cieden_guest_name", args.name, 60 * 60 * 24 * 7);

  return { guestId, email: args.email, name: args.name };
}

export function updateGuestIdentityInCookie(args: {
  email?: string;
  name?: string;
}): GuestIdentity | null {
  const existing = getGuestIdentityFromCookie();
  if (!existing) return null;

  if (args.email && args.email.trim()) {
    setCookie("cieden_guest_email", args.email.trim(), 60 * 60 * 24 * 7);
  }
  if (args.name && args.name.trim()) {
    setCookie("cieden_guest_name", args.name.trim(), 60 * 60 * 24 * 7);
  }

  return getGuestIdentityFromCookie();
}

export function clearGuestIdentityInCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "cieden_guest_id=; path=/; max-age=0";
  document.cookie = "cieden_guest_email=; path=/; max-age=0";
  document.cookie = "cieden_guest_name=; path=/; max-age=0";
}

