# task-organizer

A family organiser app. A parent snaps a photo of a document (school circular, bill,
insurance paper, pollution certificate…) or records a voice note, and the app turns it into
reminders for the whole family, or files it as a record in the right category.

**Local-first and private:** records live encrypted on your devices. The server only relays
end-to-end encrypted messages between family members, and never stores photos or audio.
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

> Status: **Phase 1 – setup.** Only the project skeleton exists so far.

## Repository layout

| Folder     | What it holds                                       |
| ---------- | --------------------------------------------------- |
| `app/`     | The PWA (React + Vite). Runs on the phone.          |
| `backend/` | AWS Lambda handlers (Node.js, TypeScript).          |
| `infra/`   | AWS CDK code that creates all cloud resources.      |
| `shared/`  | Types and validation shared by the app and backend. |
| `docs/`    | Architecture notes and step-by-step setup guides.   |

## Prerequisites

- Node.js 22 (`nvm use` reads `.nvmrc`)
- pnpm 10 (`corepack enable` installs the version pinned in `package.json`)

## Everyday commands

Run these from the repository root:

```bash
pnpm install
```

```bash
pnpm --filter @task-organizer/app dev
```

```bash
pnpm test
```

```bash
pnpm run ci
```

`pnpm run ci` runs exactly what GitHub Actions runs on every pull request: format check, lint,
typecheck, tests and build. (`pnpm ci`, without `run`, is a reserved pnpm command.)

## Cost-related settings

All rate limits, log retention and per-family LLM caps live in one file:
[`infra/lib/config.ts`](infra/lib/config.ts). Every AWS resource is tagged with
`project=task-organizer` and `env=dev|prod` so costs can be filtered in Cost Explorer.

Deployment, AWS setup, teardown and bill-checking instructions will be added in the following
Phase 1 steps.
