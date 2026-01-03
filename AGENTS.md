# Repository Guidelines

## Project Structure & Module Organization
- `src/app` contains Next.js App Router entry points (`layout.tsx`, `page.tsx`, `globals.css`).
- `src/components` holds React components; reusable primitives live in `src/components/ui`.
- `src/lib` contains shared utilities and domain logic; `src/lib/comfy` models ComfyUI data.
- `public` stores static assets served by Next.js.
- Core configuration files include `next.config.ts`, `tsconfig.json`, `biome.json`, and `postcss.config.mjs`.

## Build, Test, and Development Commands
Use `pnpm` for all workflows:
- `pnpm dev` starts the local Next.js dev server.
- `pnpm build` creates a production build.
- `pnpm start` serves the production build locally.
- `pnpm lint` runs Biome lint checks.
- `pnpm format` formats the codebase with Biome.
- `pnpm typecheck` runs TypeScript checks without emitting output.

## Coding Style & Naming Conventions
- Indentation is 2 spaces; semicolons are added only when required by Biome.
- TypeScript + React only; keep React components in `.tsx` files.
- Component and hook exports use PascalCase and `useX` naming.
- File names are lowercase (e.g., `graph.tsx`, `objectInfo.ts`).
- Prefer `@/` path aliases (e.g., `@/components/ui/dialog`).

## Testing Guidelines
- There is no automated test runner configured yet.
- If you add tests, colocate under `src/**/__tests__` or use `*.test.ts(x)` naming.
- Add a `package.json` script to run new tests and document it in this file.
- Run `pnpm lint` and `pnpm typecheck` frequently.

## Commit & Pull Request Guidelines
- Recent commits use short, imperative summaries (e.g., "add backend info doc").
- Keep commits focused and scoped to one change.
- PRs should include a clear description of behavior changes, link related issues, and include screenshots or recordings for UI changes. See `CONTRIBUTING.md` for more details.

## Configuration & Local Setup
- The frontend expects a ComfyUI backend at `http://127.0.0.1:8188` by default.
- Override the backend URL with `NEXT_PUBLIC_COMFY_API_BASE` in `.env.local` when pointing at a different host.
