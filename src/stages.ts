// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// Basic's five blocks of the develop program. Until Safelight 3.2.0 they were
// core's own; their GLSL is core's, moved as written. Each runs at its anchor
// of the develop program and calls core's helpers: the version 2 tone block's
// local tone curves and region base (slToneHighlights, slToneShadows,
// slLocalToneBase), retargetLuma, lumaLod, applyVibSat, and the HI_SAT and
// BAND_DETAIL constants. Line 1 is process version 1's text; lines 2 and 3
// are version 2's (Basic has no version 3 text). The blocks share main()'s
// scope: the tone block declares E, H and S, which version 1's band detail
// reads, and on version 2 slShoulderGain, which core's scene luma reads. Core
// declares texAmt, clarAmt and dehAmt from the presence sliders. While this
// extension is away, core stands in neutral values for the names it reads.

import type { DevelopParams, Line, Phase, ProcessingStageContribution, StageAnchor, UniformDeclaration } from "./safelight";

export const TONE_STAGE_ID = "safelight.basic.tone";
export const DISPLAY_STAGE_ID = "safelight.basic.display";
export const PRESENCE_STAGE_ID = "safelight.basic.presence";
export const BAND_DETAIL_STAGE_ID = "safelight.basic.band-detail";
export const VIBRANCE_STAGE_ID = "safelight.basic.vibrance";

/** A line's text where version 1's and version 2's differ: core's
 *  variantGuards for the version the line was written for. */
function guards(line: Line) {
  const v2 = (glsl: string): string => (line >= 2 ? glsl : "");
  const pick = (v1Glsl: string, v2Glsl: string): string => (line >= 2 ? v2Glsl : v1Glsl);
  // Opens the block of a tool whose math needs [0, 1]: nothing upstream has
  // clipped its input on version 2.
  const clampInput = v2("\n    c = clamp(c, 0.0, 1.0);");
  return { v2, pick, clampInput };
}

// Process version 2's tone block: version 1's curves (core's local tone) on the
// pixel and, while Highlights or Shadows is moved, on the pixel's region too,
// keeping the pixel's ratio to it and blended in with the slider. Between the
// two, the camera match's shadows lift goes on each pixel and its region by
// their own levels, as core's camera match fitted it: through the
// region's ratio it would raise bright detail with its darker surroundings.
const V2_TONE_BLOCK = `  {
    float L = max(luma(lin), 1e-4);
    float Lx = L * exp2(E);
    float L1 = slToneHighlights(Lx, E, H);
    float cameraLift = uApplyBaseCurve ? uBaselineShadows : 0.0;
    float L2 = basicShadows(slToneShadows(L1, cameraLift), S);
    float curveRatio = 1.0;
    if (abs(H) > 0.001 || abs(S) > 0.001) {
      // Floored after Exposure (as localToneBlend is): under the curves' own
      // 1e-4 floor a region's Shadows gain would grow as Exposure goes down.
      float Bx = max(slLocalToneBase(srcUv, L) * exp2(E), 1e-4);
      float B1 = slToneHighlights(Bx, E, H);
      // The Highlights curve over the default one, for the pixel and for its
      // region, blended as L1 is below. L1 is still the pixel's curve here.
      if (abs(H) > 0.001) {
        curveRatio = mix(
          L1 / slToneHighlights(Lx, E, 0.0),
          B1 / slToneHighlights(Bx, E, 0.0), abs(H));
      }
      L1 = mix(L1, Lx * B1 / Bx, abs(H));
      float C1 = slToneShadows(L1, cameraLift);
      float CB = slToneShadows(B1, cameraLift);
      L2 = mix(basicShadows(C1, S), C1 * basicShadows(CB, S) / CB, abs(S));
    }
    // slSceneLuma undoes only the default shoulder, on the same pixel/region
    // blend the edit above used, so Highlights carries into it.
    if (uApplyToneShoulder) slShoulderGain = Lx * curveRatio / max(L1, 1e-6);
    lin = retargetLuma(lin, L, L2);
    // Hunt effect: restore colourfulness lost by pulling bright values down.
    if (H < -0.001) {
      float pulled = clamp(Lx - L1, 0.0, 1.0);
      lin = mix(vec3(luma(lin)), lin, 1.0 + pulled * HI_SAT);
    }
  }`;

// The Shadows slider on the tone block's luminance, from process version 2 on
// (core's local-tone.ts basicShadows is its twin): version 1's curve at ±50,
// its gain in stops times 2|S|. Version 1's curve mixes toward x^g by a weight
// that reaches 1 at ±100, so the deep shadows took the whole power there
// (about -5.5 EV at -100 against -0.84 at -50). The gain fades out over the
// 3.5 stops below mid grey, which stays put. Version 1 photos keep core's.
const TONE_HELPERS = `float basicShadows(float x, float S) {
#if SL_PROCESS_VERSION >= 2
  if (abs(S) <= 0.001) return x;
  float x0 = max(x, 1e-4);
  float w = 0.5 * exp(-3.0 * x0);
  float halfGain = 1.0 - w + w * pow(x0, S > 0.0 ? -0.175 : 0.4);
  float reach = 1.0 - smoothstep(-3.5, 0.0, log2(x0 / 0.18));
  return x0 * pow(halfGain, 2.0 * abs(S) * reach);
#else
  return slToneShadows(x, S);
#endif
}`;

const SHOULDER_GAIN_DECL = "\n  float slShoulderGain = 1.0;";

const basicTone = (line: Line): string => {
  const { v2, pick } = guards(line);
  return `  // Integrated tonal pipeline: exposure, highlights, and shadows are applied as
  // a single shoulder-based tone map instead of sequential independent operations.
  // Where the shoulder applies, exposure can't create unbounded values (no
  // blow-out); a display transform that skips it takes that headroom instead.
  // Either way highlight recovery works even at high exposure (+3..+5 EV).
  float E = uExposure;
  float H = clamp(uHighlights / 100.0, -1.0, 1.0);
  float S = clamp(uShadows / 100.0, -1.0, 1.0);${v2(SHOULDER_GAIN_DECL)}
  ${pick(`{
    float L = max(luma(lin), 1e-4);

    // Exposure: true linear gain (×2 per stop)
    float Lx = L * exp2(E);

    // Filmic shoulder: piecewise curve — linear below knee, smooth Reinhard
    // compression above, keeping blown values out of display space wherever
    // it applies. Highlights slider controls the knee position:
    //   H < 0 (recover): lower knee → more of the range gets compressed
    //   H > 0 (brighten): raise knee → more headroom before compression
    float knee = 0.85;
    float rolloff = 0.5;
    if (H < 0.0) {
      knee = mix(0.85, 0.15, -H);
      rolloff = mix(0.5, 0.2, -H);
    } else if (H > 0.0) {
      knee = mix(0.85, 2.0, H);
      rolloff = mix(0.5, 1.5, H);
    }
    // Slope at the knee is (1-knee)/rolloff; clamp so it never exceeds 1.0,
    // otherwise midtones just above a low knee get lifted instead of compressed.
    rolloff = max(rolloff, 1.0 - knee);
    // Scale rolloff with sqrt of gain — enough to preserve highlight separation
    // at moderate exposure but lets high exposure (+5) push the image toward white
    rolloff *= max(exp2(max(E, 0.0) * 0.5), 1.0);

    float Lsc = Lx;
    if (Lx > knee) {
      float excess = Lx - knee;
      Lsc = knee + (1.0 - knee) * excess / (excess + rolloff);
    }
    // A transform with its own roll-off keeps the headroom: only recovery
    // (H < 0) blends the shoulder back in, in proportion to the slider.
    if (!uApplyToneShoulder) Lsc = mix(Lx, Lsc, max(-H, 0.0));

    lin = retargetLuma(lin, L, Lsc);

    // Hunt effect: restore colourfulness lost by pulling bright values down
    if (H < -0.001 && Lx > knee) {
      float pulled = clamp(Lx - Lsc, 0.0, 1.0);
      float Lr = luma(lin);
      lin = mix(vec3(Lr), lin, 1.0 + pulled * HI_SAT);
    }

    // Highlight lift (H > 0): gamma brighten the upper zone
    if (H > 0.001) {
      float Lcur = max(luma(lin), 1e-4);
      float hw = smoothstep(0.3, 0.9, Lcur);
      float gamma = mix(1.0, 0.5, H);
      float newLcur = mix(Lcur, pow(Lcur, gamma), hw * H);
      // The gamma lift darkens values above white; without the shoulder those
      // are the transform's headroom, so the lift may only brighten.
      if (!uApplyToneShoulder) newLcur = max(newLcur, Lcur);
      lin = retargetLuma(lin, Lcur, newLcur);
    }

    // Shadows: gamma toe weighted toward the dark end, fading out in highlights
    if (abs(S) > 0.001) {
      float Lcur = max(luma(lin), 1e-4);
      float shW = exp(-3.0 * Lcur);
      float gamma = S > 0.0 ? mix(1.0, 0.65, S) : mix(1.0, 1.8, -S);
      float newLcur = mix(Lcur, pow(Lcur, gamma), shW * abs(S));
      lin = retargetLuma(lin, Lcur, newLcur);
    }
  }`, V2_TONE_BLOCK)}`;
};

const basicDisplay = (line: Line): string => {
  const { clampInput } = guards(line);
  return `  // Whites (display space): endpoint control for the bright end.
  // Gamma-based adjustment weighted by cubic peaking at white.
  if (abs(uWhites) > 0.001) {${clampInput}
    float wAmt = uWhites / 100.0;
    float L = max(luma(c), 1e-4);
    float wW = L * L * L;
    float gamma = wAmt > 0.0 ? mix(1.0, 0.5, wAmt) : mix(1.0, 1.9, -wAmt);
    float newL = mix(L, pow(L, gamma), wW);
    c = c * (newL / L);
    c = clamp(c, 0.0, 1.0);
  }

  // Blacks (display space): endpoint control for the dark end.
  // Gamma-based adjustment weighted by cubic peaking at black.
  if (abs(uBlacks) > 0.001) {${clampInput}
    float bAmt = uBlacks / 100.0;
    float L = max(luma(c), 1e-4);
    float bW = (1.0 - L) * (1.0 - L) * (1.0 - L);
    float gamma = bAmt > 0.0 ? mix(1.0, 0.55, bAmt) : mix(1.0, 2.2, -bAmt);
    float newL = mix(L, pow(L, gamma), bW);
    c = c * (newL / L);
    c = clamp(c, 0.0, 1.0);
  }

  // Contrast: luminance-based S-curve (always safe: display values in [0,1]).
  float ck = (uContrast / 100.0) * 0.8;
  if (abs(ck) > 0.001) {${clampInput}
    float L = luma(c);
    float Lnew = clamp(L + ck * L * (1.0 - L) * (2.0 * L - 1.0), 0.0, 1.0);
    c = c * (Lnew / max(L, 1e-4));
    c = clamp(c, 0.0, 1.0);
  }`;
};

const basicPresence = (line: Line): string => {
  const { clampInput } = guards(line);
  return `  // Dehaze: dark channel prior with global atmospheric light estimate.
  if (abs(dehAmt) > 0.001) {${clampInput}
    // Local dark channel from a medium blur
    vec3 localBlur = textureLod(uImage, srcUv, 4.0).rgb;
    if (!uLinear) localBlur = srgbToLinear(localBlur);
    localBlur = linearToSrgbU(localBlur);
    float dc = min(min(localBlur.r, localBlur.g), localBlur.b);
    // Atmospheric light: global estimate from the coarsest mip
    vec3 globalBlur = textureLod(uImage, vec2(0.5, 0.5), 9.0).rgb;
    if (!uLinear) globalBlur = srgbToLinear(globalBlur);
    globalBlur = linearToSrgbU(globalBlur);
    float A = clamp(max(max(globalBlur.r, globalBlur.g), globalBlur.b), 0.5, 0.98);
    // Transmission: normalize dark channel by atmospheric light
    float t_est = clamp(1.0 - dehAmt * 1.2 * dc / max(A, 0.5), 0.12, 1.0);
    c = (c - vec3(A) * (1.0 - t_est)) / max(t_est, 0.12);
    // Saturation restoration: haze washes out color
    float dl = luma(c);
    c = mix(vec3(dl), c, 1.0 + dehAmt * 0.4);
    c = clamp(c, 0.0, 1.0);
  }
  // Clarity: broad local contrast, midtone-focused. A plain broad mip blur
  // averages ACROSS hard edges, so rawLuma - blur overshoots in a band as wide
  // as the blur radius -- that band IS the halo, and masking/clamping it can only
  // attenuate, never remove it. The fix is to make the broad reference EDGE-AWARE:
  // a bilateral blur over 16 mip-blurred taps (two rings), each weighted by luma
  // similarity to the centre so taps across an edge are dropped. The reference
  // then tracks the local side of every boundary, rawLuma - base is ~0 at edges
  // (no ring), and only within-region midtone texture is lifted. CLAR_EDGE is the
  // edge stop: smaller = holds edges harder (less halo), larger = smoother.
  float midMask = 1.0 - pow(clamp(abs(luma(c) - 0.5) * 1.6, 0.0, 1.0), 3.0);
  if (abs(clarAmt) > 0.001) {
    // Edge-aware reference. Each broad tap is blended TOWARD the centre by its
    // luma-similarity weight: a same-side tap contributes its value, a tap across
    // an edge (incl. a mip tap that straddles one) contributes the centre value
    // instead. So the reference equals the local side at every boundary -- no
    // cross-edge averaging (no halo) and no pull from intermediate taps (no ghost
    // outline). rawLuma - base is ~0 at edges and in flats, nonzero only for
    // within-region midtone texture. CLAR_EDGE = edge stop (smaller = stricter).
    const float CLAR_EDGE = 0.08;
    float cen = rawLuma;
    float base = cen;            // centre tap
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853981634;   // i * 2*pi/8
      vec2 dir = vec2(cos(a), sin(a));
      float s1 = lumaLod(srcUv + dir * 0.016, 3.0);
      float w1 = exp(-(s1 - cen) * (s1 - cen) / (2.0 * CLAR_EDGE * CLAR_EDGE));
      base += mix(cen, s1, w1);
      float s2 = lumaLod(srcUv + dir * 0.034, 4.0);
      float w2 = exp(-(s2 - cen) * (s2 - cen) / (2.0 * CLAR_EDGE * CLAR_EDGE));
      base += mix(cen, s2, w2);
    }
    base /= 17.0;               // centre + 16 taps
    c += (cen - base) * clarAmt * 1.5 * midMask;
  }
  // Texture: edge-aware micro-detail (LOD 0.75) — fine surface detail like
  // skin pores and fabric weave, suppressed at strong edges to avoid halos.
  if (abs(texAmt) > 0.001) {
    float fineBlur = lumaLod(srcUv, 0.75);
    float texDetail = rawLuma - fineBlur;
    float broadBlur = lumaLod(srcUv, 2.5);
    float edgeStrength = abs(rawLuma - broadBlur);
    float edgeMask = 1.0 - smoothstep(0.02, 0.12, edgeStrength);
    texDetail = clamp(texDetail, -0.08, 0.08);
    c += texDetail * texAmt * 2.5 * edgeMask;
  }`;
};

const basicBandDetail = (line: Line): string => {
  const { pick } = guards(line);
  return `  // Band-limited detail (highlight / shadow). Tonal recovery and lift compress a
  // luminance band, which dulls its micro-contrast (cloud texture, shadow detail).
  // A luminance curve can't add it back without also moving other tones that overlap
  // in luma (sky vs lit foliage), so restore LOCAL contrast instead — confined to the
  // band where the pixel ended up, clamped to limit edge overshoot (anti-halo).
  //
  // Each band's gain = an auto term (engaged by recovery/lift so a tone move never
  // flattens texture on its own) + the user's Highlight/Shadow Detail slider
  // (bidirectional: + crisper, - smoother). At the slider's default of 0 the highlight
  // term is identical to the original recovery-coupled restore. The shadow auto term is
  // gentler than the highlight one because the dark band is where sensor noise lives.
  // Version 2's Highlights and Shadows keep texture themselves (local-tone.ts), so
  // there each band's gain is its Detail slider alone.
  float bandDet = clamp(rawLuma - lumaLod(srcUv, 2.0), -0.15, 0.15);
  float hiGain = ${pick("(H < 0.0 ? -H : 0.0) + ", "")}uHighlightDetail / 100.0;
  if (abs(hiGain) > 0.001) {
    float hiZone = smoothstep(0.45, 0.78, luma(c));
    c += bandDet * hiGain * hiZone * BAND_DETAIL;
  }
  float shGain = ${pick("(S > 0.0 ? 0.5 * S : 0.0) + ", "")}uShadowDetail / 100.0;
  if (abs(shGain) > 0.001) {
    float shZone = 1.0 - smoothstep(0.12, 0.45, luma(c));
    c += bandDet * shGain * shZone * BAND_DETAIL;
  }
  ${pick("c = clamp(c, 0.0, 1.0);", "")}`;
};

const basicVibrance = (line: Line): string => {
  const { pick } = guards(line);
  return `  ${pick(
    "c = applyVibSat(c, uVibrance, uSaturation);",
    `if (abs(uVibrance) >= 0.1 || abs(uSaturation) > 0.1)
    c = applyVibSat(c, uVibrance, uSaturation);`,
  )}`;
};

const float = (key: string): UniformDeclaration => ({ key, glslType: "float", default: 0 });

interface StageOptions {
  helpers?: string;
  /** Whether the live view may leave the block out while every one of its
   *  sliders is at 0, because the line's text skips it then. */
  sleepsAtRest?: boolean;
}

/** One block: its uniforms are DevelopParams fields bound as they are. */
function stage(
  id: string,
  name: string,
  phase: Phase,
  anchor: StageAnchor,
  fields: Record<string, keyof DevelopParams>,
  glsl: string,
  { helpers, sleepsAtRest = false }: StageOptions = {},
): ProcessingStageContribution {
  const uniforms = Object.keys(fields);
  return {
    id,
    name,
    phase,
    anchor,
    glsl,
    ...(helpers ? { helpers } : {}),
    uniforms: uniforms.map(float),
    ...(sleepsAtRest ? { dormantWhen: Object.fromEntries(uniforms.map((key) => [key, 0])) } : {}),
    derive: (p) => Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, p[field]])),
  };
}

/** The stages of release line `line`, in the program's order. The tone block
 *  never sleeps: at rest it still applies the default highlight shoulder and,
 *  for a camera match, its shadows lift. Of the others, a block sleeps where
 *  the line's text skips it at rest. Lines 2 and 3 guard band detail and
 *  vibrance on their sliders alone; line 1 adds an auto term from Highlights
 *  and Shadows to band detail and runs vibrance unguarded, which clips. */
export function basicStages(line: Line): ProcessingStageContribution[] {
  return [
    stage(
      TONE_STAGE_ID,
      "Exposure, Highlights & Shadows",
      "scene-linear",
      "tone",
      { uExposure: "exposure", uHighlights: "highlights", uShadows: "shadows" },
      basicTone(line),
      { helpers: line >= 2 ? TONE_HELPERS : undefined },
    ),
    stage(
      DISPLAY_STAGE_ID,
      "Whites, Blacks & Contrast",
      "display-adjust",
      "display-basic",
      { uWhites: "whites", uBlacks: "blacks", uContrast: "contrast" },
      basicDisplay(line),
      { sleepsAtRest: true },
    ),
    stage(
      PRESENCE_STAGE_ID,
      "Dehaze, Clarity & Texture",
      "display-adjust",
      "presence",
      { uTexture: "texture", uClarity: "clarity", uDehaze: "dehaze" },
      basicPresence(line),
      { sleepsAtRest: true },
    ),
    stage(
      BAND_DETAIL_STAGE_ID,
      "Highlight & Shadow Detail",
      "display-adjust",
      "band-detail",
      { uHighlightDetail: "highlightDetail", uShadowDetail: "shadowDetail" },
      basicBandDetail(line),
      { sleepsAtRest: line >= 2 },
    ),
    stage(
      VIBRANCE_STAGE_ID,
      "Vibrance & Saturation",
      "display-adjust",
      "vibrance",
      { uVibrance: "vibrance", uSaturation: "saturation" },
      basicVibrance(line),
      { sleepsAtRest: line >= 2 },
    ),
  ];
}
