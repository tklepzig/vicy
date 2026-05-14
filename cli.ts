#!/usr/bin/env node
import { isValidKey, isValidText, encrypt, decrypt } from "./vigenere.ts";

// @ts-ignore
if (typeof window === "undefined") {
  const [mode, key, keyConfirm, textOrCipher] = process.argv.slice(2);

  if (!mode || !key || !keyConfirm || !textOrCipher) {
    console.log("Usage: cli.ts [e|d] <key> <key> <text>");
    console.log("  e - Encrypt");
    console.log("  d - Decrypt");
    process.exit(1);
  }

  if (!isValidKey(key, keyConfirm)) {
    console.log("Error: Invalid key");
    process.exit(1);
  }
  if (!isValidText(textOrCipher)) {
    console.log("Error: Invalid text or cipher");
    process.exit(1);
  }

  if (mode === "e") {
    console.log(encrypt(textOrCipher, key));
  } else if (mode === "d") {
    console.log(decrypt(textOrCipher, key));
  }
}
