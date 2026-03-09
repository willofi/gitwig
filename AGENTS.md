# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React renderer code (UI, store, utilities).
  - `components/`: feature UI (`CommitGraph`, `Sidebar`, `CommitDetail`, `StagingArea`, `ConflictEditor`, `Common`, `Toolbar`).
  - `store/`: Zustand state (`repoStore.ts`) and refresh/logging flows.
  - `utils/`, `types/`, `contexts/`: shared logic, type contracts, theme context.
- `electron/`: Electron main/preload and Git IPC handlers.
  - `main.ts`: window lifecycle and updater wiring.
  - `preload.ts`: safe API bridge exposed as `window.electronAPI`.
  - `git/gitService.ts`: Git command handlers (simple-git).
- `build/`: icon and packaging assets. `dist/` and `dist-electron/` are build outputs.

## Build, Test, and Development Commands
- `npm run dev`: start Vite dev server for local development.
- `npm run preview`: preview built renderer bundle.
- `npm run build`: run `tsc`, build renderer/main/preload, then package with electron-builder.
- `npm run release`: same as build + publish flow.

## Coding Style & Naming Conventions
- Language: TypeScript + React function components.
- Use 2-space indentation and semicolons, matching existing files.
- Components/hooks/types: `PascalCase`; functions/variables: `camelCase`; constants: `UPPER_SNAKE_CASE`.
- Prefer path alias imports (`@/...`) over deep relative imports.
- Keep renderer-main contracts typed in `src/types/git.types.ts`; avoid introducing new `any`.

## Testing Guidelines
- No dedicated test runner is configured yet.
- Minimum validation before PR:
  - `npm run build` passes.
  - Manually verify key workflows: project open, log refresh/filter, branch actions, staging/commit, diff view.
- When adding tests later, colocate as `*.test.ts` / `*.test.tsx` near the target module.

## Commit & Pull Request Guidelines
- Follow conventional-style commits used in history: `feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`, `docs(scope): ...`, `chore(scope): ...`.
- Keep commits focused and atomic (one behavior change per commit).
- PRs should include:
  - concise summary and rationale,
  - impacted areas (e.g., `src/store`, `electron/git`),
  - manual test notes,
  - screenshots/GIFs for UI changes.

## Security & Configuration Tips
- Preserve `contextIsolation: true` and `nodeIntegration: false` in BrowserWindow.
- Expose new Electron APIs only through `preload.ts` with explicit typing.
- Validate file-path inputs for IPC handlers that touch the filesystem.
