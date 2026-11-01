// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// Preferences ▸ Basic. The detail sliders were core's Interface preference
// until Safelight 3.2.0, which carried its value over to this setting.

import type { SettingsContribution } from "./safelight";

export const DETAIL_SLIDERS = "detailSliders";

export const BASIC_SETTINGS: SettingsContribution = {
  title: "Basic",
  order: 40,
  keywords: ["highlight detail", "shadow detail", "micro-contrast", "sliders"],
  fields: [
    {
      key: DETAIL_SLIDERS,
      label: "Highlight & shadow detail sliders",
      hint: "Add Highlight Detail and Shadow Detail sliders to the Basic panel for per-band micro-contrast control. Off by default to keep the panel compact — Highlights and Shadows already keep texture on their own; turn this on to add or soften fine detail per band.",
      type: "boolean",
      default: false,
    },
  ],
};
