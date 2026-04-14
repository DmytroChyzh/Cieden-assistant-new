import { NextRequest, NextResponse } from "next/server";

const PREVIEW_TEXT = "Hi there! I'm your Cieden assistant, ready to help you with design, portfolio, and project estimates.";

const ALLOWED_VOICE_IDS = new Set([
  "zubqz6JC54rePKNCKZLG",
  "ys3XeJJA4ArWMhRpcX1D",
  "bu5eKETbFKC8G702EAU4",
  "wSO34DbFKBGmeCNpJL5K",
]);

export async function POST(request: NextRequest) {
  try {
    const { voiceId } = (await request.json()) as { voiceId?: string };

    if (!voiceId || !ALLOWED_VOICE_IDS.has(voiceId)) {
      return NextResponse.json({ error: "Invalid voice ID" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY not configured" },
        { status: 500 },
      );
    }

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: PREVIEW_TEXT,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      },
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("ElevenLabs TTS error:", ttsResponse.status, errorText);
      return NextResponse.json(
        { error: "Failed to generate voice preview" },
        { status: 500 },
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Voice preview error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
