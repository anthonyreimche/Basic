// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// Registers the Develop "Basic" panel with its mask instance, Preferences ▸
// Basic, and Basic's five stages of this release's line. It was core's
// built-in `core.basic` until Safelight 3.2.0 and keeps that panel id, so
// saved layouts and masks keep it where it was.

import { BASIC_KEYS, BASIC_MASK_PANEL, BasicPanel } from "./BasicPanel";
import { initRuntime } from "./rt";
import type { Line, SafelightAPI } from "./safelight";
import { BASIC_SETTINGS } from "./settings";
import { basicStages } from "./stages";
import { basicCss } from "./styles";

export const PANEL_ID = "core.basic";
export const STYLESHEET_ID = "safelight.basic.styles";

/** The release line: this release's major version (vite.config.ts). */
export const LINE = __SAFELIGHT_LINE__ as Line;

export function activate(host: SafelightAPI): void {
  initRuntime(host);
  host.registerStylesheet({ id: STYLESHEET_ID, css: basicCss() });
  for (const stage of basicStages(LINE)) host.registerProcessingStage(stage);
  host.registerPanel({
    id: PANEL_ID,
    title: "Basic",
    component: BasicPanel,
    defaultDock: { module: "develop", direction: "right", order: 5, width: 280, height: 220 },
    onReset: () => void host.stores.useDevelopStore.getState().resetParams(BASIC_KEYS, "Reset Basic"),
    mask: BASIC_MASK_PANEL,
  });
  host.registerSettings(BASIC_SETTINGS);
}
