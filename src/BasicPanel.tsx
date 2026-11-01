// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The Develop "Basic" panel: Auto Tone and the tone and presence sliders; and
// its per-mask instance, the same tone controls as relative strengths. The
// per-band detail sliders are opt-in (Preferences ▸ Basic) to keep the panel
// compact: Highlights and Shadows keep micro-contrast on their own, and these
// only expose manual control over it. Auto acts on the whole photo, so the
// mask instance has none, and it waits for the first rendered frame.

import { React, api } from "./rt";
import type { DevelopParams, MaskPanelContribution, MaskTone } from "./safelight";
import { DETAIL_SLIDERS } from "./settings";
import { cls } from "./styles";

// The ranges match core's histogram, whose draggable zones move Exposure,
// Highlights, Shadows, Whites and Blacks too.
const SLIDERS: {
  key: keyof DevelopParams;
  label: string;
  /** Slider-icon contribution id; `core.<key>` unless set. The detail
   *  sliders borrow their band's icon so they read as a sub-control. */
  icon?: string;
  detail?: true;
}[] = [
  { key: "exposure", label: "Exposure" },
  { key: "contrast", label: "Contrast" },
  { key: "highlights", label: "Highlights" },
  { key: "highlightDetail", label: "Highlight Detail", icon: "core.highlights", detail: true },
  { key: "shadows", label: "Shadows" },
  { key: "shadowDetail", label: "Shadow Detail", icon: "core.shadows", detail: true },
  { key: "whites", label: "Whites" },
  { key: "blacks", label: "Blacks" },
  { key: "texture", label: "Texture" },
  { key: "clarity", label: "Clarity" },
  { key: "dehaze", label: "Dehaze" },
  { key: "vibrance", label: "Vibrance" },
  { key: "saturation", label: "Saturation" },
];

export const BASIC_KEYS: (keyof DevelopParams)[] = SLIDERS.map((s) => s.key);

function useDetailSliders(): boolean {
  const read = () => api.settings.get(DETAIL_SLIDERS, false);
  const [show, setShow] = React.useState(read);
  React.useEffect(() => api.settings.onChange(() => setShow(read())), []);
  return show;
}

export function BasicPanel() {
  const { Panel, Slider, AutoButton } = api.components;
  const useDevelopStore = api.stores.useDevelopStore;
  const params = useDevelopStore((s) => s.params);
  const setParam = useDevelopStore((s) => s.setParam);
  const commitEdit = useDevelopStore((s) => s.commitEdit);
  const hasHistogram = useDevelopStore((s) => s.histogram != null);
  const showDetail = useDetailSliders();

  return (
    <Panel title="Basic">
      <AutoButton onClick={() => void api.develop.autoAdjust.tone()} disabled={!hasHistogram} title="Auto tone" />
      <div className={cls.sliders}>
        {SLIDERS.filter((s) => showDetail || !s.detail).map((s) => (
          <Slider
            key={s.key}
            icon={s.icon ?? `core.${s.key}`}
            label={s.label}
            value={params[s.key]}
            min={s.key === "exposure" ? -5 : -100}
            max={s.key === "exposure" ? 5 : 100}
            step={s.key === "exposure" ? 0.1 : 1}
            onChange={(v) => setParam(s.key, v)}
            onCommit={() => void commitEdit(s.label)}
          />
        ))}
      </div>
    </Panel>
  );
}

// The same tone controls as relative strengths on the masks' local scale (all
// -100 to 100, unlike global Exposure's stops), without the detail sliders,
// which have no local equivalent. A mask's Texture, Clarity and Dehaze are in
// its Detail sub-panel.
const MASK_SLIDERS: { key: keyof MaskTone; label: string }[] = [
  { key: "exposure", label: "Exposure" },
  { key: "contrast", label: "Contrast" },
  { key: "highlights", label: "Highlights" },
  { key: "shadows", label: "Shadows" },
  { key: "whites", label: "Whites" },
  { key: "blacks", label: "Blacks" },
  { key: "saturation", label: "Saturation" },
  { key: "vibrance", label: "Vibrance" },
];

function BasicMaskPanel() {
  const { Slider } = api.components;
  const scope = api.develop.useMaskScope();
  return (
    <div className={cls.sliders}>
      {MASK_SLIDERS.map((s) => (
        <Slider
          key={s.key}
          label={s.label}
          value={scope.adj[s.key]}
          min={-100}
          max={100}
          step={1}
          defaultValue={0}
          onChange={(v) => scope.setAdj({ [s.key]: v })}
          onCommit={() => scope.commit(`Mask ${s.label}`)}
        />
      ))}
    </div>
  );
}

export const BASIC_MASK_PANEL: MaskPanelContribution = {
  component: BasicMaskPanel,
  order: 10,
  owns: MASK_SLIDERS.map((s) => s.key),
};
