import { describe, expect, it } from "vitest";
import { isValidIsbn10, isValidIsbn13, normalizeIsbn, toIsbn13 } from "./isbn";

describe("isbn helpers", () => {
  it("normalizes input by removing separators", () => {
    expect(normalizeIsbn("978-0-451-52653-8")).toBe("9780451526538");
  });

  it("validates ISBN-10", () => {
    expect(isValidIsbn10("0451526538")).toBe(true);
    expect(isValidIsbn10("0451526537")).toBe(false);
  });

  it("validates ISBN-13", () => {
    expect(isValidIsbn13("9780451526538")).toBe(true);
    expect(isValidIsbn13("9780451526530")).toBe(false);
  });

  it("converts ISBN-10 to ISBN-13", () => {
    expect(toIsbn13("0451526538")).toBe("9780451526538");
  });
});
