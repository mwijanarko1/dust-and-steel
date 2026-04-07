import { describe, expect, it } from "vitest";
import {
  buildRefReturnUrl,
  getPortalWorldPositions,
  isPortalEntryFromUrl,
  parseEraFromUrl,
  parseSeedFromUrl
} from "@/shared/vibeJamPortal";

describe("vibeJamPortal", () => {
  it("detects portal entry", () => {
    expect(isPortalEntryFromUrl("?portal=true")).toBe(true);
    expect(isPortalEntryFromUrl("?portal=false")).toBe(false);
    expect(isPortalEntryFromUrl("")).toBe(false);
  });

  it("parses era and seed", () => {
    expect(parseEraFromUrl("modern")).toBe("modern");
    expect(parseEraFromUrl("unknown")).toBe("ayyubid");
    expect(parseSeedFromUrl("42")).toBe(42);
    expect(parseSeedFromUrl(null)).toBeUndefined();
  });

  it("builds return URL with forwarded params", () => {
    const url = buildRefReturnUrl(
      "?portal=true&ref=example.com&username=u1&color=red&speed=3"
    );
    expect(url).toBeTruthy();
    expect(url).toContain("example.com");
    expect(url).toContain("portal=true");
    expect(url).toContain("username=u1");
    expect(url).not.toContain("ref=");
  });

  it("returns null without ref", () => {
    expect(buildRefReturnUrl("?portal=true")).toBeNull();
  });

  it("places portals inside map bounds", () => {
    const { exit, start } = getPortalWorldPositions(190, 150);
    expect(Math.abs(exit.x)).toBeLessThan(190 / 2);
    expect(Math.abs(start.x)).toBeLessThan(190 / 2);
  });
});
