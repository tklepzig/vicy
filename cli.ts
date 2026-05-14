#!/usr/bin/env node
import { isValidKey, isValidText, encrypt, decrypt } from "./vigenere.ts";
import * as readline from "node:readline";

const readHidden = (prompt: string): Promise<string> =>
  new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    let value = "";
    const onData = (buf: Buffer) => {
      const char = buf.toString();
      if (char === "\r" || char === "\n") {
        process.stdin.removeListener("data", onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(value);
      } else if (char === "") {
        process.exit();
      } else if (char === "") {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    process.stdin.on("data", onData);
  });

const readLine = (prompt: string): Promise<string> =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

const [mode, textArg] = process.argv.slice(2);

if (mode !== "e" && mode !== "d") {
  console.log("Usage: cli.ts [e|d] [text]");
  console.log("  e - Encrypt");
  console.log("  d - Decrypt");
  console.log("  text - optional; prompted interactively if omitted");
  process.exit(1);
}

const key = await readHidden("Key: ");
const keyConfirm = await readHidden("Confirm Key: ");

if (!isValidKey(key, keyConfirm)) {
  console.error("Error: Invalid key (min. 2 chars, both entries must match)");
  process.exit(1);
}

const textOrCipher = textArg ?? await readLine(mode === "e" ? "Text: " : "Cipher: ");

if (!isValidText(textOrCipher)) {
  console.error("Error: Invalid input");
  process.exit(1);
}

console.log(mode === "e" ? encrypt(textOrCipher, key) : decrypt(textOrCipher, key));
