# Basic for Safelight

The Develop **Basic** panel: Exposure, Contrast, Highlights, Shadows, Whites,
Blacks, Texture, Clarity, Dehaze, Vibrance and Saturation, with Auto Tone.

- **Auto** sets Exposure, Contrast, Highlights, Shadows, Whites and Blacks
  from the photo's histogram, as one Undo step. It waits for the photo's
  first rendered frame.
- **Exposure** runs from −5 to +5 stops in tenths; every other slider from
  −100 to 100. Double-click a slider to put it back.
- **Highlight Detail** and **Shadow Detail** add or soften fine detail in
  the bright and dark bands. They are off by default; turn them on in
  Preferences ▸ Basic.
- Masks get relative Exposure, Contrast, Highlights, Shadows, Whites, Blacks,
  Saturation and Vibrance of their own.

Right-click the panel's header and choose **Reset to defaults** to put every
slider back as one step.

Until Safelight 3.2.0 this panel was built in. It keeps the built-in panel's
id (`core.basic`), so layouts saved before then keep it where it was, and
photos keep their adjustments. Safelight 3.2.0 carried the detail sliders'
Interface preference over to Preferences ▸ Basic. While the extension is off
or uninstalled, photos show without Basic's adjustments; Develop says so for
photos that had them. The default highlight roll-off and the camera match's
shadows lift are part of Basic's tone too, so they go with it. Masks' own
tone keeps rendering either way.

## Release lines

A release's major version is its line, the process version its stage text was
written for. Line 1 carries process version 1's text; lines 2 and 3 carry
version 2's (Basic has no version 3 text).

## Development

```bash
npm install
npm run typecheck
npm run build    # dist/index.js, the file Safelight loads
npm test         # vitest; the bundle checks read dist/, so build first
npm run check    # all three, in that order
```

`test/basic.test.tsx` pins each line's stage text with the same hashes as
Safelight's own copy (`src/rendering/webgl/essential-stages.test.ts` in the
app). Change both together.
