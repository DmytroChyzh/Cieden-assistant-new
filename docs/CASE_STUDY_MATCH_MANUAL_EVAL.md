# Manual evaluation — hybrid similar-case matching

Run `npm run dev`, ensure `OPENROUTER_API_KEY` is set (embeddings via OpenRouter). Open `/voice-chat`.

For each row, send the **user message** (text mode). Expect `find_similar_cases` (agent tool) or client-injected card; verify top results are sensible and “why matched” is not empty.

| # | User message (intent) | Expect relevant domains / cases |
|---|------------------------|----------------------------------|
| 1 | We build a B2B SaaS for account-based marketing and sales teams. What’s the closest thing you’ve done? | Martech & Sales / RevvedUp |
| 2 | AI banking app where users can speak to apply for a loan | Fintech + AI / voice-ui-banking |
| 3 | Warehouse tool to reconcile inventory with photos and less manual work | Logistics / inventory-management |
| 4 | Wealth dashboard for advisors and clients, multi-role | Fintech / wealth-management |
| 5 | Telehealth MVP for investors, need UX concepts | Digital Health / telehealth or healthcare-data-mvp |
| 6 | Grocery delivery across multiple chains | E-commerce / grocery-delivery |
| 7 | HR marketplace matching employers and recruiters | HR Tech / recruitment-marketplace |
| 8 | Fitness app with gamification, mobile-first | Lifestyle & Sport / fitness-app |
| 9 | Podcast or audio social network | Media / podcast-app |
|10 | Internal Slack ticketing / kanban for IT support | Professional Services / support-ticket |

**Failure modes**

- No `OPENROUTER_API_KEY`: matching should still run (keyword/industry fallback); banner should say embeddings unavailable.
- Empty `product_description` from agent: assistant should ask for a short summary and call the tool again.
- During estimate panel: tool should defer (stay in estimate mode).

**ElevenLabs dashboard**

Register client tool `find_similar_cases` with parameter `product_description` (string, required) so the agent can call it in voice mode — mirrored in `src/config/elevenLabsTools.ts`.
