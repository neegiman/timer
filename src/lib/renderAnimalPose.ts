import { animalProfiles, type animalPose, type AnimalId, type AnimalJoint, type PawName } from './animalMotion';
import { isWalker, torsoOffset, torsoPanelMatrix, tailPanelMatrix } from './animalBodyMotion';
import { animalMatrix, limbSkinMatrix, limbSkinTriangles } from './animalLimbSkin';
import { walkingFrame, walkingFrameViewBox } from './walkingSprites';

const decodedSprites = new Map<string, Promise<void>>();
function decodeSprite(source: string) {
  if (!decodedSprites.has(source)) {
    const image = new Image(); image.src = source;
    decodedSprites.set(source, image.decode().catch(() => { decodedSprites.delete(source); throw new Error('Walking painting could not decode'); }));
  }
  return decodedSprites.get(source)!;
}

/** Cache SVG nodes once. The same renderer drives the main view, miniature and study. */
export function createAnimalRenderer(root: Element | null | undefined, id: AnimalId) {
  const body = root?.querySelector<SVGGElement>('[data-animal-body]');
  const joints = Array.from(root?.querySelectorAll<SVGGElement>('[data-animal-joint]') ?? [])
    .map((node) => ({ node, name: node.dataset.animalJoint as AnimalJoint }));
  const paws = Array.from(root?.querySelectorAll<SVGGElement>('[data-paw]') ?? [])
    .map((node) => ({ node, rig: animalProfiles[id].paws[node.dataset.paw as PawName]! }));
  const torso = Array.from(root?.querySelectorAll<SVGGElement>('[data-animal-torso-panel]') ?? []);
  const tail = Array.from(root?.querySelectorAll<SVGGElement>('[data-animal-tail-panel]') ?? []);
  const skins = Array.from(root?.querySelectorAll<SVGGElement>('[data-animal-limb-skin]') ?? []).map((node) => {
    const paw = node.dataset.pawSkin as PawName, rig = animalProfiles[id].paws[paw]!;
    return { node, paw, triangle: limbSkinTriangles(rig.upper)[Number(node.dataset.animalLimbSkin)] };
  });
  const headRoot = root?.querySelector<SVGGElement>('[data-animal-head-root]');
  const tailRoot = root?.querySelector<SVGGElement>('[data-animal-tail-root]');
  const sprite = root?.querySelector<SVGSVGElement>('[data-animal-walk-sprite]');
  let usingSprite = !!sprite && sprite.style.display !== 'none';
  let latest: [ReturnType<typeof animalPose>, number | undefined] | undefined;
  const draw = (pose: ReturnType<typeof animalPose>, walkingTime?: number) => {
    latest = [pose, walkingTime];
    const useSprite = walkingTime !== undefined && isWalker(id) && sprite?.dataset.loaded === 'true';
    if (useSprite !== usingSprite) {
      if (body) body.style.display = useSprite ? 'none' : '';
      if (sprite) sprite.style.display = useSprite ? '' : 'none';
      if (sprite && !useSprite) sprite.dataset.frame = '0';
      usingSprite = useSprite;
    }
    if (useSprite && sprite && isWalker(id)) {
      const frame = walkingFrame(id, walkingTime!);
      if (sprite.dataset.frame !== String(frame)) {
        sprite.setAttribute('viewBox', walkingFrameViewBox(frame));
        sprite.dataset.frame = String(frame);
      }
      return;
    }
    body?.setAttribute('transform', `translate(0 ${pose.bob.toFixed(5)})`);
    for (const { node, name } of joints) node.setAttribute('transform', `rotate(${pose.joints[name].toFixed(5)})`);
    if (!isWalker(id)) return;
    for (const { node, rig } of paws) node.setAttribute('transform', `translate(${rig.x} ${(rig.y + torsoOffset(id, pose.body.torso, rig.x)).toFixed(5)})`);
    headRoot?.setAttribute('transform', `translate(0 ${pose.body.headY.toFixed(5)})`);
    tailRoot?.setAttribute('transform', `translate(0 ${pose.body.tailY.toFixed(5)})`);
    for (const [index, node] of torso.entries()) node.setAttribute('transform', animalMatrix(torsoPanelMatrix(id, pose.body, index)));
    for (const [index, node] of tail.entries()) node.setAttribute('transform', animalMatrix(tailPanelMatrix(pose.body, index)));
    for (const { node, paw, triangle } of skins) node.setAttribute('transform', animalMatrix(limbSkinMatrix(id, paw, pose.body, pose.joints[`${paw}Hip`], triangle)));
  };
  const image = sprite?.querySelector<SVGImageElement>('image');
  if (image) void decodeSprite(image.href.baseVal).then(() => {
    sprite!.dataset.loaded = 'true';
    if (latest && sprite!.isConnected) draw(...latest);
  }).catch(() => { /* Keep the complete live rig as the asset-load fallback. */ });
  return draw;
}
