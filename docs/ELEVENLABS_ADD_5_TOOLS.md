# Як додати 5 нових Cieden tools у ElevenLabs

У дашборді зараз **5** client tools. У коді вже є ще **5** (з інтерактивними картками). Щоб вони з’явились у списку агента — їх треба додати.

## Варіант 1: Скрипт (рекомендовано)

У корені проєкту (де є `.env.local`):

```bash
node scripts/add-cieden-tools-only.mjs
```

Потрібно в `.env.local`:
- `ELEVENLABS_API_KEY`
- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`

Після успіху оновіть сторінку в ElevenLabs → Agents → Cieden assistant → Tools — має з’явитись 10 client tools.

---

## Варіант 2: Вручну в дашборді

Якщо скрипт не додає (наприклад API не підтримує add-tool), додайте кожен tool вручну.

**Agents → Cieden assistant → Tools → Add tool → Client tool.** Для кожного з нижче: **Name** = як у таблиці, **Description** = текст з таблиці, **Parameters** можна порожні (або з `tool_configs/*.json`).

| Name | Description |
|------|-------------|
| `show_about` | Show information about Cieden: who we are, services, industries, design vs development. Use when the user asks what Cieden does, who we are, which industries we serve, or whether we do design only or also development. |
| `show_process` | Show Cieden's design process and timeline: stages, team, communication. Use when the user asks about our process, workflow, stages, timeline, or how we work. |
| `show_getting_started` | Show how to start a project with Cieden: first steps, book a call, contact. Use when the user asks how to begin, what is the first step, or wants to book a call or get in touch. |
| `show_case_details` | Show one Cieden case study by id or by industry. Use when the user asks for a specific case, cases in their industry, or details of one project. Pass id (e.g. sitenna, lykon) or filter (e.g. fintech, healthcare) to narrow. |
| `show_support` | Show Cieden post-delivery and support: deliverables, Figma files, prototypes, design system, retainer. Use when the user asks about after launch, file formats, support, or ongoing work. |

Після збереження агент зможе викликати ці tools, а застосунок покаже відповідні **інтерактивні картки** (About, Process, Getting Started, Case details, Support).

---

## Що вже є в коді (картки)

- **About** — `AboutCiedenCard` (хто ми, послуги, індустрії, design vs dev).
- **Process** — `ProcessTimelineCard` (етапи, терміни, команда, комунікація, discovery).
- **Getting started** — `GettingStartedCard` (кроки + Book a call).
- **Case details** — `CaseDetails` (один кейс по id або filter).
- **Support** — `SupportCard` (після здачі, файли, ретейнер).

Вони вже підключені: коли агент викликає tool, у чаті з’являється картка. Потрібно лише додати ці 5 tools у конфіг агента в ElevenLabs (скриптом або вручну).
