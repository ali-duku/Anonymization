import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import { APP_META } from "./appMeta";

describe("APP_META release discipline", () => {
  it("keeps app version aligned with package.json", () => {
    expect(APP_META.version).toBe(packageJson.version);
  });

  it("keeps latest release note aligned with the current version", () => {
    expect(APP_META.releaseNotes.length).toBeGreaterThan(0);

    const latestRelease = APP_META.releaseNotes[0];
    expect(latestRelease.version).toBe(APP_META.version);
    expect(latestRelease.highlights.length).toBeGreaterThan(0);
  });
});
