/** The brain's actions, and how each one becomes Excalidraw elements.
 *
 * Field names match the Action classes in ../../brain/excalidraw_brain.py, which
 * in turn match Excalidraw's own element-skeleton vocabulary — so the mapping
 * below is mostly a rename from snake_case.
 */
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";

export type DrawShape = {
  shape: "rectangle" | "ellipse" | "diamond";
  x: number;
  y: number;
  width: number;
  height: number;
  stroke_color: string;
  background_color: string;
  label: string;
};

export type DrawArrow = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke_color: string;
  label: string;
  arrowhead: boolean;
};

export type DrawText = {
  text: string;
  x: number;
  y: number;
  font_size: number;
  stroke_color: string;
};

type Skeleton = Parameters<typeof convertToExcalidrawElements>[0][number];

export function shapeSkeleton(a: DrawShape): Skeleton {
  return {
    type: a.shape,
    x: a.x,
    y: a.y,
    width: a.width,
    height: a.height,
    strokeColor: a.stroke_color,
    backgroundColor: a.background_color,
    // A transparent shape with a fill style still reads as an outline, so the
    // fill style only matters once the brain actually asked for a colour.
    fillStyle: "solid",
    ...(a.label ? { label: { text: a.label } } : {}),
  } as Skeleton;
}

export function arrowSkeleton(a: DrawArrow): Skeleton {
  const dx = a.x2 - a.x1;
  const dy = a.y2 - a.y1;
  return {
    type: a.arrowhead ? "arrow" : "line",
    x: a.x1,
    y: a.y1,
    width: dx,
    height: dy,
    points: [
      [0, 0],
      [dx, dy],
    ],
    strokeColor: a.stroke_color,
    ...(a.label ? { label: { text: a.label } } : {}),
  } as Skeleton;
}

export function textSkeleton(a: DrawText): Skeleton {
  return {
    type: "text",
    x: a.x,
    y: a.y,
    text: a.text,
    fontSize: a.font_size,
    strokeColor: a.stroke_color,
  } as Skeleton;
}
