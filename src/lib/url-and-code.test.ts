import { describe, expect, it } from "vitest";
import {
  generateShortCode,
  isReservedPath,
  isValidCustomAlias,
  normalizeUtmValue,
  buildPublicPath,
  resolveCodeLength,
  isValidCodeLength,
} from "@/lib/code";
import {
  CODE_LENGTH_MAX,
  CODE_LENGTH_MIN,
  CODE_LENGTH_WITH_CATEGORY,
  CODE_LENGTH_WITHOUT_CATEGORY,
  SAFE_CODE_ALPHABET,
} from "@/lib/constants";
import { analyzeUrl, applyUtmToUrl, isSafeRedirectTarget } from "@/lib/url";

describe("normalizeUtmValue", () => {
  it("lowercases and replaces spaces", () => {
    expect(normalizeUtmValue(" Summer Houses 2026 ")).toBe(
      "summer_houses_2026",
    );
  });

  it("strips illegal characters", () => {
    expect(normalizeUtmValue("VK@#$%")).toBe("vk");
  });
});

describe("codes", () => {
  it("generates safe alphabet codes", () => {
    const code = generateShortCode(7);
    expect(code).toHaveLength(7);
    for (const ch of code) {
      expect(SAFE_CODE_ALPHABET).toContain(ch);
    }
  });

  it("generates codes from min length 4", () => {
    const code = generateShortCode(4);
    expect(code).toHaveLength(4);
  });

  it("resolves requested code length within bounds", () => {
    expect(resolveCodeLength(false, 4)).toBe(4);
    expect(resolveCodeLength(true, 12)).toBe(12);
    expect(resolveCodeLength(false, null)).toBe(CODE_LENGTH_WITHOUT_CATEGORY);
    expect(resolveCodeLength(true, undefined)).toBe(CODE_LENGTH_WITH_CATEGORY);
    expect(resolveCodeLength(false, 3)).toBe(CODE_LENGTH_WITHOUT_CATEGORY);
    expect(resolveCodeLength(false, CODE_LENGTH_MAX + 1)).toBe(
      CODE_LENGTH_WITHOUT_CATEGORY,
    );
  });

  it("validates code length bounds", () => {
    expect(isValidCodeLength(CODE_LENGTH_MIN)).toBe(true);
    expect(isValidCodeLength(CODE_LENGTH_MAX)).toBe(true);
    expect(isValidCodeLength(3)).toBe(false);
    expect(isValidCodeLength(CODE_LENGTH_MAX + 1)).toBe(false);
  });

  it("rejects reserved paths and invalid aliases", () => {
    expect(isReservedPath("admin")).toBe(true);
    expect(isReservedPath("links")).toBe(true);
    expect(isReservedPath("utm-settings")).toBe(true);
    expect(isValidCustomAlias("admin")).toBe(false);
    expect(isValidCustomAlias("abc")).toBe(false);
    expect(isValidCustomAlias("abcd")).toBe(true);
    expect(isValidCustomAlias("modul-120")).toBe(true);
  });

  it("builds public path", () => {
    expect(buildPublicPath("a8K3p", "project")).toBe("project/a8K3p");
    expect(buildPublicPath("v83kjaz")).toBe("v83kjaz");
  });
});

describe("url safety", () => {
  it("accepts https urls", () => {
    const result = analyzeUrl("https://avgst.ru/projects/modul-120");
    expect(result.ok).toBe(true);
  });

  it("rejects javascript and localhost", () => {
    expect(analyzeUrl("javascript:alert(1)").ok).toBe(false);
    expect(analyzeUrl("http://localhost/test").ok).toBe(false);
    expect(analyzeUrl("http://127.0.0.1/test").ok).toBe(false);
    expect(isSafeRedirectTarget("https://avgst.ru")).toBe(true);
  });

  it("applies and removes utm", () => {
    const withUtm = applyUtmToUrl(
      "https://avgst.ru/projects/modul-120",
      {
        source: "vk",
        medium: "cpc",
        campaign: "summer_houses_2026",
      },
      "replace",
    );
    expect(withUtm).toContain("utm_source=vk");
    expect(withUtm).toContain("utm_medium=cpc");
    const removed = applyUtmToUrl(withUtm, {}, "remove");
    expect(removed).not.toContain("utm_source");
  });
});
