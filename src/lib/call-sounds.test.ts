import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { chooseCallSound, CUSTOM_CALL_SOUNDS } from "./call-sounds";

describe("surprise ringtones", () => {
  test("exactly 1 percent of evenly spaced chances are custom", () => {
    const results = Array.from({ length: 10000 }, (_, i) => chooseCallSound(false, () => i / 10000));
    assert.equal(results.filter((sound) => sound !== "normal").length, 100);
    assert.equal(chooseCallSound(false, () => 0.01), "normal");
  });
  test("admin override always selects a custom variant", () => {
    for (const chance of [0, 0.01, 0.5, 0.999]) assert.ok(CUSTOM_CALL_SOUNDS.some((sound) => sound === chooseCallSound(true, () => chance)));
  });
  test("random selection reaches each custom version", () => {
    assert.deepEqual([0, 0.4, 0.9].map((n) => chooseCallSound(true, () => n)), ["arcade", "orbit", "pulse"]);
  });
});