'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { NaturalAnimalArtwork } from './NaturalAnimalArtwork';
import { animalIds, animalPose, animalProfiles, type AnimalId, type AnimalJoint } from '@/lib/animalMotion';
import { PaintedAnimalArtwork, PaintedAnimalThumbnail } from './PaintedAnimalArtwork';

export function AnimalMotionPreview() {
  const gallery = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [slow, setSlow] = useState(false);
  const [painted, setPainted] = useState(true);
  const clock = useRef({ accumulated: 0, startedAt: 0, rate: 1, playing: true });
  const sampleClock = () => {
    const current = clock.current;
    if (current.startedAt && current.playing) current.accumulated += Math.max(0, Date.now() - current.startedAt) * current.rate;
    current.startedAt = Date.now();
  };
  const toggle = () => { sampleClock(); clock.current.playing = !clock.current.playing; setPlaying(clock.current.playing); };
  const changeSpeed = () => { sampleClock(); clock.current.rate = slow ? 1 : .5; setSlow(!slow); };
  const reset = () => { clock.current.accumulated = 0; clock.current.startedAt = Date.now(); };

  useEffect(() => {
    const container = gallery.current;
    if (!container) return;
    clock.current.startedAt ||= Date.now();
    const scenes = [...container.querySelectorAll<HTMLElement>('[data-animal-scene]')].map((scene) => {
      const id = scene.dataset.animalScene as AnimalId;
      return { scene, id, body: scene.querySelector<SVGGElement>('[data-animal-body]')!,
        ground: scene.querySelector<HTMLElement>('.animal-study-ground')!,
        joints: [...scene.querySelectorAll<SVGGElement>('[data-animal-joint]')].map((node) => ({ node, joint: node.dataset.animalJoint as AnimalJoint })),
        scale: 1 };
    });
    let lastElapsed = -1;
    const measure = () => {
      for (const scene of scenes) scene.scale = scene.scene.querySelector('.animal-study-actor')!.getBoundingClientRect().width / 160;
      lastElapsed = -1;
    };
    const observer = new ResizeObserver(measure);
    for (const { scene } of scenes) observer.observe(scene);
    measure();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let lastReduced = reduced.matches;
    const draw = () => {
      const current = clock.current;
      const elapsed = current.accumulated + (current.playing ? Math.max(0, Date.now() - current.startedAt) * current.rate : 0);
      if (lastElapsed !== elapsed || lastReduced !== reduced.matches) {
        for (const { scene, id, body, ground, joints, scale } of scenes) {
          const pose = animalPose(id, elapsed, !reduced.matches);
          body.setAttribute('transform', `translate(0 ${pose.bob.toFixed(4)})`);
          for (const { node, joint } of joints) node.setAttribute('transform', `rotate(${pose.joints[joint].toFixed(5)})`);
          ground.style.transform = `translate3d(${-pose.ground * scale % 48}px, 0, 0)`;
          scene.dataset.motionTime = elapsed.toFixed(3);
          scene.dataset.groundDistance = (pose.ground * scale).toFixed(5);
        }
        lastElapsed = elapsed; lastReduced = reduced.matches;
      }
      frame = requestAnimationFrame(draw);
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (document.visibilityState === 'visible') { lastElapsed = -1; draw(); }
    };
    document.addEventListener('visibilitychange', onVisibility);
    draw();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [painted]);

  return <main className="animal-preview">
    <Link href="/" className="animal-back-link">← 약속 여행으로 돌아가기</Link>
    <header><p className="animal-preview-eyebrow">새로운 동물 친구 · 디자인과 움직임 시안</p>
      <h1>동물처럼 움직여요</h1><p>낮은 몸통, 네 발, 귀와 꼬리까지.<br />동물마다 다른 움직임을 만나보세요.</p></header>
    <figure className="animal-concept-board">
      <div className="animal-concept-friends">{animalIds.map((id) => <div key={id}>
        <PaintedAnimalThumbnail id={id} label={animalProfiles[id].name} /><span>{animalProfiles[id].name}</span>
      </div>)}</div>
      <figcaption>ImageGen으로 만든 외형 시안이에요. 아래에서는 털 질감을 살린 원화와 보행 구조를 바꿔가며 비교할 수 있어요. 원화의 움직임은 실제 타이머에도 적용했어요.</figcaption>
    </figure>
    <section className="animal-motion-section" aria-labelledby="animal-motion-heading">
      <h2 id="animal-motion-heading">움직임을 비교해 보세요</h2>
      <div className="animal-playback" role="group" aria-label="움직임 재생">
        <button type="button" onClick={toggle} aria-pressed={playing}>{playing ? '⏸ 잠깐 멈춤' : '▶ 이어 보기'}</button>
        <button type="button" onClick={changeSpeed} aria-pressed={slow}>🐢 {slow ? '느리게 보는 중' : '느리게 보기'}</button>
        <button type="button" onClick={reset}>↺ 다시 보기</button>
        <button type="button" onClick={() => setPainted(!painted)} aria-pressed={!painted}>{painted ? '보행 구조 보기' : '원화로 보기'}</button>
      </div>
      <div ref={gallery} className="animal-motion-grid">
        {animalIds.map((id) => <article className="animal-study-card" key={id}>
          <h3>{animalProfiles[id].name}</h3>
          <div className="animal-study-scene" data-animal-scene={id} role="img" aria-label={`${animalProfiles[id].name}의 자연스러운 ${id === 'rabbit' ? '작은 도약' : '보행'} 움직임`}>
            <span className="animal-study-cloud" aria-hidden="true">☁</span>
            <div className="animal-study-ground" aria-hidden="true" />
            <span className="animal-study-shadow" aria-hidden="true" />
            <div className="animal-study-actor">{painted ? <PaintedAnimalArtwork id={id} /> : <NaturalAnimalArtwork id={id} />}</div>
          </div><p>{animalProfiles[id].description}</p>
        </article>)}
      </div>
      <p className="animal-study-note">이 화면은 실제 동물의 특징을 바탕으로 만든 움직임 시안이에요. 영상에서 추출한 모션 캡처 데이터는 아니에요. 기기의 모션 감소 설정을 켜면 동작이 멈춰요.</p>
    </section>
    <section className="animal-study-references"><h2>관찰에 사용한 자료</h2>
      <p><a href="https://purepng.com/photo/578/animals-blonde-rabbit-walking-from-side" target="_blank" rel="noreferrer">실제 토끼 사진</a>에서 몸통과 발의 비율을, <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9208372/" target="_blank" rel="noreferrer">토끼 보행 연구</a>에서 뒷발 접지와 도약을 참고했어요.</p>
      <p><a href="https://archives.upenn.edu/exhibits/penn-history/muybridge/" target="_blank" rel="noreferrer">Muybridge의 동물 움직임 연속 사진</a>을 함께 살펴보고 네 발의 순서와 체중 이동을 비교해요.</p>
    </section>
  </main>;
}
