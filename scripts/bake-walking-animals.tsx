import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp, { type OverlayOptions } from 'sharp';
import { PaintedAnimalArtwork } from '../src/components/PaintedAnimalArtwork';
import { animalPose } from '../src/lib/animalMotion';
import { createAnimalRenderer } from '../src/lib/renderAnimalPose';
import { animalProfiles } from '../src/lib/animalMotion';
import { WALK_SPRITE, WALK_SPRITE_DIRECTORY } from '../src/lib/walkingSprites';
import { walkingArtDigest } from './walking-art-inputs.mjs';

// Rasterize the actual attached rig offline, never generate motion by stretching
// a bitmap in the browser. This uses the same renderer as the joint diagnostics.
async function main() {
const preview = process.argv.includes('--preview');
const directory = preview ? 'artifacts/limb-study-v14' : `public${WALK_SPRITE_DIRECTORY}`;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const selector = '[data-animal-body], [data-animal-joint], [data-animal-fur-bridge], [data-paw], [data-animal-torso-panel], [data-animal-tail-panel], [data-animal-limb-skin], [data-animal-head-root], [data-animal-tail-root]';
const { width, height, scale, columns, frames, y } = WALK_SPRITE;
try {
  for (const id of ['dog', 'cat'] as const) {
    let svg = renderToStaticMarkup(<PaintedAnimalArtwork id={id} baked={false} />);
    // Embed each source painting once, rather than duplicating its bytes for
    // every skin patch. All original parts now share their selection atlas.
    const sources = [...new Set([...svg.matchAll(/<image href="([^"]+)" width="([^"]+)" height="([^"]+)"\s*\/?\s*>/g)].map(match => match[1]))];
    const definitions = [];
    for (const [index, source] of sources.entries()) {
      const image = svg.match(new RegExp(`<image href="${source}" width="([^"]+)" height="([^"]+)"`))!;
      const bytes = await readFile(`public${source.replace(/^\/timer/, '')}`);
      definitions.push(`<image id="bake-${index}" href="data:image/webp;base64,${bytes.toString('base64')}" width="${image[1]}" height="${image[2]}"/>`);
      svg = svg.replaceAll(new RegExp(`<image href="${source}" width="[^"]+" height="[^"]+"\s*\/?\s*>`, 'g'), `<use href="#bake-${index}"/>`);
    }
    svg = svg.replace('viewBox="0 0 160 210"', `viewBox="0 ${y} ${width} ${height}"`).replace(/(<svg[^>]*>)/, `$1<defs>${definitions.join('')}</defs>`);
    const page = await browser.newPage({ viewport: { width: width * scale, height: height * scale }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0;background:transparent}body>svg{display:block;width:${width * scale}px;height:${height * scale}px}</style>${svg}`);
    await page.evaluate(async () => {
      await Promise.all(Array.from(document.querySelectorAll('image'), async image => {
        const bitmap = new Image(); bitmap.src = image.getAttribute('href')!; await bitmap.decode();
      }));
    });
    const metadata = await page.locator(selector).evaluateAll(nodes => nodes.map(node => ({
      attributes: Object.fromEntries(Array.from(node.attributes, attr => [attr.name, attr.value])),
      dataset: { ...(node as HTMLElement).dataset },
    })));
    const updates = new Map<number, string>();
    const nodes = metadata.map((node, index) => ({ ...node, setAttribute: (_name: string, value: string) => updates.set(index, value) }));
    const matches = (selector: string) => nodes.filter(node => Object.hasOwn(node.attributes, selector.slice(1, -1)));
    const root = { querySelector: (selector: string) => matches(selector)[0], querySelectorAll: matches } as unknown as Element;
    const draw = createAnimalRenderer(root, id);
    const cells: OverlayOptions[] = [];
    const samples = preview ? [0, 32, 64, 96] : Array.from({ length: frames }, (_, index) => index);
    for (const frame of samples) {
      draw(animalPose(id, frame / frames * animalProfiles[id].cycleMs));
      await page.evaluate(({ selector, updates }) => {
        const nodes = document.querySelectorAll(selector);
        for (const [index, value] of updates) nodes[index].setAttribute('transform', value);
      }, { selector, updates: [...updates] });
      const index = preview ? cells.length : frame;
      cells.push({ input: await page.screenshot({ omitBackground: true }), left: index % (preview ? 2 : columns) * width * scale, top: Math.floor(index / (preview ? 2 : columns)) * height * scale });
    }
    const sheet = sharp({ create: { width: width * scale * (preview ? 2 : columns), height: height * scale * (preview ? 2 : Math.ceil(frames / columns)), channels: 4, background: preview ? '#e6eee0' : '#00000000' } }).composite(cells);
    if (preview) await sheet.png().toFile(`${directory}/${id}.png`);
    else await sheet.webp({ quality: 94, alphaQuality: 100, effort: 6 }).toFile(`${directory}/${id}.webp`);
    await page.close();
    console.log(`${id}: ${samples.length} attached gait frames, ${width * scale}×${height * scale}px`);
  }
} finally { await browser.close(); }
if (!preview) await writeFile(`${directory}/manifest.json`, JSON.stringify({ sources: await walkingArtDigest(), ...WALK_SPRITE }, null, 2) + '\n');
}
void main();
