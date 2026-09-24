# CLAUDE.md — Nexus (Internal Company Platform PoC)

## What this is
A PoC internal company web platform: People Discovery, Project Experience, Skill Matching,
Resource & Budget Planning for a fictional ~150-person tech/telco/cloud consulting company.
**Not** a project-management/ticketing tool. See git history / commit messages for the full
original spec if scope questions come up.

## Stack
- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4 + shadcn/ui.
- shadcn here targets **Base UI**, not Radix — different API in several places (no `asChild`,
  nullable `onValueChange`, `SelectValue` label quirks, `Menu.GroupLabel` nesting requirement).
  Read the quirks before touching any shadcn-based interactive component.
- All app data is client-side: a generated demo dataset (`scripts/generate-data.mjs` →
  `src/lib/data/generated/*.json`) loaded into a Zustand store (`src/store/app-store.ts`,
  persisted to localStorage). No backend/DB — deliberate PoC simplification.
- Role-based views (`user` / `management` / `admin`) are switchable live from the sidebar
  footer dropdown (no real auth) — stands in for future SSO.

## Local server
- `npm run dev` — Next.js dev server, prints its own URL (currently `http://localhost:3000`).
- Don't start a second instance if one is already running.

## Screenshot workflow
- Puppeteer is a local devDependency. Chrome binary cache is shared at `C:/Users/alexs/.cache/puppeteer/`.
- Always screenshot from localhost: `node screenshot.mjs http://localhost:3000/<route> [label]`.
- Screenshots save to `./temporary screenshots/screenshot-N[-label].png` (auto-incremented).
- **Interactive components must be click-tested in a real browser before calling them done** —
  `tsc --noEmit` passing is not sufficient proof a Base UI component works; several bugs here
  (crashing dropdown, mis-wired Select) only surfaced via Puppeteer + a `pageerror`/console
  listener, not the type checker. See the memory note on Base UI quirks for specifics.

## Regenerating demo data
`node scripts/generate-data.mjs` — deterministic (seeded RNG), anchors all dates/allocations to
the real current date so the dataset stays plausible whenever it's regenerated. If you change the
generation logic, sanity-check the resulting `resource-allocations.json` distribution (most
person-months should land 50–100%; overallocation should be the exception, not routine) before
assuming it's fine — this broke once (independent per-project generation → 150%+ everywhere) and
needed a normalization pass.

## Design tokens
- Brand palette pulled from COCUS's live CSS: navy `#2C2F3A`, orange `#FF961E`, amber `#FDB42E`,
  slate `#424D68`/`#747B95`. Typography: Sora (headings) + Inter (body).
- Allocation-status colors (`--status-under/healthy/full/over` in `globals.css`) are validated
  against the dataviz skill's palette validator (CVD-safe, lightness-banded) for both light and
  dark surfaces — don't hand-edit those hex values without re-running the validator.

## Conventions
- Relational query/join helpers live in `src/lib/data/queries.ts` and `src/lib/data/capacity.ts`
  (allocation/month math) — extend those rather than re-deriving joins ad hoc in components.
- All mutations go through Zustand store actions (`src/store/app-store.ts`), never direct state
  mutation in components.
- Management/admin-only routes are wrapped in `<RoleGate allow={[...]}>` (`src/components/shared/role-gate.tsx`).
