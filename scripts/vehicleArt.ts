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
    // Stepped diagonal silhouette points forward; exhaust stays in its own lower-left pocket.
    if (moving) {
      const pulse = [0, 1, 2, 1, 0, 2, 1, 2][phase];
      polygon([[10, 32], [17, 37], [11, 42], [6 - pulse, 46], [7, 39], [3, 41], [7, 34]], 'F');
      polygon([[11, 34], [14, 37], [10, 41], [8, 42], [9, 37]], 'f');
      polygon([[11, 35], [13, 37], [10, 39]], 'g');
    }
    polygon([[13, 25], [6, 29], [4, 37], [12, 34], [19, 37], [19, 42], [26, 37], [28, 29]], 'O');
    polygon([[13, 27], [8, 30], [7, 34], [13, 32]], 'R'); polygon([[21, 29], [25, 30], [24, 36], [21, 38]], 'R');
    polygon([[28, 4], [32, 12], [31, 20], [27, 29], [18, 38], [9, 31], [14, 17], [21, 9]], 'O');
    polygon([[28, 7], [30, 13], [29, 20], [25, 28], [18, 35], [12, 30], [16, 18], [23, 11]], 'W');
    polygon([[28, 6], [31, 13], [30, 17], [23, 11]], 'R'); polygon([[28, 8], [29, 12], [27, 12]], 'P');
    polygon([[26, 28], [19, 35], [16, 33], [24, 26]], 'w');
    polygon([[10, 31], [17, 37], [15, 39], [8, 33]], 'O'); line(10, 33, 15, 37, 'G');
    disc(22, 22, 6, 'O'); disc(22, 22, 5, 'G'); disc(22, 22, 4, 'B');
    rect(20, 19, 2, 1, 'b'); rect(19, 20, 1, 2, 'W');
    rect(21, 22, 1, wink ? 1 : 2, 'O'); rect(24, 22, 1, wink ? 1 : 2, 'O');
    line(21, 25, 22, 26, 'O'); line(22, 26, 24, 25, 'O');
    if (moving && phase % 3 === 0) rect(25, 15, 1, 2, 'g');
  }
  return { pixels: canvas.pixels, paths: canvas.paths() };
}
