import { animalProfiles, type animalPose, type AnimalId, type AnimalJoint, type PawName } from './animalMotion';
import { isWalker, torsoOffset, torsoPanelMatrix, tailPanelMatrix } from './animalBodyMotion';

/** Cache SVG nodes once. The same renderer drives the main view, miniature and study. */
export function createAnimalRenderer(root: Element | null | undefined, id: AnimalId) {
  const body = root?.querySelector<SVGGElement>('[data-animal-body]');
  const joints = Array.from(root?.querySelectorAll<SVGGElement>('[data-animal-joint]') ?? [])
    .map((node) => ({ node, name: node.dataset.animalJoint as AnimalJoint }));
  const paws = Array.from(root?.querySelectorAll<SVGGElement>('[data-paw]') ?? [])
    .map((node) => ({ node, rig: animalProfiles[id].paws[node.dataset.paw as PawName]! }));
  const torso = Array.from(root?.querySelectorAll<SVGGElement>('[data-animal-torso-panel]') ?? []);
  const tail = Array.from(root?.querySelectorAll<SVGGElement>('[data-animal-tail-panel]') ?? []);
  const headRoot = root?.querySelector<SVGGElement>('[data-animal-head-root]');
  const tailRoot = root?.querySelector<SVGGElement>('[data-animal-tail-root]');
  const matrix = (values: number[]) => `matrix(${values.map((value) => value.toFixed(7)).join(' ')})`;
  return (pose: ReturnType<typeof animalPose>) => {
    body?.setAttribute('transform', `translate(0 ${pose.bob.toFixed(5)})`);
    for (const { node, name } of joints) node.setAttribute('transform', `rotate(${pose.joints[name].toFixed(5)})`);
    if (!isWalker(id)) return;
    for (const { node, rig } of paws) node.setAttribute('transform', `translate(${rig.x} ${(rig.y + torsoOffset(id, pose.body.torso, rig.x)).toFixed(5)})`);
    headRoot?.setAttribute('transform', `translate(0 ${pose.body.headY.toFixed(5)})`);
    tailRoot?.setAttribute('transform', `translate(0 ${pose.body.tailY.toFixed(5)})`);
    for (const [index, node] of torso.entries()) node.setAttribute('transform', matrix(torsoPanelMatrix(id, pose.body, index)));
    for (const [index, node] of tail.entries()) node.setAttribute('transform', matrix(tailPanelMatrix(pose.body, index)));
  };
}
