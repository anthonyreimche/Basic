// What activate() registers, the five stages each line carries, and the panel:
// Auto runs core's Auto Tone once a frame is drawn, the sliders write their
// params under their names with core's slider icons, and the detail sliders
// follow Preferences ▸ Basic. The mask instance shifts the mask's own relative
// tone.

import { createHash } from "node:crypto";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LINE, PANEL_ID, STYLESHEET_ID, activate } from "../src/index";
import { React, initRuntime } from "../src/rt";
import type { Line, ProcessingStageContribution } from "../src/safelight";
import { BASIC_SETTINGS, DETAIL_SLIDERS } from "../src/settings";
import {
  BAND_DETAIL_STAGE_ID,
  DISPLAY_STAGE_ID,
  PRESENCE_STAGE_ID,
  TONE_STAGE_ID,
  VIBRANCE_STAGE_ID,
  basicStages,
} from "../src/stages";
import { BASIC_MASK_PANEL, BasicPanel } from "../src/BasicPanel";
import manifest from "../safelight.json";
import { DEFAULTS, fakeApi } from "./support/fake-api";

/** The app's hashes of the stages' text (src/rendering/webgl/essential-stages.test.ts). */
const V2_HASHES = {
  [TONE_STAGE_ID]: "b49dbc83ba6d4333747bed873e98360e8b466961577b7122826605953ab0a759",
  [DISPLAY_STAGE_ID]: "ca8456a68e6aa294d080ad64520030d43aee56755992c98421ec34648140de3f",
  [PRESENCE_STAGE_ID]: "01d11d693d9c73571d91f51a15fc3fb2ca210501000fe7911c3c8250fd837164",
  [BAND_DETAIL_STAGE_ID]: "242979eb84fe05b84865c0f7c77dfb09f5e1e6d8bacc5d744465cf06570cd868",
  [VIBRANCE_STAGE_ID]: "458c125417ef905ad4dcb84633a412d0d1fb594881cba9024a85c66ef2109ba9",
};
const LINE_HASHES: Record<Line, Record<string, string>> = {
  1: {
    [TONE_STAGE_ID]: "8316be94955ac1f25e7875f283e965dcb857f54ddd196306500da046a01ab3cc",
    [DISPLAY_STAGE_ID]: "91163eb2d10b465f8c76a8fe40081a1540de67b3e7b067a886d89511b6cfa7b0",
    [PRESENCE_STAGE_ID]: "8f7db9f9e3cd683989903680719342546e7eb4fcbe8aba75f9dfdd7fc87f89d9",
    [BAND_DETAIL_STAGE_ID]: "576e32d19abe101364b52da39bad192ee9f7e0b550dca589d54f47362ad102e5",
    [VIBRANCE_STAGE_ID]: "b52d15afa88ae6efc86ff41434e377b72194a25a58f585344bd8d5d8b5f9a130",
  },
  2: V2_HASHES,
  3: V2_HASHES,
};

/** What a line's hash covers, as the app's stageText writes it. */
const stageText = (s: ProcessingStageContribution): string =>
  JSON.stringify([s.id, s.phase, s.priority ?? null, s.anchor ?? null, s.glsl, s.helpers ?? null, s.uniforms, s.textures ?? null]);

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

const text = ({ derive: _, ...rest }: ProcessingStageContribution) => rest;

const ALL_KEYS = [
  "exposure",
  "contrast",
  "highlights",
  "highlightDetail",
  "shadows",
  "shadowDetail",
  "whites",
  "blacks",
  "texture",
  "clarity",
  "dehaze",
  "vibrance",
  "saturation",
];

afterEach(cleanup);

describe("basicStages", () => {
  it.each([1, 2, 3] as Line[])("registers line %i's text, as the app froze it", (line) => {
    const got = Object.fromEntries(basicStages(line).map((s) => [s.id, sha256(stageText(s))]));
    expect(got).toEqual(LINE_HASHES[line]);
  });

  it("runs each block at its anchor of the program", () => {
    expect(basicStages(3).map((s) => [s.id, s.phase, s.anchor])).toEqual([
      [TONE_STAGE_ID, "scene-linear", "tone"],
      [DISPLAY_STAGE_ID, "display-adjust", "display-basic"],
      [PRESENCE_STAGE_ID, "display-adjust", "presence"],
      [BAND_DETAIL_STAGE_ID, "display-adjust", "band-detail"],
      [VIBRANCE_STAGE_ID, "display-adjust", "vibrance"],
    ]);
  });

  it("declares the shoulder gain core's scene luma reads from line 2 on", () => {
    const declares = (line: Line) => basicStages(line)[0].glsl.includes("float slShoulderGain = 1.0;");
    expect([declares(1), declares(2), declares(3)]).toEqual([false, true, true]);
  });

  it("runs Shadows through its own curve from line 2 on, version 1 photos keeping core's", () => {
    const [tone1] = basicStages(1);
    expect(tone1.helpers).toBeUndefined();
    for (const line of [2, 3] as Line[]) {
      const [tone] = basicStages(line);
      expect(tone.glsl).toContain("float L2 = basicShadows(slToneShadows(L1, cameraLift), S);");
      expect(tone.glsl).toContain("L2 = mix(basicShadows(C1, S), C1 * basicShadows(CB, S) / CB, abs(S));");
      expect(tone.helpers).toMatch(
        /float basicShadows\(float x, float S\) \{\n#if SL_PROCESS_VERSION >= 2\n[\s\S]*#else\n  return slToneShadows\(x, S\);\n#endif\n\}/,
      );
    }
  });

  it("binds each slider to its uniform", () => {
    const params = Object.fromEntries(ALL_KEYS.map((k, i) => [k, i + 1])) as unknown as typeof DEFAULTS;
    const values = Object.assign({}, ...basicStages(3).map((s) => s.derive?.(params, { settings: (_k, f) => f })));
    expect(values).toEqual({
      uExposure: 1,
      uContrast: 2,
      uHighlights: 3,
      uHighlightDetail: 4,
      uShadows: 5,
      uShadowDetail: 6,
      uWhites: 7,
      uBlacks: 8,
      uTexture: 9,
      uClarity: 10,
      uDehaze: 11,
      uVibrance: 12,
      uSaturation: 13,
    });
  });
});

describe("activate", () => {
  it("registers the Basic panel, as core's core.basic did", () => {
    const rig = fakeApi();
    activate(rig.api);
    expect(rig.panels).toEqual([
      {
        id: "core.basic",
        title: "Basic",
        component: BasicPanel,
        defaultDock: { module: "develop", direction: "right", order: 5, width: 280, height: 220 },
        onReset: expect.any(Function),
        mask: BASIC_MASK_PANEL,
      },
    ]);
    expect(PANEL_ID).toBe("core.basic");
    expect(BASIC_MASK_PANEL).toMatchObject({
      order: 10,
      owns: ["exposure", "contrast", "highlights", "shadows", "whites", "blacks", "saturation", "vibrance"],
    });
  });

  it("resets every slider as one step from the dock header", () => {
    const rig = fakeApi({ params: { exposure: 1.5, clarity: 20 } });
    activate(rig.api);
    rig.panels[0].onReset?.();
    expect(rig.calls).toEqual([{ resetParams: ALL_KEYS, label: "Reset Basic" }]);
  });

  it("registers the stages of its line, its stylesheet and Preferences ▸ Basic", () => {
    const rig = fakeApi();
    activate(rig.api);
    expect(LINE).toBe(Number(manifest.version.split(".")[0]));
    expect(LINE).toBe(3);
    expect(rig.stages.map(text)).toEqual(basicStages(LINE).map(text));
    expect(rig.stylesheets.map((s) => s.id)).toEqual([STYLESHEET_ID]);
    expect(rig.settingsSections).toEqual([BASIC_SETTINGS]);
    expect(BASIC_SETTINGS.fields).toEqual([
      expect.objectContaining({ key: DETAIL_SLIDERS, type: "boolean", default: false }),
    ]);
  });
});

function panel(opts?: Parameters<typeof fakeApi>[0]) {
  const rig = fakeApi(opts);
  initRuntime(rig.api);
  const view = render(<BasicPanel />);
  return { rig, view };
}

const labels = (rig: ReturnType<typeof fakeApi>, root: ParentNode) => rig.sliders(root).map((s) => s.label);

describe("the Basic panel", () => {
  it("draws the eleven sliders, without the detail ones, by default", () => {
    const { rig, view } = panel();
    expect(labels(rig, view.container)).toEqual([
      "Exposure",
      "Contrast",
      "Highlights",
      "Shadows",
      "Whites",
      "Blacks",
      "Texture",
      "Clarity",
      "Dehaze",
      "Vibrance",
      "Saturation",
    ]);
  });

  it("nests each detail slider under its band with the band's icon, when Preferences asks", () => {
    const { rig, view } = panel({ settings: { [DETAIL_SLIDERS]: true } });
    const sliders = rig.sliders(view.container);
    expect(sliders.map((s) => [s.label, s.icon])).toEqual([
      ["Exposure", "core.exposure"],
      ["Contrast", "core.contrast"],
      ["Highlights", "core.highlights"],
      ["Highlight Detail", "core.highlights"],
      ["Shadows", "core.shadows"],
      ["Shadow Detail", "core.shadows"],
      ["Whites", "core.whites"],
      ["Blacks", "core.blacks"],
      ["Texture", "core.texture"],
      ["Clarity", "core.clarity"],
      ["Dehaze", "core.dehaze"],
      ["Vibrance", "core.vibrance"],
      ["Saturation", "core.saturation"],
    ]);
  });

  it("follows the preference as it changes", () => {
    const { rig, view } = panel();
    act(() => rig.setSetting(DETAIL_SLIDERS, true));
    expect(labels(rig, view.container)).toContain("Shadow Detail");
    act(() => rig.setSetting(DETAIL_SLIDERS, false));
    expect(labels(rig, view.container)).not.toContain("Shadow Detail");
  });

  it("gives Exposure stops in tenths, and every other slider -100 to 100", () => {
    const { rig, view } = panel({ settings: { [DETAIL_SLIDERS]: true }, params: { exposure: 1.2, dehaze: 30 } });
    const [exposure, ...rest] = rig.sliders(view.container);
    expect(exposure).toMatchObject({ value: 1.2, min: -5, max: 5, step: 0.1 });
    for (const s of rest) expect(s).toMatchObject({ min: -100, max: 100, step: 1 });
    expect(rest.find((s) => s.label === "Dehaze")?.value).toBe(30);
  });

  it("writes each slider's param and commits it under the slider's name", () => {
    const { rig, view } = panel();
    const sliders = rig.sliders(view.container);
    const contrast = sliders.find((s) => s.label === "Contrast")!;
    act(() => {
      contrast.onChange(40);
      contrast.onCommit?.();
    });
    expect(rig.calls).toEqual([{ setParam: "contrast", value: 40 }, { commitEdit: "Contrast" }]);
  });

  it("runs core's Auto Tone", () => {
    const { rig } = panel();
    act(() => rig.auto().onClick());
    expect(rig.autoTones).toBe(1);
    expect(rig.auto().title).toBe("Auto tone");
  });

  it("waits for a rendered frame before Auto, and follows it going away", () => {
    const { rig } = panel({ histogram: false });
    expect(rig.auto().disabled).toBe(true);
    act(() => rig.develop.setState({ histogram: {} }));
    expect(rig.auto().disabled).toBe(false);
    act(() => rig.develop.setState({ histogram: null }));
    expect(rig.auto().disabled).toBe(true);
  });

  it("re-renders at most once over a run of histograms", () => {
    const rig = fakeApi({ histogram: false });
    initRuntime(rig.api);
    let commits = 0;
    render(
      <React.Profiler id="basic" onRender={() => commits++}>
        <BasicPanel />
      </React.Profiler>,
    );
    commits = 0;
    for (let i = 0; i < 30; i++) act(() => rig.develop.setState({ histogram: { tick: i } }));
    expect(commits).toBeLessThanOrEqual(1);
  });
});

describe("the mask instance", () => {
  it("shifts the mask's relative tone, and commits under the mask", () => {
    const rig = fakeApi();
    initRuntime(rig.api);
    const Mask = BASIC_MASK_PANEL.component;
    const view = render(<Mask />);
    const sliders = rig.sliders(view.container);
    expect(sliders.map((s) => s.label)).toEqual([
      "Exposure",
      "Contrast",
      "Highlights",
      "Shadows",
      "Whites",
      "Blacks",
      "Saturation",
      "Vibrance",
    ]);
    for (const s of sliders) expect(s).toMatchObject({ value: 0, min: -100, max: 100, step: 1, defaultValue: 0 });
    act(() => {
      sliders[0].onChange(25);
      sliders[0].onCommit?.();
    });
    expect(rig.mask.adj.exposure).toBe(25);
    expect(rig.mask.commits).toEqual(["Mask Exposure"]);
    expect(view.container.querySelector("button")).toBeNull();
  });
});
