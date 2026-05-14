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
./cli.ts e   # encrypt
./cli.ts d   # decrypt
```

Key and text are prompted interactively; key input is hidden.

## Deploy

Pushes to `master` automatically deploy to GitHub Pages via GitHub Actions.
