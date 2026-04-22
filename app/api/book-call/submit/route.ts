import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type BookCallPayload = {
  name?: string;
  email?: string;
  heardFrom?: string;
  projectDetails?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fieldName(key: "name" | "email" | "heardFrom" | "projectDetails"): string {
  if (key === "name") return process.env.HUBSPOT_BOOK_CALL_FIELD_NAME_NAME || "firstname";
  if (key === "email") return process.env.HUBSPOT_BOOK_CALL_FIELD_NAME_EMAIL || "email";
  if (key === "heardFrom") {
    return process.env.HUBSPOT_BOOK_CALL_FIELD_NAME_SOURCE || "how_did_you_hear_about_us";
  }
  return process.env.HUBSPOT_BOOK_CALL_FIELD_NAME_PROJECT || "message";
}

export async function POST(req: NextRequest) {
  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formId = process.env.HUBSPOT_BOOK_CALL_FORM_ID;

  if (!portalId || !formId) {
    return NextResponse.json(
      { ok: false, error: "HubSpot form is not configured (missing HUBSPOT_PORTAL_ID or HUBSPOT_BOOK_CALL_FORM_ID)." },
      { status: 503 },
    );
  }

  let body: BookCallPayload;
  try {
    body = (await req.json()) as BookCallPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim() || "";
  const email = body.email?.trim() || "";
  const heardFrom = body.heardFrom?.trim() || "";
  const projectDetails = body.projectDetails?.trim() || "";

  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Valid email is required." }, { status: 400 });
  }
  if (projectDetails.length < 10) {
    return NextResponse.json({ ok: false, error: "Please provide more project details." }, { status: 400 });
  }

  const targetUrl = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;
  const pageUri = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://cieden.com";

  const hsPayload = {
    fields: [
      { name: fieldName("name"), value: name },
      { name: fieldName("email"), value: email },
      { name: fieldName("heardFrom"), value: heardFrom },
      { name: fieldName("projectDetails"), value: projectDetails },
    ],
    context: {
      pageUri,
      pageName: "Voice Chat Book a Call Panel",
    },
  };

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hsPayload),
      cache: "no-store",
    });

    if (!response.ok) {
      const responseText = await response.text();
      return NextResponse.json(
        { ok: false, error: `HubSpot rejected submission: ${responseText.slice(0, 300)}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[book-call/submit]", error);
    return NextResponse.json({ ok: false, error: "Failed to submit to HubSpot." }, { status: 500 });
  }
}
