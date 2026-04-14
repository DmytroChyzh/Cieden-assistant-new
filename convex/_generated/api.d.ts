/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminCleanup from "../adminCleanup.js";
import type * as auth from "../auth.js";
import type * as charts from "../charts.js";
import type * as context from "../context.js";
import type * as conversations from "../conversations.js";
import type * as documents from "../documents.js";
import type * as http from "../http.js";
import type * as kb from "../kb.js";
import type * as messages from "../messages.js";
import type * as quizResponses from "../quizResponses.js";
import type * as quizzes from "../quizzes.js";
import type * as savings from "../savings.js";
import type * as seedDocuments from "../seedDocuments.js";
import type * as sessions from "../sessions.js";
import type * as streaming from "../streaming.js";
import type * as userPreferences from "../userPreferences.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminCleanup: typeof adminCleanup;
  auth: typeof auth;
  charts: typeof charts;
  context: typeof context;
  conversations: typeof conversations;
  documents: typeof documents;
  http: typeof http;
  kb: typeof kb;
  messages: typeof messages;
  quizResponses: typeof quizResponses;
  quizzes: typeof quizzes;
  savings: typeof savings;
  seedDocuments: typeof seedDocuments;
  sessions: typeof sessions;
  streaming: typeof streaming;
  userPreferences: typeof userPreferences;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  persistentTextStreaming: {
    lib: {
      addChunk: FunctionReference<
        "mutation",
        "internal",
        { final: boolean; streamId: string; text: string },
        any
      >;
      createStream: FunctionReference<"mutation", "internal", {}, any>;
      getStreamStatus: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        "pending" | "streaming" | "done" | "error" | "timeout"
      >;
      getStreamText: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          text: string;
        }
      >;
      setStreamStatus: FunctionReference<
        "mutation",
        "internal",
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          streamId: string;
        },
        any
      >;
    };
  };
};
