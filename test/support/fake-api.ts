// A stand-in Safelight API over real React and zustand. The develop store holds
// Basic's thirteen params and whether a frame has a histogram, the way core's
// does, and records every write; the extension's settings and the Auto Tone
// runs are kept as core would keep them. Core's Panel draws its children, and
// core's Slider and AutoButton are stubs that keep the props they were last
// rendered with, so a test can drive them the way the real ones would.

import * as React from "react";
import { create } from "zustand";
import type {
  AutoButtonProps,
  DevelopParams,
  DevelopStoreState,
  MaskScope,
  MaskTone,
  PanelContribution,
  PanelProps,
  ProcessingStageContribution,
  SafelightAPI,
  SettingsContribution,
  SliderProps,
  StoreApi,
  StylesheetContribution,
} from "../../src/safelight";

export type DevelopCall =
  | { setParam: keyof DevelopParams; value: number }
  | { commitEdit: string }
  | { resetParams: (keyof DevelopParams)[]; label: string };

export const DEFAULTS: DevelopParams = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  highlightDetail: 0,
  shadows: 0,
  shadowDetail: 0,
  whites: 0,
  blacks: 0,
  texture: 0,
  clarity: 0,
  dehaze: 0,
  vibrance: 0,
  saturation: 0,
};

const NO_MASK_TONE: MaskTone = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  saturation: 0,
  vibrance: 0,
};

export interface Rig {
  api: SafelightAPI;
  develop: StoreApi<DevelopStoreState>;
  calls: DevelopCall[];
  /** How many times Auto Tone ran. */
  autoTones: number;
  panels: PanelContribution[];
  stages: ProcessingStageContribution[];
  stylesheets: StylesheetContribution[];
  settingsSections: SettingsContribution[];
  /** Change one of this extension's settings, as Preferences would. */
  setSetting(key: string, value: unknown): void;
  /** The latest props of each slider drawn in `root`, in document order. */
  sliders(root: ParentNode): SliderProps[];
  /** The props core's AutoButton was last rendered with. */
  auto(): AutoButtonProps;
  mask: { adj: MaskTone; commits: string[] };
}

export function fakeApi({
  histogram = true,
  params = {} as Partial<DevelopParams>,
  settings = {} as Record<string, unknown>,
} = {}): Rig {
  const calls: DevelopCall[] = [];
  const panels: PanelContribution[] = [];
  const stages: ProcessingStageContribution[] = [];
  const stylesheets: StylesheetContribution[] = [];
  const settingsSections: SettingsContribution[] = [];
  const stored = { ...settings };
  const settingListeners = new Set<(key: string, value: unknown) => void>();
  const mask: Rig["mask"] = { adj: { ...NO_MASK_TONE }, commits: [] };
  const maskStore = create<{ adj: MaskTone }>(() => ({ adj: mask.adj }));
  const sliderProps = new Map<number, SliderProps>();
  let nextSlider = 0;
  let lastAuto: AutoButtonProps | null = null;

  const develop: StoreApi<DevelopStoreState> = create<DevelopStoreState>()((set) => ({
    params: { ...DEFAULTS, ...params },
    histogram: histogram ? {} : null,
    setParam: (key, value) => {
      calls.push({ setParam: key, value });
      set((s) => ({ params: { ...s.params, [key]: value } }));
    },
    commitEdit: async (label) => {
      calls.push({ commitEdit: label });
    },
    resetParams: async (keys, label) => {
      calls.push({ resetParams: keys, label });
      set({ params: { ...DEFAULTS } });
    },
  }));

  function Panel({ children, title }: PanelProps) {
    return React.createElement("section", { "aria-label": title }, children);
  }

  function Slider(props: SliderProps) {
    const id = React.useRef(nextSlider++).current;
    sliderProps.set(id, props);
    return React.createElement("div", { "data-slider": id }, `${props.label} ${props.value}`);
  }

  function AutoButton(props: AutoButtonProps) {
    lastAuto = props;
    return React.createElement("button", { type: "button", disabled: props.disabled, onClick: props.onClick }, "Auto");
  }

  const rig: Rig = {
    api: undefined as unknown as SafelightAPI,
    develop,
    calls,
    autoTones: 0,
    panels,
    stages,
    stylesheets,
    settingsSections,
    setSetting: (key, value) => {
      stored[key] = value;
      for (const cb of settingListeners) cb(key, value);
    },
    sliders: (root) =>
      [...root.querySelectorAll("[data-slider]")].map((el) => {
        const props = sliderProps.get(Number(el.getAttribute("data-slider")));
        if (!props) throw new Error("a slider without props");
        return props;
      }),
    auto: () => {
      if (!lastAuto) throw new Error("AutoButton has not rendered");
      return lastAuto;
    },
    mask,
  };

  rig.api = {
    version: 1,
    extensionId: "safelight.basic",
    react: React,
    registerPanel: (c) => void panels.push(c),
    registerProcessingStage: (c) => void stages.push(c),
    registerStylesheet: (c) => void stylesheets.push(c),
    registerSettings: (c) => void settingsSections.push(c),
    settings: {
      get: <T>(key: string, fallback: T): T => (key in stored ? (stored[key] as T) : fallback),
      onChange: (cb) => {
        settingListeners.add(cb);
        return () => void settingListeners.delete(cb);
      },
    },
    components: { Panel, Slider, AutoButton },
    stores: { useDevelopStore: develop },
    develop: {
      useMaskScope: (): MaskScope => {
        const adj = maskStore((s) => s.adj);
        return {
          adj,
          setAdj: (partial) => {
            mask.adj = { ...mask.adj, ...partial };
            maskStore.setState({ adj: mask.adj });
          },
          commit: (label) => void mask.commits.push(label),
        };
      },
      autoAdjust: {
        tone: async () => {
          rig.autoTones++;
        },
      },
    },
  };

  return rig;
}
