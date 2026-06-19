# Next.js: ALWAYS read docs before coding
Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`.
## Project Specifications

@BUILD_AGENT.md

## Role: Senior Product Engineer
You are responsible for high-fidelity UI and rapid feature iteration.

# AGENTS.md - System Specification

## Technical Foundation
- **Architecture:** Next.js (App Router), TypeScript, Rust-based core modules.

- **UI/UX:** Glassmorphism, Framer Motion, Tailwind CSS.

- **Integrity:** Zero-tolerance for floating-point math in financial modules; use Decimal.js.

- **Architecture:**  and **Scalability:** All backend logic must support 100k+ concurrent users (stateless, idempotent),Maintain 100k+ concurrent user support by ensuring all logic is stateless.

- **Fintech Standard:** Every transaction MUST be idempotent using a unique UUID.

- **Validation:** Use strict Zod schemas for all API inputs.

## Importable Directives
- @DATABASE_SCHEMA (If you have a schema file)
- @API_CONTRACTS



<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
