import { decrypt, encrypt, hasInvalidChars, isValidKey, isValidText } from "./vigenere";

describe("hasInvalidChars", () => {
  it("returns false for an empty string", () => {
    expect(hasInvalidChars("")).toBe(false);
  });

  it("returns false for a valid string", () => {
    expect(hasInvalidChars("Hello World! 123")).toBe(false);
  });

  it("returns false for a string with a line break", () => {
    expect(hasInvalidChars("line one\nline two")).toBe(false);
  });

  it("returns true for a string with an unsupported character", () => {
    expect(hasInvalidChars("hello€world")).toBe(true);
  });

  it("returns true when the unsupported character is the only one", () => {
    expect(hasInvalidChars("€")).toBe(true);
  });
});

describe("isValidKey", () => {
  it("returns true for a valid key", () => {
    expect(isValidKey("a valid key", "a valid key")).toBe(true);
  });

  it("returns false if key is less than 2 chars", () => {
    expect(isValidKey("k", "k")).toBe(false);
  });

  it("returns false for non matching keys", () => {
    expect(isValidKey("a valid key", "wrong confirmation")).toBe(false);
  });

  it("returns false if key contains not supported chars", () => {
    expect(isValidKey("an invalid k€y", "an invalid k€y")).toBe(false);
  });
});

describe("isValidText", () => {
  it("returns true for a valid text", () => {
    expect(isValidText("a valid text")).toBe(true);
  });

  it("returns false if text contains not supported chars", () => {
    expect(isValidText("an invalid t€xt")).toBe(false);
  });
});

describe("encrypt", () => {
  it("throws an error if key contains not supported chars", () => {
    expect(() => encrypt("a valid text", "an invalid k€y")).toThrow(
      "Invalid key"
    );
  });

  it("throws an error if key is less than 2 chars", () => {
    expect(() => encrypt("a valid text", "k")).toThrow("Invalid key");
  });

  it("throws an error if text contains not supported chars", () => {
    expect(() => encrypt("an invalid t€xt", "a valid key")).toThrow(
      "Invalid text"
    );
  });

  it("encrypts a text", () => {
    expect(encrypt("abcd", " !")).toBe("acce");
    expect(encrypt("A real message with a\nline break.", "My $3cr3t k3y")).toBe(
      "nyritHrÄRsWtY+ywm Drt\nlMÖWMTritGÄ"
    );
  });
});

describe("decrypt", () => {
  it("throws an error if key contains not supported chars", () => {
    expect(() => decrypt("a valid text", "an invalid k€y")).toThrow(
      "Invalid key"
    );
  });

  it("throws an error if key is less than 2 chars", () => {
    expect(() => decrypt("a valid text", "k")).toThrow("Invalid key");
  });

  it("throws an error if cipher contains not supported chars", () => {
    expect(() => decrypt("an invalid ciph€r", "a valid key")).toThrow(
      "Invalid cipher"
    );
  });

  it("decrypts a cipher", () => {
    expect(decrypt("acce", " !")).toBe("abcd");
    expect(decrypt("nyritHrÄRsWtY+ywm Drt\nlMÖWMTritGÄ", "My $3cr3t k3y")).toBe(
      "A real message with a\nline break."
    );
  });
});
