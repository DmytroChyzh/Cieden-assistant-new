"use client";

import { MobileFrame } from "@/components/ui/mobile-frame";
import VoiceChatPage from "@/app/voice-chat/page";

export default function MobileDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 flex items-center justify-center">
      <MobileFrame scale={1.0}>
        <VoiceChatPage isMobile={true} />
      </MobileFrame>
    </div>
  );
}