// UI layer for Vicy. Plugs into the pure cipher in vigenere.ts. Previously this
// lived as inline <script> blocks in index.html; it's a module now so the family
// shares one host shape (a compiled ui.ts) and the code is type-checked.

import {
  decrypt,
  encrypt,
  hasInvalidChars,
  isValidKey,
  isValidText,
} from "./vigenere.js";

// --- elements -------------------------------------------------------------

const compoundCommands = document.querySelector(
  ".compound-commands",
) as HTMLElement;
const key = document.getElementById("key") as HTMLInputElement;
const keyConfirm = document.getElementById("key-confirm") as HTMLInputElement;
const text = document.getElementById("text") as HTMLTextAreaElement;
const cipher = document.getElementById("cipher") as HTMLTextAreaElement;
const encryptBtn = document.getElementById("encrypt-btn") as HTMLButtonElement;
const decryptBtn = document.getElementById("decrypt-btn") as HTMLButtonElement;
const keyHint = document.getElementById("key-hint") as HTMLElement;
const textHint = document.getElementById("text-hint") as HTMLElement;
const cipherHint = document.getElementById("cipher-hint") as HTMLElement;
const copyBtn = document.getElementById("copy-btn") as HTMLButtonElement;
const keyToggleBtn = document.getElementById("key-toggle-btn") as HTMLButtonElement;
const keyCollapsible = document.getElementById("key-collapsible") as HTMLElement;
const offlineStatusEl = document.getElementById("offline-status") as HTMLElement;

// --- responsive command rail ----------------------------------------------

const mobileQuery = window.matchMedia("(max-width: 640px)");
const updateToggleLayout = (): void => {
  compoundCommands.classList.toggle("vertical", !mobileQuery.matches);
};
mobileQuery.addEventListener("change", updateToggleLayout);
updateToggleLayout();

// --- cipher UI ------------------------------------------------------------

type Mode = "encrypt" | "decrypt";

let mode: Mode = "encrypt";
let keyConfirmBlurred = false;
let keyCollapsed = false;

const collapseKey = (collapsed: boolean, animated = true): void => {
  if (!animated) keyCollapsible.style.transition = "none";
  keyCollapsed = collapsed;
  keyCollapsible.classList.toggle("collapsed", collapsed);
  keyToggleBtn.classList.toggle("is-active", !collapsed);
  keyToggleBtn.classList.toggle(
    "key-set",
    collapsed && isValidKey(key.value, keyConfirm.value),
  );
  if (!animated)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => (keyCollapsible.style.transition = "")),
    );
};

keyToggleBtn.addEventListener("click", () => collapseKey(!keyCollapsed));

const setMode = (newMode: Mode): void => {
  mode = newMode;
  encryptBtn.classList.toggle("is-active", mode === "encrypt");
  decryptBtn.classList.toggle("is-active", mode === "decrypt");
  copyBtn.hidden = true;
  recalculate();
};

const recalculate = (): void => {
  const keyValid = isValidKey(key.value, keyConfirm.value);

  const keyHasBadChars =
    (key.value.length > 0 && hasInvalidChars(key.value)) ||
    (keyConfirm.value.length > 0 && hasInvalidChars(keyConfirm.value));

  if (keyHasBadChars) {
    keyHint.textContent = "Key contains invalid characters";
    keyHint.hidden = false;
  } else if (!keyConfirmBlurred) {
    keyHint.hidden = true;
  } else if (key.value.length < 2) {
    keyHint.textContent = "Key too short (min. 2 chars)";
    keyHint.hidden = false;
  } else if (key.value !== keyConfirm.value) {
    keyHint.textContent = "Keys don't match";
    keyHint.hidden = false;
  } else {
    keyHint.hidden = true;
  }

  encryptBtn.disabled = !keyValid;
  decryptBtn.disabled = !keyValid;
  text.readOnly = !keyValid || mode === "decrypt";
  cipher.readOnly = !keyValid || mode === "encrypt";

  if (mode === "encrypt") {
    cipher.value =
      keyValid && isValidText(text.value) ? encrypt(text.value, key.value) : "";
  } else {
    text.value =
      keyValid && isValidText(cipher.value)
        ? decrypt(cipher.value, key.value)
        : "";
  }

  const textHasBadChars =
    !text.readOnly && text.value.length > 0 && hasInvalidChars(text.value);
  textHint.textContent = textHasBadChars ? "Contains invalid characters" : "";
  textHint.hidden = !textHasBadChars;

  const cipherHasBadChars =
    !cipher.readOnly && cipher.value.length > 0 && hasInvalidChars(cipher.value);
  cipherHint.textContent = cipherHasBadChars
    ? "Contains invalid characters"
    : "";
  cipherHint.hidden = !cipherHasBadChars;

  const output = mode === "encrypt" ? cipher : text;
  copyBtn.hidden = output.value.length === 0;
  if (keyValid) sessionStorage.setItem("vicy_key", key.value);
  keyToggleBtn.classList.toggle("key-set", keyCollapsed && keyValid);
};

const copyToClipboard = (button: HTMLButtonElement, content: string): void => {
  navigator.clipboard.writeText(content).then(() => {
    button.textContent = "Copied";
    setTimeout(() => (button.textContent = "Copy"), 1500);
  });
};

copyBtn.addEventListener("click", () => {
  const output = mode === "encrypt" ? cipher : text;
  copyToClipboard(copyBtn, output.value);
});

keyConfirm.addEventListener("blur", () => {
  keyConfirmBlurred = true;
  recalculate();
});
encryptBtn.addEventListener("click", () => setMode("encrypt"));
decryptBtn.addEventListener("click", () => setMode("decrypt"));
key.addEventListener("input", recalculate);
keyConfirm.addEventListener("input", recalculate);
text.addEventListener("input", recalculate);
cipher.addEventListener("input", recalculate);

// Pre-fill from sessionStorage on load (same-tab reload).
const sessionKey = sessionStorage.getItem("vicy_key");
if (sessionKey) {
  key.value = sessionKey;
  keyConfirm.value = sessionKey;
  keyConfirmBlurred = true;
}

setMode("encrypt");
collapseKey(!!sessionKey, false);
(sessionKey ? text : key).focus();

// --- offline-ready indicator ----------------------------------------------
// Tells the user, honestly, whether the app is fully cached and safe to use
// offline — so "is it installed?" becomes "wait for the green check" instead of
// the go-offline-and-see loop. The service worker owns the asset list and checks
// its own live cache (sw.js); this side just renders the verdict.

type OfflineReadyResult = { ready: boolean; missing: string[] };

// Ask the active SW over a one-shot MessageChannel. Resolves null if there's no
// worker yet or it doesn't answer in time (still warming up) — caller treats
// that as the in-progress "Caching…" state, not a failure.
const askServiceWorker = (
  worker: ServiceWorker,
): Promise<OfflineReadyResult | null> =>
  new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => resolve(null), 3000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      resolve(event.data as OfflineReadyResult);
    };
    worker.postMessage({ type: "CHECK_OFFLINE_READY" }, [channel.port2]);
  });

const setOfflineStatus = (
  state: "caching" | "ready" | "incomplete" | "unavailable",
  missing: string[] = [],
): void => {
  offlineStatusEl.classList.toggle("ready", state === "ready");
  offlineStatusEl.classList.toggle(
    "warn",
    state === "incomplete" || state === "unavailable",
  );
  offlineStatusEl.hidden = false;
  if (state === "ready") {
    offlineStatusEl.textContent = "✓ Offline ready";
  } else if (state === "incomplete") {
    const names = missing.map((url) => url.replace(/^\.\//, "")).join(", ");
    offlineStatusEl.textContent = `Offline cache incomplete — missing: ${names}`;
  } else if (state === "unavailable") {
    offlineStatusEl.textContent = "Service worker failed — offline unavailable";
  } else {
    offlineStatusEl.textContent = "Caching…";
  }
};

let registrationFailed = false;

const refreshOfflineStatus = async (): Promise<void> => {
  // sw.js failed to load/parse: offline genuinely won't work, and
  // navigator.serviceWorker.ready below would never resolve — report it rather
  // than await a worker that will never arrive.
  if (registrationFailed) {
    setOfflineStatus("unavailable");
    return;
  }
  // Only fall back to "Caching…" when we have no verdict yet, so a re-check that
  // times out can't downgrade a previously-correct "Offline ready".
  if (offlineStatusEl.hidden) setOfflineStatus("caching");
  const registration = await navigator.serviceWorker.ready;
  const worker = navigator.serviceWorker.controller ?? registration.active;
  if (!worker) return; // no active worker to query yet — leave current state
  const result = await askServiceWorker(worker);
  if (!result) return; // no answer in time — leave current state
  setOfflineStatus(result.ready ? "ready" : "incomplete", result.missing);
};

if ("serviceWorker" in navigator) {
  // Ask the browser to make our storage durable. Cache Storage is best-effort by
  // default — eviction under storage pressure is the "worked, then stopped
  // working offline" failure. Best-effort itself: ignored if denied.
  if (navigator.storage?.persist) void navigator.storage.persist();

  // Register the SW on load (here, not an inline script, so we can catch a
  // registration failure and surface it via the badge instead of leaving it
  // stuck on "Caching…").
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      registrationFailed = true;
      void refreshOfflineStatus();
    });
  });

  // A new build activating (skipWaiting + clients.claim) swaps the controller —
  // re-check so the badge reflects the fresh cache instead of going stale.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    void refreshOfflineStatus();
  });

  void refreshOfflineStatus();
} else {
  offlineStatusEl.hidden = true;
}
