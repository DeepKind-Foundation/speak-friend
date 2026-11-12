/** A rectangle in window coordinates. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type Side = "start" | "end";
export type Edge = "bottom" | "top";
/** Where the guide is docked: a logical side of the window and the edge it sits on. */
export interface Dock {
  side: Side;
  edge: Edge;
}

export interface DockInput {
  target: Box;
  guide: { width: number; height: number };
  viewport: { width: number; height: number };
  /** Space between the guide and the window edge, in px. */
  gap: number;
  /** The side the app asked for. */
  side: Side;
  rtl: boolean;
  /** Room kept around the target, for its ring. */
  margin: number;
}

const overlaps = (a: Box, b: Box): boolean =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** The window area the guide covers when docked at `dock`. A guide as wide as the window is a sheet on that edge. */
function coverage({ guide, viewport, gap, rtl }: DockInput, dock: Dock): Box {
  const sheet = guide.width > viewport.width - 2 * gap;
  const gapY = sheet ? 0 : gap;
  const top = dock.edge === "top" ? gapY : viewport.height - gapY - guide.height;
  if (sheet) return { left: 0, right: viewport.width, top, bottom: top + guide.height };
  const right = (dock.side === "end") !== rtl;
  const left = right ? viewport.width - gap - guide.width : gap;
  return { left, right: left + guide.width, top, bottom: top + guide.height };
}

const other = (side: Side): Side => (side === "end" ? "start" : "end");

/**
 * Where the guide leaves the target uncovered: the side the app asked for, then the other side, then the same two on
 * the top edge. When every place covers it, the app's choice is kept.
 */
export function chooseDock(input: DockInput): Dock {
  const { target, viewport, margin, side } = input;
  const area: Box = {
    left: Math.max(target.left - margin, 0),
    top: Math.max(target.top - margin, 0),
    right: Math.min(target.right + margin, viewport.width),
    bottom: Math.min(target.bottom + margin, viewport.height),
  };
  const visible = area.right > area.left && area.bottom > area.top;
  const options: Dock[] = [
    { side, edge: "bottom" },
    { side: other(side), edge: "bottom" },
    { side, edge: "top" },
    { side: other(side), edge: "top" },
  ];
  if (!visible) return options[0]!;
  return options.find((dock) => !overlaps(coverage(input, dock), area)) ?? options[0]!;
}
