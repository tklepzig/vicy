// Service worker entry. Behavior lives in @tklepzig/offline-kit; esbuild bundles
// it into sw.js at build time and injects __SW_MANIFEST (the precache list,
// globbed + hashed from the built assets). The /// reference pulls in the
// package's ambient type for that injected global — no hand-rolled declare.

/// <reference types="@tklepzig/offline-kit/global" />
import { createOfflineServiceWorker } from "@tklepzig/offline-kit/sw";

createOfflineServiceWorker({
  cacheName: "vicy-cache",
  precache: __SW_MANIFEST,
});
