export const CUSTOM_CALL_SOUND_CHANCE = 0.01;
export const CUSTOM_CALL_SOUNDS = ["arcade", "orbit", "pulse"] as const;
export type CallSound = "normal" | (typeof CUSTOM_CALL_SOUNDS)[number];

export function chooseCallSound(forced: boolean, random: () => number = Math.random): CallSound {
  if (!forced && random() >= CUSTOM_CALL_SOUND_CHANCE) return "normal";
  return CUSTOM_CALL_SOUNDS[Math.min(CUSTOM_CALL_SOUNDS.length - 1, Math.floor(random() * CUSTOM_CALL_SOUNDS.length))] ?? "arcade";
}

export function callSoundNotes(sound: CallSound): { frequency: number; offset: number; duration: number; wave: OscillatorType }[] {
  if (sound === "normal") return [0, 0.4].map((offset) => ({ frequency: 660, offset, duration: 0.3, wave: "sine" }));
  const frequencies = sound === "arcade" ? [523.25, 659.25, 783.99, 1046.5, 783.99] : sound === "orbit" ? [440, 554.37, 659.25, 554.37, 440] : [330, 660, 330, 880, 660];
  return frequencies.map((frequency, i) => ({ frequency, offset: i * 0.18, duration: 0.15, wave: sound === "arcade" ? "triangle" : "sine" }));
}