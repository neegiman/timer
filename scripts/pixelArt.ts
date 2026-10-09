/** Small integer-grid drawing tools for original pixel assets; no raster resampling. */
export function pixelCanvas<Color extends string>(width: number, height: number) {
  const pixels = Array.from({ length: height }, () => Array<Color | null>(width).fill(null));
  const pixel = (x: number, y: number, color: Color) => {
    if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < width && y >= 0 && y < height) pixels[y][x] = color;
  };
  const rect = (x: number, y: number, w: number, h: number, color: Color) => {
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) pixel(px, py, color);
  };
  const polygon = (points: number[][], color: Color) => {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [ax, ay] = points[i], [bx, by] = points[j];
        if ((ay > y + .5) !== (by > y + .5) && x + .5 < (bx - ax) * (y + .5 - ay) / (by - ay) + ax) inside = !inside;
      }
      if (inside) pixel(x, y, color);
    }
  };
  const disc = (cx: number, cy: number, radius: number, color: Color) => {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= radius ** 2) pixel(x, y, color);
  };
  const line = (ax: number, ay: number, bx: number, by: number, color: Color) => {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))));
    for (let i = 0; i <= steps; i++) pixel(Math.round(ax + (bx - ax) * i / steps), Math.round(ay + (by - ay) * i / steps), color);
  };
  const paths = () => {
    const result: Partial<Record<Color, string>> = {};
    for (let y = 0; y < height; y++) for (let x = 0; x < width;) {
      const color = pixels[y][x]; let end = x + 1;
      while (end < width && pixels[y][end] === color) end++;
      if (color) result[color] = (result[color] ?? '') + `M${x} ${y}h${end - x}v1h${x - end}z`;
      x = end;
    }
    return result;
  };
  return { pixels, pixel, rect, polygon, disc, line, paths };
}
