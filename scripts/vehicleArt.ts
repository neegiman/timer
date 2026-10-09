import { pixelCanvas } from './pixelArt';
import type { PixelVehicleId } from '../src/lib/pixelVehicles';

// Original 40×48 artwork. The dark outline and warm 16-color palette match the pixel prince.
export const vehiclePalette = {
  O: '#29324b', D: '#445674', T: '#697a8e', W: '#fff1ce', w: '#d8d9bd',
  R: '#d56857', r: '#a8484c', P: '#ee9d70', G: '#e9ad44', g: '#ffe58f',
  B: '#81b9ca', b: '#b9dfe0', C: '#61957a', c: '#93bc8b', F: '#ee8847', f: '#ffd17b',
} as const;
type Color = keyof typeof vehiclePalette;

export function buildVehicleFrame(id: PixelVehicleId, frame: number) {
  const canvas = pixelCanvas<Color>(40, 48), { rect, polygon, disc, line, pixel } = canvas;
  const moving = frame >= 1 && frame <= 8, phase = moving ? frame - 1 : 0;
  const happy = frame >= 11, wink = happy && frame === 12;
  const wheel = (x: number) => {
    disc(x, 44, 4, 'O'); disc(x, 44, 2.8, 'T'); disc(x, 44, 1.8, 'W');
    const angle = phase / 8 * Math.PI * 2;
    for (let spoke = 0; spoke < 3; spoke++) {
      const a = angle + spoke * Math.PI * 2 / 3;
      line(x - .5, 43.5, x - .5 + Math.cos(a) * 2, 43.5 + Math.sin(a) * 2, 'G');
    }
    rect(x - 1, 43, 2, 2, 'D');
  };
  if (id === 'car') {
    polygon([[3, 33], [8, 31], [12, 23], [25, 23], [31, 31], [36, 33], [38, 36], [38, 43], [2, 43], [2, 36]], 'O');
    polygon([[4, 34], [10, 32], [14, 25], [24, 25], [30, 33], [35, 34], [36, 37], [36, 41], [4, 41]], 'R');
    polygon([[13, 26], [18, 26], [18, 32], [10, 32]], 'B');
    polygon([[20, 26], [24, 26], [28, 32], [20, 32]], 'b');
    line(14, 27, 17, 27, 'W'); line(21, 27, 24, 30, 'W');
    rect(5, 34, 29, 1, 'P'); rect(4, 39, 32, 2, 'r'); rect(4, 38, 32, 1, 'W');
    rect(19, 33, 1, 5, 'r'); rect(21, 34, 3, 1, 'G');
    rect(2, 36, 3, 2, 'r'); rect(34, 35, 3, 3, happy ? 'g' : 'W');
    rect(1, 40, 4, 2, 'T'); rect(34, 40, 5, 2, 'T');
    // A cheerful face in the front window; no flashing warning colors.
    rect(22, 29, 1, wink ? 1 : 2, 'O'); rect(26, 30, 1, wink ? 1 : 2, 'O');
    line(28, 36, 29, 37, 'O'); line(29, 37, 31, 36, 'O');
    wheel(10); wheel(30);
  } else if (id === 'train') {
    // Rear cab on the left, chimney and locomotive front on the right.
    rect(4, 22, 13, 20, 'O'); rect(6, 24, 9, 17, 'C'); rect(5, 21, 12, 2, 'O'); rect(3, 20, 16, 2, 'O'); rect(5, 20, 12, 1, 'c');
    rect(8, 26, 6, 9, 'O'); rect(9, 27, 4, 7, 'B'); rect(9, 27, 2, 1, 'W');
    rect(5, 37, 11, 2, 'G'); rect(14, 29, 20, 13, 'O'); rect(16, 30, 16, 10, 'C'); rect(16, 30, 16, 2, 'c');
    rect(17, 32, 2, 8, 'G'); rect(29, 31, 2, 9, 'G');
    rect(27, 23, 6, 7, 'O'); rect(28, 24, 4, 5, 'G'); rect(25, 21, 10, 3, 'O'); rect(27, 21, 6, 1, 'g');
    rect(33, 31, 3, 10, 'O'); rect(33, 32, 2, 7, 'G'); rect(34, 34, 1, 2, 'g');
    rect(2, 40, 35, 4, 'O'); rect(3, 41, 33, 2, 'G'); polygon([[35, 40], [39, 44], [34, 44]], 'O');
    rect(22, 33, 1, wink ? 1 : 2, 'O'); rect(26, 33, 1, wink ? 1 : 2, 'O');
    line(23, 37, 24, 38, 'O'); line(24, 38, 26, 37, 'O');
    wheel(9); wheel(20); wheel(31);
    const crank = Math.round(Math.sin(phase / 8 * Math.PI * 2) * 1);
    rect(9, 44 + crank, 23, 1, 'w'); pixel(9, 44 + crank, 'W'); pixel(20, 44 + crank, 'W'); pixel(31, 44 + crank, 'W');
    if (moving) {
      const puff = phase % 4;
      rect(28 - Math.floor(puff / 2), 17 - puff, 4, 2, 'w'); rect(27 - Math.floor(puff / 2), 18 - puff, 6, 2, 'W');
      rect(23 - puff, 11 - puff, 4, 2, 'w'); rect(22 - puff, 12 - puff, 6, 2, 'W');
    }
  } else {
    // One upright axis at x=20 aligns the nose, window, paired fins, nozzle and exhaust.
    if (moving) {
      const pulse = [0, 1, 2, 1, 0, 2, 1, 2][phase];
      polygon([[16, 37], [24, 37], [25, 40], [23, 43], [23, 41], [21, 45 + pulse], [19, 45 + pulse], [17, 41], [17, 43], [15, 40]], 'F');
      polygon([[17, 37], [23, 37], [23, 40], [21, 43 + pulse], [19, 43 + pulse], [17, 40]], 'f');
      polygon([[18, 37], [22, 37], [21, 40 + pulse], [19, 40 + pulse]], 'g');
    }
    polygon([[12, 23], [7, 28], [5, 39], [13, 36], [16, 30]], 'O');
    polygon([[28, 23], [33, 28], [35, 39], [27, 36], [24, 30]], 'O');
    polygon([[12, 26], [9, 29], [8, 36], [12, 34], [14, 29]], 'R');
    polygon([[28, 26], [31, 29], [32, 36], [28, 34], [26, 29]], 'R');
    polygon([[20, 2], [24, 6], [27, 12], [29, 20], [29, 31], [25, 36], [15, 36], [11, 31], [11, 20], [13, 12], [16, 6]], 'O');
    polygon([[20, 4], [23, 7], [25, 13], [27, 20], [27, 30], [24, 34], [16, 34], [13, 30], [13, 20], [15, 13], [17, 7]], 'W');
    polygon([[20, 4], [23, 7], [25, 13], [15, 13], [17, 7]], 'R');
    rect(13, 30, 14, 2, 'G'); rect(19, 28, 2, 1, 'G');
    rect(14, 34, 12, 4, 'O'); rect(16, 35, 8, 1, 'G'); rect(16, 37, 8, 1, 'T');
    // Mirror on the native grid so polygon boundary ties cannot offset the tip or exhaust by half a pixel.
    for (const row of canvas.pixels) for (let x = 0; x < 20; x++) row[39 - x] = row[x];
    rect(18, 8, 2, 3, 'P'); rect(24, 15, 2, 15, 'w');
    disc(20, 21, 6, 'O'); disc(20, 21, 5, 'G'); disc(20, 21, 4, 'B');
    rect(18, 18, 2, 1, 'b'); rect(17, 19, 1, 2, 'W');
    rect(17, 21, 1, wink ? 1 : 2, 'O'); rect(22, 21, 1, wink ? 1 : 2, 'O');
    line(18, 24, 19, 25, 'O'); line(19, 25, 20, 25, 'O'); line(20, 25, 21, 24, 'O');
    if (moving && phase % 3 === 0) rect(19, 14, 2, 1, 'g');
  }
  return { pixels: canvas.pixels, paths: canvas.paths() };
}
