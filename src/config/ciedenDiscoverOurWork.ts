/**
 * Canonical portfolio listing on cieden.com — keep in sync with public marketing copy.
 * @see https://cieden.com/discover-our-work
 */
export const CIEDEN_DISCOVER_OUR_WORK_URL = "https://cieden.com/discover-our-work";

export const CIEDEN_PORTFOLIO_SOURCE_BLURB = `
Official portfolio and full case stories live on Cieden's website: ${CIEDEN_DISCOVER_OUR_WORK_URL}

Intro (Discover our work):
"We are proud to share success stories from our valued customers, showcasing our expertise in building complex B2B applications. Built on real projects and real client feedback."

When the user asks what you did for a client, or for work similar to their product:
- Prefer calling the find_similar_cases tool so the UI shows matched cases plus long-form excerpts from the case pages when available.
- Answer using ONLY facts present in the tool payload (titles, descriptions, match reasons, narrative excerpts) and the official case URLs. If an excerpt is missing, say so and point to the case URL on cieden.com.
`.trim();
