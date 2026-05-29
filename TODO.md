# TODO

- **Deploy: drop `node_modules` from the Pages artifact.** `deploy.yml`
  currently uploads `path: .`, which tars `node_modules` (and `.git`) into the
  GitHub Pages artifact — wasteful and slow. Add `- run: rm -rf node_modules`
  after the `npm run build` step and before `actions/upload-pages-artifact`.
  (Trica already applies this; backport here to keep the two repos aligned.)
