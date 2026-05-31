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
