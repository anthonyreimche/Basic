// Which of Basic's stages the live view may leave out of the develop program
// while their sliders are at rest (Safelight 3.2.1's dormantWhen), and on
// which release lines. A rule is declared only where the line's text skips the
// block at those values: the GPU specs under test/gpu prove the frame is the
// same either way.

import { describe, expect, it } from "vitest";
import type { DevelopParams, Line, ProcessingStageContribution } from "../src/safelight";
import {
  BAND_DETAIL_STAGE_ID,
  DISPLAY_STAGE_ID,
  PRESENCE_STAGE_ID,
  TONE_STAGE_ID,
  VIBRANCE_STAGE_ID,
  basicStages,
} from "../src/stages";
import { DEFAULTS } from "./support/fake-api";

const CTX = { settings: <T>(_key: string, fallback: T): T => fallback };

const stageOf = (line: Line, id: string): ProcessingStageContribution => {
  const stage = basicStages(line).find((s) => s.id === id);
  if (!stage) throw new Error(`no stage ${id}`);
  return stage;
};

interface Sleeper {
  id: string;
  /** The rule, which names every uniform the stage declares. */
  rule: Record<string, number>;
  /** Params field behind each uniform. */
  fields: Record<string, keyof DevelopParams>;
  /** The lines whose text skips the block at the rule's values. */
  lines: readonly Line[];
}

const SLEEPERS: Sleeper[] = [
  {
    id: DISPLAY_STAGE_ID,
    rule: { uWhites: 0, uBlacks: 0, uContrast: 0 },
    fields: { uWhites: "whites", uBlacks: "blacks", uContrast: "contrast" },
    lines: [1, 2, 3],
  },
  {
    id: PRESENCE_STAGE_ID,
    rule: { uTexture: 0, uClarity: 0, uDehaze: 0 },
    fields: { uTexture: "texture", uClarity: "clarity", uDehaze: "dehaze" },
    lines: [1, 2, 3],
  },
  {
    // Line 1 adds an auto term from Highlights and Shadows, so it runs at 0.
    id: BAND_DETAIL_STAGE_ID,
    rule: { uHighlightDetail: 0, uShadowDetail: 0 },
    fields: { uHighlightDetail: "highlightDetail", uShadowDetail: "shadowDetail" },
    lines: [2, 3],
  },
  {
    // Line 1 calls applyVibSat unguarded, which clips.
    id: VIBRANCE_STAGE_ID,
    rule: { uVibrance: 0, uSaturation: 0 },
    fields: { uVibrance: "vibrance", uSaturation: "saturation" },
    lines: [2, 3],
  },
];

const CASES = SLEEPERS.flatMap((s) => ([1, 2, 3] as const).map((line) => [line, s.id, s] as const));
const ACTIVE = CASES.filter(([line, , s]) => s.lines.includes(line));

/** Whether the stage's rule holds for `params`, as the stage derives them. */
function holds(stage: ProcessingStageContribution, params: DevelopParams): boolean {
  const rule = Object.entries(stage.dormantWhen ?? {});
  expect(rule).not.toEqual([]);
  const derived: Record<string, unknown> = stage.derive?.(params, CTX) ?? {};
  return rule.every(([key, value]) => derived[key] === value);
}

describe("dormantWhen", () => {
  it.each([1, 2, 3] as const)(
    "is never on line %i's tone block, which applies the default shoulder and the camera lift at rest",
    (line) => {
      expect(stageOf(line, TONE_STAGE_ID).dormantWhen).toBeUndefined();
    },
  );

  it.each(CASES)("line %i of %s: declares the rule only where the line's text skips the block", (line, _id, s) => {
    expect(stageOf(line, s.id).dormantWhen).toEqual(s.lines.includes(line) ? s.rule : undefined);
  });

  it.each(ACTIVE)(
    "line %i of %s: names every uniform the stage declares, each a float and no array",
    (line, _id, s) => {
      const stage = stageOf(line, s.id);
      expect(Object.keys(stage.dormantWhen ?? {}).sort()).toEqual(stage.uniforms.map((u) => u.key).sort());
      for (const u of stage.uniforms) {
        expect(u.glslType).toBe("float");
        expect(u).not.toHaveProperty("length");
      }
    },
  );

  it.each(ACTIVE)(
    "line %i of %s: holds for an untouched photo",
    (line, _id, s) => {
      expect(holds(stageOf(line, s.id), DEFAULTS)).toBe(true);
    },
  );

  it.each(
    ACTIVE.flatMap(([line, id, s]) =>
      Object.entries(s.fields).map(([uniform, field]) => [line, id, uniform, s, field] as const),
    ),
  )("line %i of %s: breaks when %s's slider moves", (line, _id, _uniform, s, field) => {
    for (const moved of [1, -1, 100, -100]) {
      expect(holds(stageOf(line, s.id), { ...DEFAULTS, [field]: moved })).toBe(false);
    }
  });

  it("is not woken by the other tools' sliders", () => {
    const elsewhere: DevelopParams = { ...DEFAULTS, exposure: 2, highlights: -50, shadows: 40 };
    for (const [line, , s] of ACTIVE) {
      expect(holds(stageOf(line, s.id), elsewhere)).toBe(true);
    }
  });
});
