import { describe, expect, it } from "vitest";
import {
  generateShortCode,
  isReservedPath,
  isValidCustomAlias,
  normalizeUtmValue,
  buildPublicPath,
} from "@/lib/code";
import { SAFE_CODE_ALPHABET } from "@/lib/constants";
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

  it("rejects reserved paths and invalid aliases", () => {
    expect(isReservedPath("admin")).toBe(true);
    expect(isReservedPath("links")).toBe(true);
    expect(isReservedPath("utm-settings")).toBe(true);
    expect(isValidCustomAlias("admin")).toBe(false);
    expect(isValidCustomAlias("ab")).toBe(false);
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
