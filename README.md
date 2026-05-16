# Vicy

A Vigenère cipher PWA — encrypt and decrypt text in the browser. Works offline once visited.

## Development

```bash
npm install
npm start       # dev server at http://localhost:8080
```

## Build

```bash
npm run build   # compiles TypeScript and SCSS
```

## CLI

```bash
./cli.ts e [text]    # encrypt
./cli.ts d [cipher]  # decrypt
```

Key is always prompted interactively with hidden input. Text/cipher can be passed as an argument or prompted interactively if omitted.

## Updating fonts

Fonts are self-hosted in `assets/fonts/` (Open Sans + Source Code Pro, latin subset only — sufficient for the full cipher alphabet including §ÄÖÜßäöü).
To pick up a new version from Google Fonts:

```bash
./scripts/update-fonts.sh
```

## Deploy

Pushes to `master` automatically deploy to GitHub Pages via GitHub Actions.
