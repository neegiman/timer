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
    // Side-on flight: nose points right and exhaust trails left on the horizontal y=30 axis.
    if (moving) {
      const pulse = [0, 1, 2, 1, 0, 2, 1, 2][phase];
      polygon([[10, 26], [6, 25], [7, 27], [3 - pulse, 29], [3 - pulse, 31], [7, 33], [6, 35], [10, 34]], 'F');
      polygon([[10, 27], [7, 27], [5 - pulse, 29], [5 - pulse, 31], [7, 33], [10, 33]], 'f');
      polygon([[10, 28], [8, 28], [6 - pulse, 30], [8, 32], [10, 32]], 'g');
    }
    polygon([[20, 25], [15, 21], [8, 18], [10, 26], [13, 28]], 'O');
    polygon([[20, 35], [15, 39], [8, 42], [10, 34], [13, 32]], 'O');
    polygon([[17, 25], [13, 23], [10, 21], [12, 26], [14, 27]], 'R');
    polygon([[17, 35], [13, 37], [10, 39], [12, 34], [14, 33]], 'R');
    polygon([[39, 30], [35, 26], [29, 23], [16, 22], [11, 25], [10, 27], [10, 33], [11, 35], [16, 38], [29, 37], [35, 34]], 'O');
    polygon([[37, 30], [34, 27], [28, 25], [16, 24], [13, 26], [12, 28], [12, 32], [13, 34], [16, 36], [28, 35], [34, 33]], 'W');
    polygon([[37, 30], [34, 27], [29, 25], [29, 35], [34, 33]], 'R');
    pixel(38, 29, 'O');
    rect(13, 26, 2, 8, 'G');
    rect(9, 26, 4, 8, 'O'); rect(10, 27, 1, 6, 'G'); rect(9, 28, 1, 4, 'T');
    // Mirror the outline and flame before adding upright facial features and lighting.
    for (let y = 12; y < 30; y++) canvas.pixels[59 - y] = [...canvas.pixels[y]];
    rect(31, 27, 3, 1, 'P'); rect(16, 35, 12, 1, 'w');
    disc(23, 30, 6, 'O'); disc(23, 30, 5, 'G'); disc(23, 30, 4, 'B');
    rect(21, 27, 2, 1, 'b'); rect(20, 28, 1, 2, 'W');
    rect(20, 30, 1, wink ? 1 : 2, 'O'); rect(25, 30, 1, wink ? 1 : 2, 'O');
    line(21, 33, 22, 34, 'O'); line(22, 34, 23, 34, 'O'); line(23, 34, 24, 33, 'O');
    if (moving && phase % 3 === 0) rect(16, 29, 1, 2, 'g');
  }
  return { pixels: canvas.pixels, paths: canvas.paths() };
}
