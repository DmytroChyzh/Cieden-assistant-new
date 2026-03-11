## USD Migration Baseline Snapshot (pre-change)

- Lending defaults (cards & tool fallbacks) assume `loanAmount: 25000`, `currency: "INR"`, and EMI values around ₹2.5k, with formatting performed via `en-IN` locale and suffixes like `L`/`Cr`.
- ElevenLabs bridge handlers inject the same INR payloads for lending and EMI tools when parameters are missing, ensuring the `₹` symbol propagates through chat renderers.
- Quiz presets (`QuizMessage`, `QuizComponent`, `QuizProvider`) show ranges labelled in lakhs (e.g., `₹1 - 3 Lakhs`) and convert answers to strings containing `₹` in the summary stage.
- Orchestration tool tester (`app/orchestration/tools/page.tsx`) initializes balance/loan/EMI inputs in the tens of thousands (20k–100k) and therefore renders high INR-style payments during QA.
- Convex seed data (`convex/seedDocuments.ts`) seeds Ramesh Balkrishna Patil (Indian identity) with Indian driver’s license/passport metadata and portrait.
- Mock customer conversations and knowledge items (`lib/mock-data/customer-engagement.ts`, `components/customer-engagement/knowledge-management.tsx`) mention INR amounts, CIBIL scores, PAN/Aadhaar docs, and Indian market references.
- PII masking rules (`lib/utils/anonymization.ts`) explicitly capture `₹`/`Rs.` currency patterns and Indian address keywords, but do not yet cover US `$` amounts or SSN-style identifiers.

