# Development

Cardsworth has two parts that run differently in development:

- **The SPA** — the React/Vite web app. This is what 99% of work touches, and it
  runs with hot-reload via the Vite dev server.
- **The render API** — an Express + Playwright server (`server.ts`) that renders
  cards headlessly. It's optional, heavier, and does **not** hot-reload the UI.

Pick the path that matches what you're working on.

| Port   | What runs there                          | Started by                          |
| ------ | ---------------------------------------- | ----------------------------------- |
| `5173` | Vite dev server (SPA + HMR, **no API**)  | `npm run dev` / dev compose         |
| `8080` | `server.ts` (built SPA **and** the API)  | `npm start` / prod compose          |

---

## Prerequisites

- **Node 20+** and npm.
- **Docker** (optional) — for running either part in a container.
- **Playwright Chromium** (only for API work on the host) — installed on demand,
  see [API development](#api-development).

```bash
npm install
```

---

## SPA development (the common path)

This is what you want for any UI, styling, editor, card, mask, or import/export
work. You get hot module reload and instant feedback.

### Local

```bash
npm run dev          # Vite dev server at http://localhost:5173
```

Edit anything under `src/` and the browser updates live.

### Docker

```bash
docker compose -f docker-compose.dev.yml up
# Vite dev server at http://localhost:5173
```

The dev container (`Dockerfile.dev`, `node:20-alpine`) mounts `src/`,
`index.html`, and `public/` as volumes, so edits on the host hot-reload inside
the container.

> **Changed a dependency? Rebuild the image.** `node_modules` lives *inside* the
> image (installed by `npm ci` at build time) — it is **not** a mounted volume.
> So source edits hot-reload, but adding/removing/upgrading a package in
> `package.json` won't be seen until you rebuild:
>
> ```bash
> docker compose -f docker-compose.dev.yml up --build
> ```
>
> Symptom if you forget: Vite errors like `Failed to resolve import "<pkg>"`
> even though the package is installed on the host.

> **The render API is not available in this mode**, and that's intentional:
> - The web UI never calls the API — card/overlay downloads happen in the
>   browser via `html-to-image`. So UI work doesn't need it.
> - The dev image is Alpine and has no Chromium/Playwright system libraries.
> - The API can only render a *built* SPA (see below), so it can't reflect your
>   hot-reloaded changes anyway.
>
> If you need the API, use the [API development](#api-development) flow on `8080`
> alongside Vite on `5173`.

---

## API development

Work here only when you're changing `server.ts` — the render endpoint, the
reflow logic, image sizing, or mask overlays.

### Key concept (read this first)

`server.ts` serves the built SPA from `dist/` **and** exposes `/api/render`. The
render pool launches headless Chromium pages that navigate to the server's *own
served SPA* (`http://localhost:8080/`), inject card state, and screenshot it.

Two consequences:

1. You must **`npm run build` before the API will work** — it renders `dist/`,
   not your source.
2. The API renders the **last build**. If you change UI code, re-run
   `npm run build` for the API to reflect it. (Changes to `server.ts` itself
   don't need a rebuild — just restart the server.)

### Host (recommended for iterating on `server.ts`)

```bash
# One-time: install the headless browser + its system deps.
npx playwright install --with-deps chromium

npm run build              # build the SPA the API will serve + render
npx tsx watch server.ts    # restart server.ts on each save -> http://localhost:8080
```

`npm start` is the one-shot equivalent (`npm run build && tsx server.ts`) when
you don't need auto-restart.

While that's running on `8080`, you can still run `npm run dev` on `5173` in
another terminal for UI hot-reload — just remember to `npm run build` when you
want the API to pick up UI changes.

### Docker (prod-like, full container)

```bash
docker compose up --build
# server.ts (SPA + API) at http://localhost:8080
```

This builds the production image (`Dockerfile`: a `node` build stage + the
`mcr.microsoft.com/playwright` runtime). It's the most faithful test of what
ships, but the image is large (~1.5 GB) and rebuilds are slow — prefer the host
flow for fast iteration.

### Testing the API

```bash
curl -s http://localhost:8080/health
# {"status":"ok"}

curl -s -X POST http://localhost:8080/api/render \
  -H "Content-Type: application/json" \
  -d '{"version":1,"card":{"title":"Test","frontMarkdown":"Hello **world**"}}' \
  | head -c 120
```

Full reference, workflows, and curl/Node/Python recipes are in
[`docs/API.md`](docs/API.md); the contract is in [`openapi.yaml`](openapi.yaml).

---

## Build, lint, type-check

```bash
npm run build      # tsc -b && vite build  -> dist/
npm run preview    # serve the production build locally to sanity-check it
npm run lint       # eslint
```

`npm run build` runs the TypeScript project build (`tsc -b`) first, so it also
serves as the type-check.

---

## Environment variables

| Var                | Default | Used by    | Purpose                                                  |
| ------------------ | ------- | ---------- | -------------------------------------------------------- |
| `PORT`             | `8080`  | `server.ts`| Port the API/SPA server listens on.                      |
| `RENDER_POOL_SIZE` | `3`     | `server.ts`| Concurrent headless render pages.                        |
| `VITE_BASE`        | `/`     | build      | Base path. The Pages deploy sets `/cardsworth/`; leave unset for local dev and self-hosting. |

---

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the static
SPA with `VITE_BASE=/cardsworth/` and publishes it to GitHub Pages (no API — see
the deployment table in the [README](README.md)). Self-hosting the full app
(SPA + API) is `docker compose up`.
