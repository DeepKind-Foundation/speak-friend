/** A rectangle in the coordinates of the window the guide is drawn in. */
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const px = (value: string): number => parseFloat(value) || 0;

/**
 * Where an element is, in the coordinates of this window. For an element in the page that is its bounding box. For one
 * inside an iframe, the box is moved by where the frame's content starts (its border and padding) and scaled by how
 * much the frame is scaled on screen, once for every frame between the element and this window.
 */
export function boxOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  let { left, top, width, height } = r;
  let win: Window | null = el.ownerDocument.defaultView;
  while (win && win !== window) {
    let frame: Element | null = null;
    try {
      frame = win.frameElement;
    } catch {
      // Not reachable from here: stop with what has been measured.
    }
    if (!frame) break;
    const outer = frame.getBoundingClientRect();
    const view = frame.ownerDocument.defaultView;
    const style = view ? view.getComputedStyle(frame) : null;
    const wide = (frame as HTMLElement).offsetWidth;
    const high = (frame as HTMLElement).offsetHeight;
    const sx = wide ? outer.width / wide : 1;
    const sy = high ? outer.height / high : 1;
    const ox = style ? px(style.borderLeftWidth) + px(style.paddingLeft) : 0;
    const oy = style ? px(style.borderTopWidth) + px(style.paddingTop) : 0;
    left = outer.left + (ox + left) * sx;
    top = outer.top + (oy + top) * sy;
    width *= sx;
    height *= sy;
    win = view;
  }
  return { left, top, width, height, right: left + width, bottom: top + height };
}
