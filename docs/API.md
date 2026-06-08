# Cardsworth Render API

The Cardsworth server exposes a small HTTP API that renders a card definition
into print-ready PNGs using a headless browser. It's handy for generating cards
programmatically — batch-rendering a deck, wiring card art into a pipeline, or
producing files from a script.

> **This API is optional.** It only exists when you self-host the Cardsworth
> server (`server.ts`, Express + Playwright). The hosted web app at
> <https://thebigs.github.io/cardsworth/> is a static client and does **not**
> use it. The browser "Download" buttons already produce the same 750 × 1050 px,
> 300 DPI PNGs — the API just adds automatic front→back reflow and lets you
> render without a browser.

A machine-readable contract lives in [`openapi.yaml`](../openapi.yaml) — import
it into Postman/Insomnia or generate a client from it.

---

## Running the server

```bash
docker compose up           # builds and serves at http://localhost:8080
# or, without Docker:
npm install
npm start                   # builds the app, then runs server.ts
```

| Env var            | Default | Purpose                                    |
| ------------------ | ------- | ------------------------------------------ |
| `PORT`             | `8080`  | Port the server listens on.                |
| `RENDER_POOL_SIZE` | `3`     | Concurrent headless render pages (workers).|

No authentication. Don't expose the server to the public internet without
putting your own auth/rate limiting in front of it — each render drives a real
browser.

---

## Endpoints

### `GET /health`

Liveness check. Returns `{ "status": "ok" }`.

### `POST /api/render`

Renders a card and returns its faces as PNG data URLs.

**Request body** — the Cardsworth card file, **JSON or YAML**. The server sniffs
the format (JSON is valid YAML), so the `Content-Type` header isn't enforced.
The shape is identical to the file the web app imports/exports.

```yaml
version: 1            # required, must be ≤ 1
card:                 # required
  title: "Tome of Forbidden Lore"
  frontMarkdown: |
    **Rare Artifact** — *Cursed*

    # Properties
    - +3 to Intelligence
    - *Glows faintly in darkness*
  backMarkdown: |
    # Lore
    Discovered in the **Ruins of Valdris**.
  borderColor: "#540000"
  titleFontSize: 18
  bodyFontSize: 11
  autoReflow: true    # optional — move overflow to the back
```

**Card fields** (all optional; defaults applied when omitted):

| Field           | Type             | Default     | Notes                                            |
| --------------- | ---------------- | ----------- | ------------------------------------------------ |
| `title`         | string           | `""`        |                                                  |
| `imageEnabled`  | boolean          | `true`      | Show the art area.                               |
| `imageDataUrl`  | string \| null   | `null`      | Base64 art, e.g. `data:image/png;base64,...`.    |
| `imageCropY`    | number           | `50`        | Vertical crop offset, 0–100 (%).                 |
| `imagePadding`  | boolean          | `false`     |                                                  |
| `frontMarkdown` | string           | `""`        | Front body (Markdown).                           |
| `backMarkdown`  | string           | `""`        | Back body (Markdown).                            |
| `borderColor`   | string           | `"#540000"` | Hex color.                                       |
| `titleFontSize` | number           | `18`        | px.                                              |
| `bodyFontSize`  | number           | `11`        | px.                                              |
| `autoReflow`    | boolean          | `false`     | Move overflowing front content to the back.      |
| `masks`         | MaskZone[]       | `[]`        | Blackout cut regions (see below).                |

**MaskZone** — a blackout region in millimetres from the card's top-left.
`x`, `y`, `width`, `height` are required; `width`/`height` must be > 0. Invalid
zones are silently dropped rather than failing the render.

| Field    | Type                | Default     |
| -------- | ------------------- | ----------- |
| `id`     | string              | array index |
| `face`   | `"front"`\|`"back"` | `"front"`   |
| `x`      | number (mm)         | —           |
| `y`      | number (mm)         | —           |
| `width`  | number (mm)         | —           |
| `height` | number (mm)         | —           |
| `label`  | string              | —           |

**Response `200`** — `RenderResult`:

```jsonc
{
  "front": "data:image/png;base64,iVBORw0KGgo...",   // 750×1050, 300 DPI
  "back":  "data:image/png;base64,iVBORw0KGgo...",
  "reflow": {
    "needed": true,            // did the front overflow?
    "overflowPx": 42,          // hidden px on the front (debug)
    "splitAfterBlock": 2,      // 0-indexed block kept on front; -1 = nothing fit
    "suggestedFront": "...",   // markdown that fits on the front
    "suggestedBack": "...",    // markdown moved to the back
    "backOverflow": false      // true => back still overflows (not auto-fixable)
  },
  "overlay": {                 // present only when the card has masks
    "front": "data:image/png;base64,...",
    "back":  "data:image/png;base64,..."
  }
}
```

`reflow` is always present and describes overflow whether or not `autoReflow`
was set — with `autoReflow: false` it's a *report*; with `true` the returned
images already reflect the split.

**Errors** — `400` for a missing/unparseable/invalid body, `500` for a render
failure. Both return `{ "error": "message" }`.

---

## Workflows

### 1. Render a card file to PNGs

Decode the data URLs straight to files with `jq` + `base64`:

```bash
curl -s --data-binary @card.yaml http://localhost:8080/api/render > out.json

jq -r '.front | sub("^data:image/png;base64,";"")' out.json | base64 -d > front.png
jq -r '.back  | sub("^data:image/png;base64,";"")' out.json | base64 -d > back.png
```

### 2. Detect overflow, then reflow

Render once to *report* overflow, and only reflow if needed:

```bash
# First pass: autoReflow off — just inspect the report.
curl -s --data-binary @card.yaml http://localhost:8080/api/render \
  | jq '.reflow.needed'
# => true

# Second pass: add autoReflow so overflow moves to the back automatically.
# (Edit card.yaml to set `autoReflow: true`, or send JSON with the flag.)
```

If `reflow.backOverflow` comes back `true`, the content is too long even after
the split — shrink `bodyFontSize` or trim the Markdown.

### 3. Batch-render a deck

Render every YAML file in a folder to a `png/` directory:

```bash
mkdir -p png
for f in deck/*.yaml; do
  name=$(basename "$f" .yaml)
  curl -s --data-binary @"$f" http://localhost:8080/api/render \
    | jq -r '.front | sub("^data:image/png;base64,";"")' \
    | base64 -d > "png/$name-front.png"
  echo "rendered $name"
done
```

### 4. Render an "unidentified" item with a mask overlay

Include `masks` and use the `overlay.*` outputs as the printed blackout layer:

```jsonc
{
  "version": 1,
  "card": {
    "title": "Unidentified Wand",
    "frontMarkdown": "A slender rod of pale wood.",
    "masks": [
      { "face": "front", "x": 6, "y": 40, "width": 51, "height": 30, "label": "stats" }
    ]
  }
}
```

The response includes `overlay.front` (and `overlay.back` if that face has
zones) — print it, cut it out, and lay it over the finished card.

---

## Code recipes

### curl

```bash
curl -s -X POST http://localhost:8080/api/render \
  -H "Content-Type: application/json" \
  -d '{"version":1,"card":{"title":"Healing Potion","frontMarkdown":"Restores **2d4+2** HP."}}'
```

### Node (fetch)

```js
import { readFile, writeFile } from "node:fs/promises";

const body = await readFile("card.yaml", "utf8"); // JSON also works
const res = await fetch("http://localhost:8080/api/render", {
  method: "POST",
  headers: { "Content-Type": "application/yaml" },
  body,
});
if (!res.ok) throw new Error((await res.json()).error);

const { front, back, reflow } = await res.json();
if (reflow.needed) console.warn("front overflowed:", reflow.overflowPx, "px");

const toBuf = (dataUrl) =>
  Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
await writeFile("front.png", toBuf(front));
await writeFile("back.png", toBuf(back));
```

### Python (requests)

```python
import base64, requests

card = {
    "version": 1,
    "card": {
        "title": "Scroll of Fireball",
        "frontMarkdown": "Deals **8d6** fire damage in a 20-ft radius.",
        "autoReflow": True,
    },
}

r = requests.post("http://localhost:8080/api/render", json=card)
r.raise_for_status()
data = r.json()

for face in ("front", "back"):
    raw = data[face].split(",", 1)[1]          # strip the data: prefix
    with open(f"{face}.png", "wb") as fh:
        fh.write(base64.b64decode(raw))

print("reflow needed:", data["reflow"]["needed"])
```

---

## Notes

- **Output size**: every face is 750 × 1050 px tagged at 300 DPI — exactly
  2.5 × 3.5 in (63.5 × 88.9 mm). Print at 100% scale, never "fit to page".
- **Fonts**: bundled with the server, so rendering is deterministic and offline.
- **Concurrency**: requests share a fixed pool of `RENDER_POOL_SIZE` pages;
  bursts beyond that queue rather than failing.
