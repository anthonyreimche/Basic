// Basic's stages that declare dormantWhen, on the real renderer (run via
// `npm run test:gpu`): at their sliders' rest values each leaves the frame as
// it would be without the stage, and the live view leaves it out; move a slider
// and it is back in and the frame changes. The tone block declares no rule and
// has no case here: at rest it still applies the default shoulder and the camera
// match's lift.

import { proveDormancy } from "./dormancy-rig";
import { BAND_DETAIL_STAGE_ID, DISPLAY_STAGE_ID, PRESENCE_STAGE_ID, VIBRANCE_STAGE_ID, basicStages } from "@ext/stages";

const BASIC = "safelight.basic";
const stages = (line: 1 | 2 | 3) => basicStages(line);

// Line 1 is version 1's text, which an installed 1.x release also runs on a
// version 2 or 3 photo; lines 2 and 3 are version 2's and 3's.
const EVERY_LINE = [1, 2, 3] as const;
const LATER_LINES = [2, 3] as const;

proveDormancy(BASIC, stages, {
  title: "Whites, Blacks & Contrast",
  stageId: DISPLAY_STAGE_ID,
  lines: EVERY_LINE,
  moves: { "Whites": { whites: 40 }, "Blacks": { blacks: -40 }, "Contrast": { contrast: 60 } },
});

proveDormancy(BASIC, stages, {
  title: "Dehaze, Clarity & Texture",
  stageId: PRESENCE_STAGE_ID,
  lines: EVERY_LINE,
  moves: { "Texture": { texture: 100 }, "Clarity": { clarity: 100 }, "Dehaze": { dehaze: 60 } },
});

proveDormancy(BASIC, stages, {
  title: "Highlight & Shadow Detail",
  stageId: BAND_DETAIL_STAGE_ID,
  lines: LATER_LINES,
  moves: { "Highlight Detail": { highlightDetail: 80 }, "Shadow Detail": { shadowDetail: -80 } },
});

proveDormancy(BASIC, stages, {
  title: "Vibrance & Saturation",
  stageId: VIBRANCE_STAGE_ID,
  lines: LATER_LINES,
  moves: { "Vibrance": { vibrance: 60 }, "Saturation": { saturation: -50 } },
});
