//#region src/rt.ts
var e, t;
function n(n) {
	t = n, e = n.react;
}
//#endregion
//#region src/settings.ts
var r = "detailSliders", i = {
	title: "Basic",
	order: 40,
	keywords: [
		"highlight detail",
		"shadow detail",
		"micro-contrast",
		"sliders"
	],
	fields: [{
		key: r,
		label: "Highlight & shadow detail sliders",
		hint: "Add Highlight Detail and Shadow Detail sliders to the Basic panel for per-band micro-contrast control. Off by default to keep the panel compact — Highlights and Shadows already keep texture on their own; turn this on to add or soften fine detail per band.",
		type: "boolean",
		default: !1
	}]
}, a = { sliders: "safelight-basic-sliders" }, o = () => `
:where(.${a.sliders} > :not(:last-child)) { margin-block: 0 0.125rem; }
`, s = [
	{
		key: "exposure",
		label: "Exposure"
	},
	{
		key: "contrast",
		label: "Contrast"
	},
	{
		key: "highlights",
		label: "Highlights"
	},
	{
		key: "highlightDetail",
		label: "Highlight Detail",
		icon: "core.highlights",
		detail: !0
	},
	{
		key: "shadows",
		label: "Shadows"
	},
	{
		key: "shadowDetail",
		label: "Shadow Detail",
		icon: "core.shadows",
		detail: !0
	},
	{
		key: "whites",
		label: "Whites"
	},
	{
		key: "blacks",
		label: "Blacks"
	},
	{
		key: "texture",
		label: "Texture"
	},
	{
		key: "clarity",
		label: "Clarity"
	},
	{
		key: "dehaze",
		label: "Dehaze"
	},
	{
		key: "vibrance",
		label: "Vibrance"
	},
	{
		key: "saturation",
		label: "Saturation"
	}
], c = s.map((e) => e.key);
function l() {
	let n = () => t.settings.get(r, !1), [i, a] = e.useState(n);
	return e.useEffect(() => t.settings.onChange(() => a(n())), []), i;
}
function u() {
	let { Panel: n, Slider: r, AutoButton: i } = t.components, o = t.stores.useDevelopStore, c = o((e) => e.params), u = o((e) => e.setParam), d = o((e) => e.commitEdit), f = o((e) => e.histogram != null), p = l();
	return /* @__PURE__ */ e.createElement(n, { title: "Basic" }, /* @__PURE__ */ e.createElement(i, {
		onClick: () => void t.develop.autoAdjust.tone(),
		disabled: !f,
		title: "Auto tone"
	}), /* @__PURE__ */ e.createElement("div", { className: a.sliders }, s.filter((e) => p || !e.detail).map((t) => /* @__PURE__ */ e.createElement(r, {
		key: t.key,
		icon: t.icon ?? `core.${t.key}`,
		label: t.label,
		value: c[t.key],
		min: t.key === "exposure" ? -5 : -100,
		max: t.key === "exposure" ? 5 : 100,
		step: t.key === "exposure" ? .1 : 1,
		onChange: (e) => u(t.key, e),
		onCommit: () => void d(t.label)
	}))));
}
var d = [
	{
		key: "exposure",
		label: "Exposure"
	},
	{
		key: "contrast",
		label: "Contrast"
	},
	{
		key: "highlights",
		label: "Highlights"
	},
	{
		key: "shadows",
		label: "Shadows"
	},
	{
		key: "whites",
		label: "Whites"
	},
	{
		key: "blacks",
		label: "Blacks"
	},
	{
		key: "saturation",
		label: "Saturation"
	},
	{
		key: "vibrance",
		label: "Vibrance"
	}
];
function f() {
	let { Slider: n } = t.components, r = t.develop.useMaskScope();
	return /* @__PURE__ */ e.createElement("div", { className: a.sliders }, d.map((t) => /* @__PURE__ */ e.createElement(n, {
		key: t.key,
		label: t.label,
		value: r.adj[t.key],
		min: -100,
		max: 100,
		step: 1,
		defaultValue: 0,
		onChange: (e) => r.setAdj({ [t.key]: e }),
		onCommit: () => r.commit(`Mask ${t.label}`)
	})));
}
var p = {
	component: f,
	order: 10,
	owns: d.map((e) => e.key)
}, m = "safelight.basic.tone", h = "safelight.basic.display", g = "safelight.basic.presence", _ = "safelight.basic.band-detail", v = "safelight.basic.vibrance";
function y(e) {
	let t = (t) => e >= 2 ? t : "";
	return {
		v2: t,
		pick: (t, n) => e >= 2 ? n : t,
		clampInput: t("\n    c = clamp(c, 0.0, 1.0);")
	};
}
var b = "  {\n    float L = max(luma(lin), 1e-4);\n    float Lx = L * exp2(E);\n    float L1 = slToneHighlights(Lx, E, H);\n    float cameraLift = uApplyBaseCurve ? uBaselineShadows : 0.0;\n    float L2 = slToneShadows(slToneShadows(L1, cameraLift), S);\n    float curveRatio = 1.0;\n    if (abs(H) > 0.001 || abs(S) > 0.001) {\n      // Floored after Exposure (as localToneBlend is): under the curves' own\n      // 1e-4 floor a region's Shadows gain would grow as Exposure goes down.\n      float Bx = max(slLocalToneBase(srcUv, L) * exp2(E), 1e-4);\n      float B1 = slToneHighlights(Bx, E, H);\n      // The Highlights curve over the default one, for the pixel and for its\n      // region, blended as L1 is below. L1 is still the pixel's curve here.\n      if (abs(H) > 0.001) {\n        curveRatio = mix(\n          L1 / slToneHighlights(Lx, E, 0.0),\n          B1 / slToneHighlights(Bx, E, 0.0), abs(H));\n      }\n      L1 = mix(L1, Lx * B1 / Bx, abs(H));\n      float C1 = slToneShadows(L1, cameraLift);\n      float CB = slToneShadows(B1, cameraLift);\n      L2 = mix(slToneShadows(C1, S), C1 * slToneShadows(CB, S) / CB, abs(S));\n    }\n    // slSceneLuma undoes only the default shoulder, on the same pixel/region\n    // blend the edit above used, so Highlights carries into it.\n    if (uApplyToneShoulder) slShoulderGain = Lx * curveRatio / max(L1, 1e-6);\n    lin = retargetLuma(lin, L, L2);\n    // Hunt effect: restore colourfulness lost by pulling bright values down.\n    if (H < -0.001) {\n      float pulled = clamp(Lx - L1, 0.0, 1.0);\n      lin = mix(vec3(luma(lin)), lin, 1.0 + pulled * HI_SAT);\n    }\n  }", x = "\n  float slShoulderGain = 1.0;", S = (e) => {
	let { v2: t, pick: n } = y(e);
	return `  // Integrated tonal pipeline: exposure, highlights, and shadows are applied as
  // a single shoulder-based tone map instead of sequential independent operations.
  // Where the shoulder applies, exposure can't create unbounded values (no
  // blow-out); a display transform that skips it takes that headroom instead.
  // Either way highlight recovery works even at high exposure (+3..+5 EV).
  float E = uExposure;
  float H = clamp(uHighlights / 100.0, -1.0, 1.0);
  float S = clamp(uShadows / 100.0, -1.0, 1.0);${t(x)}
  ${n("{\n    float L = max(luma(lin), 1e-4);\n\n    // Exposure: true linear gain (×2 per stop)\n    float Lx = L * exp2(E);\n\n    // Filmic shoulder: piecewise curve — linear below knee, smooth Reinhard\n    // compression above, keeping blown values out of display space wherever\n    // it applies. Highlights slider controls the knee position:\n    //   H < 0 (recover): lower knee → more of the range gets compressed\n    //   H > 0 (brighten): raise knee → more headroom before compression\n    float knee = 0.85;\n    float rolloff = 0.5;\n    if (H < 0.0) {\n      knee = mix(0.85, 0.15, -H);\n      rolloff = mix(0.5, 0.2, -H);\n    } else if (H > 0.0) {\n      knee = mix(0.85, 2.0, H);\n      rolloff = mix(0.5, 1.5, H);\n    }\n    // Slope at the knee is (1-knee)/rolloff; clamp so it never exceeds 1.0,\n    // otherwise midtones just above a low knee get lifted instead of compressed.\n    rolloff = max(rolloff, 1.0 - knee);\n    // Scale rolloff with sqrt of gain — enough to preserve highlight separation\n    // at moderate exposure but lets high exposure (+5) push the image toward white\n    rolloff *= max(exp2(max(E, 0.0) * 0.5), 1.0);\n\n    float Lsc = Lx;\n    if (Lx > knee) {\n      float excess = Lx - knee;\n      Lsc = knee + (1.0 - knee) * excess / (excess + rolloff);\n    }\n    // A transform with its own roll-off keeps the headroom: only recovery\n    // (H < 0) blends the shoulder back in, in proportion to the slider.\n    if (!uApplyToneShoulder) Lsc = mix(Lx, Lsc, max(-H, 0.0));\n\n    lin = retargetLuma(lin, L, Lsc);\n\n    // Hunt effect: restore colourfulness lost by pulling bright values down\n    if (H < -0.001 && Lx > knee) {\n      float pulled = clamp(Lx - Lsc, 0.0, 1.0);\n      float Lr = luma(lin);\n      lin = mix(vec3(Lr), lin, 1.0 + pulled * HI_SAT);\n    }\n\n    // Highlight lift (H > 0): gamma brighten the upper zone\n    if (H > 0.001) {\n      float Lcur = max(luma(lin), 1e-4);\n      float hw = smoothstep(0.3, 0.9, Lcur);\n      float gamma = mix(1.0, 0.5, H);\n      float newLcur = mix(Lcur, pow(Lcur, gamma), hw * H);\n      // The gamma lift darkens values above white; without the shoulder those\n      // are the transform's headroom, so the lift may only brighten.\n      if (!uApplyToneShoulder) newLcur = max(newLcur, Lcur);\n      lin = retargetLuma(lin, Lcur, newLcur);\n    }\n\n    // Shadows: gamma toe weighted toward the dark end, fading out in highlights\n    if (abs(S) > 0.001) {\n      float Lcur = max(luma(lin), 1e-4);\n      float shW = exp(-3.0 * Lcur);\n      float gamma = S > 0.0 ? mix(1.0, 0.65, S) : mix(1.0, 1.8, -S);\n      float newLcur = mix(Lcur, pow(Lcur, gamma), shW * abs(S));\n      lin = retargetLuma(lin, Lcur, newLcur);\n    }\n  }", b)}`;
}, C = (e) => {
	let { clampInput: t } = y(e);
	return `  // Whites (display space): endpoint control for the bright end.
  // Gamma-based adjustment weighted by cubic peaking at white.
  if (abs(uWhites) > 0.001) {${t}
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
  if (abs(uBlacks) > 0.001) {${t}
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
  if (abs(ck) > 0.001) {${t}
    float L = luma(c);
    float Lnew = clamp(L + ck * L * (1.0 - L) * (2.0 * L - 1.0), 0.0, 1.0);
    c = c * (Lnew / max(L, 1e-4));
    c = clamp(c, 0.0, 1.0);
  }`;
}, w = (e) => {
	let { clampInput: t } = y(e);
	return `  // Dehaze: dark channel prior with global atmospheric light estimate.
  if (abs(dehAmt) > 0.001) {${t}
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
}, T = (e) => {
	let { pick: t } = y(e);
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
  float hiGain = ${t("(H < 0.0 ? -H : 0.0) + ", "")}uHighlightDetail / 100.0;
  if (abs(hiGain) > 0.001) {
    float hiZone = smoothstep(0.45, 0.78, luma(c));
    c += bandDet * hiGain * hiZone * BAND_DETAIL;
  }
  float shGain = ${t("(S > 0.0 ? 0.5 * S : 0.0) + ", "")}uShadowDetail / 100.0;
  if (abs(shGain) > 0.001) {
    float shZone = 1.0 - smoothstep(0.12, 0.45, luma(c));
    c += bandDet * shGain * shZone * BAND_DETAIL;
  }
  ${t("c = clamp(c, 0.0, 1.0);", "")}`;
}, E = (e) => {
	let { pick: t } = y(e);
	return `  ${t("c = applyVibSat(c, uVibrance, uSaturation);", "if (abs(uVibrance) >= 0.1 || abs(uSaturation) > 0.1)\n    c = applyVibSat(c, uVibrance, uSaturation);")}`;
}, D = (e) => ({
	key: e,
	glslType: "float",
	default: 0
});
function O(e, t, n, r, i, a) {
	return {
		id: e,
		name: t,
		phase: n,
		anchor: r,
		glsl: a,
		uniforms: Object.keys(i).map(D),
		derive: (e) => Object.fromEntries(Object.entries(i).map(([t, n]) => [t, e[n]]))
	};
}
function k(e) {
	return [
		O(m, "Exposure, Highlights & Shadows", "scene-linear", "tone", {
			uExposure: "exposure",
			uHighlights: "highlights",
			uShadows: "shadows"
		}, S(e)),
		O(h, "Whites, Blacks & Contrast", "display-adjust", "display-basic", {
			uWhites: "whites",
			uBlacks: "blacks",
			uContrast: "contrast"
		}, C(e)),
		O(g, "Dehaze, Clarity & Texture", "display-adjust", "presence", {
			uTexture: "texture",
			uClarity: "clarity",
			uDehaze: "dehaze"
		}, w(e)),
		O(_, "Highlight & Shadow Detail", "display-adjust", "band-detail", {
			uHighlightDetail: "highlightDetail",
			uShadowDetail: "shadowDetail"
		}, T(e)),
		O(v, "Vibrance & Saturation", "display-adjust", "vibrance", {
			uVibrance: "vibrance",
			uSaturation: "saturation"
		}, E(e))
	];
}
//#endregion
//#region src/index.tsx
var A = "core.basic", j = "safelight.basic.styles", M = 3;
function N(e) {
	n(e), e.registerStylesheet({
		id: j,
		css: o()
	});
	for (let t of k(3)) e.registerProcessingStage(t);
	e.registerPanel({
		id: A,
		title: "Basic",
		component: u,
		defaultDock: {
			module: "develop",
			direction: "right",
			order: 5,
			width: 280,
			height: 220
		},
		onReset: () => void e.stores.useDevelopStore.getState().resetParams(c, "Reset Basic"),
		mask: p
	}), e.registerSettings(i);
}
//#endregion
export { M as LINE, A as PANEL_ID, j as STYLESHEET_ID, N as activate };

//# sourceMappingURL=index.js.map