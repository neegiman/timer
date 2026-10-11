/** Measure the landmark painted INSIDE the bitmap, not merely its DOM origin.
 * This function is serialized into the browser by Playwright. */
export function destinationLandmarks(options: { layout?: boolean; monitor?: boolean } = {}) {
  const read = () => {
    const shell = document.querySelector<HTMLElement>('.app-shell')!;
    const scrollY = options.layout ? window.scrollY + (shell.dataset.display === 'expanded' ? shell.scrollTop : 0) : 0;
    const scrollX = options.layout ? window.scrollX : 0;
    const points = ['.journey-scene', '.destination-paint', '.progress-endpoints > span:last-child'].map((selector) => {
      const box = document.querySelector(selector)!.getBoundingClientRect();
      return { selector, x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height };
    });
    const paint = document.querySelector<HTMLElement>('.destination-paint')!;
    const box = paint.getBoundingClientRect();
    points.push({ selector: 'painted landmark',
      x: box.x + Number(paint.dataset.anchorX) / Number(paint.dataset.sourceWidth) * box.width + scrollX,
      y: box.y + Number(paint.dataset.anchorY) / Number(paint.dataset.sourceHeight) * box.height + scrollY,
      width: 0, height: 0 });
    return points;
  };
  const points = read();
  if (options.monitor) {
    const ranges = points.map((point) => ({ ...point, minX: point.x, maxX: point.x, minY: point.y, maxY: point.y }));
    const monitor = { ranges, frame: 0 };
    (window as typeof window & { destinationMonitor?: typeof monitor }).destinationMonitor = monitor;
    const sample = () => {
      for (const [index, point] of read().entries()) {
        const range = ranges[index];
        range.minX = Math.min(range.minX, point.x); range.maxX = Math.max(range.maxX, point.x);
        range.minY = Math.min(range.minY, point.y); range.maxY = Math.max(range.maxY, point.y);
      }
      monitor.frame = requestAnimationFrame(sample);
    };
    sample();
  }
  return points;
}
