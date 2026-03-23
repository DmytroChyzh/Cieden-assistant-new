'use client';

import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { ReactNode } from "react";

interface CopilotKitProviderProps {
  children: ReactNode;
}

export function CopilotKitProvider({ children }: CopilotKitProviderProps) {
  // For self-hosted runtime, we don't need a publicApiKey
  // The runtimeUrl points to our own API endpoint
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      showDevConsole={process.env.NODE_ENV === 'development'}
      // Explicitly set publicApiKey to undefined to avoid the requirement
      publicApiKey={undefined}
    >
      {children}
    </CopilotKit>
  );
}
