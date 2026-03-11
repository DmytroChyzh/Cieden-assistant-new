"use client";

import { bridgeElevenLabsToolToCopilot, type ActionHandlers } from '@/src/utils/toolBridge';

/**
 * Client tools for ElevenLabs agent – Cieden sales assistant (11 tools).
 * Must match the tools configured in the ElevenLabs dashboard.
 *
 * @param actionHandlers - Action handlers from parent component
 * @returns Object with tool functions for ElevenLabs SDK
 */
export function createClientTools(actionHandlers: ActionHandlers | null): Record<string, (parameters: any) => Promise<string | number | void> | string | number | void> | undefined {
  if (!actionHandlers) return undefined;

  return {
    show_cases: async (params: unknown): Promise<string | number | void> => {
      console.log('🎨 Tool: show_cases', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_cases', parameters: params, timestamp: Date.now() },
        actionHandlers
      ) as Promise<string | number | void>;
    },
    show_best_case: async (params: unknown): Promise<string | number | void> => {
      console.log('⭐ Tool: show_best_case', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_best_case', parameters: params, timestamp: Date.now() },
        actionHandlers
      ) as Promise<string | number | void>;
    },
    show_engagement_models: async (params: unknown): Promise<string | number | void> => {
      console.log('🤝 Tool: show_engagement_models', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_engagement_models', parameters: params, timestamp: Date.now() },
        actionHandlers
      ) as Promise<string | number | void>;
    },
    generate_estimate: async (params: unknown): Promise<string | number | void> => {
      console.log('💰 Tool: generate_estimate', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'generate_estimate', parameters: params, timestamp: Date.now() },
        actionHandlers
      ) as Promise<string | number | void>;
    },
    open_calculator: async (params: unknown): Promise<string | number | void> => {
      console.log('🧮 Tool: open_calculator', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'open_calculator', parameters: params, timestamp: Date.now() },
        actionHandlers
      ) as Promise<string | number | void>;
    },
    show_about: async (params: unknown): Promise<string | number | void> => {
      console.log('🏢 Tool: show_about', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_about', parameters: params, timestamp: Date.now() },
        actionHandlers
      ) as Promise<string | number | void>;
    },
    show_process: async (params: unknown): Promise<string | number | void> => {
      console.log('📋 Tool: show_process', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_process', parameters: params, timestamp: Date.now() },
        actionHandlers
      ) as Promise<string | number | void>;
    },
    show_getting_started: async (params: unknown): Promise<string | number | void> => {
      console.log('🚀 Tool: show_getting_started', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_getting_started', parameters: params, timestamp: Date.now() },
        actionHandlers
      ) as Promise<string | number | void>;
    },
    show_support: async (params: unknown): Promise<string | number | void> => {
      console.log('🛟 Tool: show_support', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_support', parameters: params, timestamp: Date.now() },
        actionHandlers
      ) as Promise<string | number | void>;
    },

    show_project_brief: async (params: unknown): Promise<string | number | void> => {
      console.log('📝 Tool: show_project_brief', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_project_brief', parameters: params, timestamp: Date.now() },
        actionHandlers
      ) as Promise<string | number | void>;
    },

    show_next_steps: async (params: unknown): Promise<string | number | void> => {
      console.log('➡️ Tool: show_next_steps', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_next_steps', parameters: params, timestamp: Date.now() },
        actionHandlers
      ) as Promise<string | number | void>;
    },

    show_session_summary: async (params: unknown): Promise<string | number | void> => {
      console.log('📄 Tool: show_session_summary', params);
      return bridgeElevenLabsToolToCopilot(
        { name: 'show_session_summary', parameters: params, timestamp: Date.now() },
        actionHandlers
      ) as Promise<string | number | void>;
    },
  };
}
