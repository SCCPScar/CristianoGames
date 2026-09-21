// Tetris plays best tall and narrow; Zuma's spiral wants a wide board.
// Rather than force one orientation for the whole app, each scene asks
// for the shape it needs when it starts.
export const PORTRAIT_SIZE = { width: 412, height: 915 };
// Width was 1000 before, but at that extreme an aspect ratio the spiral
// (whose own proportions are fixed) left a big flat, untouched patch of
// board on the left/right where no winding ever reaches — dialed back
// closer to typical device aspect ratios.
export const LANDSCAPE_SIZE = { width: 900, height: 480 };

/// Resizes the Phaser game to the target shape and asks the OS/browser to
/// physically rotate the screen to match. The rotation lock is
/// best-effort — it needs a fullscreen-ish context to work in most
/// browsers, which a Capacitor WebView provides, but a plain browser tab
/// may ignore it. The resize (and thus the in-game layout) always applies
/// regardless.
export function setOrientation(scene, mode) {
  const size = mode === 'portrait' ? PORTRAIT_SIZE : LANDSCAPE_SIZE;
  if (scene.scale.width !== size.width || scene.scale.height !== size.height) {
    // setGameSize (not resize — that one's for the NONE scale mode) is
    // the correct call to change the base design resolution FIT scales
    // from; it also re-fits the canvas against its parent immediately.
    scene.scale.setGameSize(size.width, size.height);
  }
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock(mode).catch(() => {});
  }
}
