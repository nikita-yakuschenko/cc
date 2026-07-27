import { describe, expect, it } from "vitest";
import { parsePageHeadingFromHtml } from "@/server/links/page-title";

describe("parsePageHeadingFromHtml", () => {
  it("prefers h1 over title", () => {
    const html = "<html><head><title>Title</title></head><body><h1>Heading</h1></body></html>";
    expect(parsePageHeadingFromHtml(html)).toBe("Heading");
  });

  it("falls back to title", () => {
    const html = "<html><head><title>Page title</title></head><body></body></html>";
    expect(parsePageHeadingFromHtml(html)).toBe("Page title");
  });

  it("strips html and decodes entities", () => {
    const html = "<h1>База &amp; <span>знаний</span></h1>";
    expect(parsePageHeadingFromHtml(html)).toBe("База & знаний");
  });
});
