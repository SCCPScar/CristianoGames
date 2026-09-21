/// Reads the browser's CSS env(safe-area-inset-*) once (notches, gesture
/// navigation bars) and converts it from real CSS pixels into the game's
/// internal coordinate space, so scenes can keep edge-anchored controls
/// (back/pause buttons, on-screen d-pad) clear of the phone's own UI
/// without each one re-deriving the scale factor. Falls back to all-zero
/// insets wherever the browser doesn't report them (desktop browsers,
/// older WebViews) — callers still get a small baseline margin from their
/// own layout math, this only adds to it when the device actually needs it.
let cssInsets = null;

function readCssInsets() {
  if (cssInsets) return cssInsets;
  cssInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  try {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top,0px);padding-right:env(safe-area-inset-right,0px);' +
      'padding-bottom:env(safe-area-inset-bottom,0px);padding-left:env(safe-area-inset-left,0px);';
    document.body.appendChild(probe);
    const style = getComputedStyle(probe);
    cssInsets = {
      top: parseFloat(style.paddingTop) || 0,
      right: parseFloat(style.paddingRight) || 0,
      bottom: parseFloat(style.paddingBottom) || 0,
      left: parseFloat(style.paddingLeft) || 0,
    };
    probe.remove();
  } catch {
    // Leave insets at zero.
  }
  return cssInsets;
}

/// Returns { top, right, bottom, left } safe-area insets in the calling
/// scene's own internal coordinate units (already divided by the current
/// Phaser display scale).
export function getSafeAreaInsets(scene) {
  const css = readCssInsets();
  const displayScale = scene.scale.displayScale?.x || 1;
  return {
    top: css.top / displayScale,
    right: css.right / displayScale,
    bottom: css.bottom / displayScale,
    left: css.left / displayScale,
  };
}
