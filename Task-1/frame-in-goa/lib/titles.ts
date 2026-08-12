/** Deterministic "builder class" generator — same inputs always yield the same title. */

export function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const ADJ = [
  "Nocturnal",
  "Monsoon-Born",
  "Salt-Crusted",
  "Zero-Latency",
  "Terminal-Dwelling",
  "Ocean-Cooled",
  "Sunrise-Shipping",
  "Caffeine-Fuelled",
  "Relentless",
  "Deep-Work",
  "Low-Level",
  "Feral",
  "Barefoot",
  "Off-Grid",
  "Hand-Rolled",
  "Undocumented",
];

const NOUN = [
  "Shipper",
  "Systems Gremlin",
  "Pixel Surgeon",
  "Latency Assassin",
  "Protocol Whisperer",
  "Prompt Alchemist",
  "Kernel Mystic",
  "Edge Runner",
  "Demo Closer",
  "Bug Exorcist",
  "Stack Nomad",
  "Signal Hunter",
  "Schema Sculptor",
  "Frame Smith",
  "Race-Condition Tamer",
  "Midnight Committer",
];

const CLEARANCE = ["SAND LEVEL", "SHORELINE", "HIGH TIDE", "SUNRISE CLASS", "DEEP SIGNAL"];

/**
 * @param seed  usually `${name}|${stack}`
 * @param spin  incremented by the UI's re-roll button so a user can shop for a title
 */
export function builderTitle(seed: string, spin = 0): string {
  const h = hash32(`${seed}#${spin}`);
  return `${ADJ[h % ADJ.length]} ${NOUN[(h >>> 8) % NOUN.length]}`;
}

export function clearance(seed: string, spin = 0): string {
  const h = hash32(`clr:${seed}#${spin}`);
  return CLEARANCE[h % CLEARANCE.length];
}

/** Badge serial. */
export function builderId(seed: string): string {
  const h = hash32(`id:${seed}`);
  const n = (h % 8999) + 1000;
  return `HHG-26 / ${n}`;
}
