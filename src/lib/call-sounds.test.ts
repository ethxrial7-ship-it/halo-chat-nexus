import { describe, expect, test } from "bun:test";
import { chooseCallSound, CUSTOM_CALL_SOUNDS } from "./call-sounds";

describe("surprise ringtones", () => {
  test("exactly 1 percent of evenly spaced chances are custom", () => {
    const results = Array.from({ length: 10000 }, (_, i) => chooseCallSound(false, () => i / 10000));
    expect(results.filter((sound) => sound !== "normal")).toHaveLength(100);
    expect(chooseCallSound(false, () => 0.01)).toBe("normal");
  });
  test("admin override always selects a custom variant", () => {
    for (const chance of [0, 0.01, 0.5, 0.999]) expect(CUSTOM_CALL_SOUNDS).toContain(chooseCallSound(true, () => chance));
  });
  test("random selection reaches each custom version", () => {
    expect([0, 0.4, 0.9].map((n) => chooseCallSound(true, () => n))).toEqual(["arcade", "orbit", "pulse"]);
  });
});