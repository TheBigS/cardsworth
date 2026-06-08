# Cardsworth

**Create printable RPG item & character cards sized to standard Magic: The Gathering cards (63.5 × 88.9 mm).**

Design a card in the browser, write the front and back in Markdown, mask "unidentified" items, and download print-ready PNGs. Everything runs client-side — no account, no server, nothing leaves your machine.

🔗 **Live app: https://thebigs.github.io/cardsworth/**

---

## Features

- **Live card editor** — title, art, border color, font sizes, and Markdown body for the front and back faces, with a real-time preview.
- **Print-ready export** — download each face as a 750 × 1050 px PNG tagged at 300 DPI, so it prints at exactly 63.5 × 88.9 mm. Drop it into a layout and print at 100% scale.
- **Mask mode** — draw blackout zones over "unidentified" items and export a separate overlay layer to hide details until the party identifies them.
- **YAML import / export** — save a card to a portable YAML file and re-import it later to reprint or revise. Starter [templates](src/templates) are included.
- **Fully offline** — fonts are bundled; the app needs no network once loaded.

## Quick start

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173
```

Build a static bundle:

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

For the full dev setup — SPA hot-reload vs. running the render API, with Docker
and host workflows — see **[DEVELOPMENT.md](DEVELOPMENT.md)**.

## Self-hosting

Cardsworth also ships a small Express server (`server.ts`) that serves the built app and exposes an optional **headless render API** for generating cards programmatically.

```bash
docker compose up           # builds and serves at http://localhost:8080
```

### Headless render API (optional)

`POST /api/render` accepts a card's YAML/JSON and returns rendered front/back PNG data URLs using a headless browser. Beyond what the in-browser export already does (both produce 750 × 1050 px PNGs tagged at 300 DPI), it adds automatic reflow of overflowing content from front to back. The web UI does not require it — it's purely for automation/batch pipelines.

See **[docs/API.md](docs/API.md)** for the full reference, example workflows, and code recipes (curl / Node / Python), or [`openapi.yaml`](openapi.yaml) for the machine-readable contract.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the static app with `VITE_BASE=/cardsworth/` and publishes it to GitHub Pages. The `base` path defaults to `/` for local dev and self-hosting; change `VITE_BASE` (and the workflow) if you host under a different path or a custom domain.

## Tech stack

React 18 · TypeScript · Vite · `marked` (Markdown) · `html-to-image` (PNG export) · `js-yaml` · Express + Playwright + Sharp (optional render API).

## FAQ

### What is Cardsworth for?
It's a browser tool for designing and printing small reference cards for tabletop
RPGs — magic items, creatures, NPCs, quests, rumors, class/species features, or
anything else you want your players to hold in their hands at the table. You write
each face in Markdown, tweak the art and styling, and export print-ready PNGs.

### Is it tied to any specific game system?
No. Cardsworth doesn't know or care about any particular ruleset — every card is
just free-form Markdown plus an image. The starter templates use generic fantasy
RPG conventions (stat blocks, features, quests), but you can delete them and write
cards for any system, genre, or homebrew you like.

### Is this affiliated with Wizards of the Coast, *Dungeons & Dragons*, or *Magic: The Gathering*?
No. Cardsworth is an unaffiliated, independent hobby project. *Magic: The Gathering*
is referenced only to describe a physical card size (63.5 × 88.9 mm) so the exports
fit standard sleeves — it isn't a Magic product. All trademarks belong to their
respective owners.

### Does anything I make get uploaded to a server?
No. The web app runs entirely client-side — your text, images, and exported PNGs
never leave your browser. There's no account and no tracking. (The optional
self-hosted render API is the only component that processes cards server-side, and
only you run it.)

### Why are the cards 63.5 × 88.9 mm?
That's the standard "poker"/trading-card size, the same as a *Magic: The Gathering*
card, so finished cards drop straight into widely available sleeves and deck boxes.
Exports are 750 × 1050 px PNGs tagged at 300 DPI.

### How do I actually print them?
Export the front (and back) PNGs, drop them into any layout tool or document, and
print at 100% scale (no "fit to page" scaling) on cardstock. Because the files are
tagged at 300 DPI, they come out at the exact physical size. A guillotine trimmer
or corner punch helps with the finishing.

### What is "mask mode" for?
It lets you paint blackout zones over parts of a card — handy for "unidentified"
items or secrets — and export a separate overlay layer. You can reveal the hidden
details to your players later without redesigning the card.

### Do I need the server / render API?
No. The full editor and PNG export work entirely in the browser. The Express +
Playwright render API is optional and only useful if you want to generate cards
programmatically or in batches. See [docs/API.md](docs/API.md).

### Can I use Cardsworth (and the cards I make) commercially?
The Cardsworth software is licensed under Apache 2.0, so you're free to use, modify,
and self-host it, including commercially. The *content* you put on your cards is
yours and your responsibility — make sure you have the rights to any text or art
you add, especially if you publish or sell what you create.

### How do I save and reload a card?
Use YAML export to download a card as a small portable file, then re-import it later
to reprint or revise. The format is documented in [openapi.yaml](openapi.yaml).

### Is this written by AI?
Yeah — Claude did a lot of the heavy lifting. I'm a software developer with 20+ 
years of experience, and this is a hobby project. I've deliberately kept the
`Co-Authored-By: Claude` line in the commit messages, because this wasn't purely
hand-written code and I don't want any confusion about what I wrote versus what
the AI did. For me, Claude makes hobby projects like this possible — but I 
completely understand if you feel differently and choose not to use it. I built
this for my own group of players, and I'm sharing it for free in case it helps 
someone else out.

## License

[Apache License 2.0](LICENSE)


---

<p align="center">Built with ❤️ for the D&D community</p>

