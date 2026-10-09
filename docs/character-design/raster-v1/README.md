# ImageGen 원화의 실제 타이머 적용

사이트: https://neegiman.github.io/timer/

원화와 보행 비교: https://neegiman.github.io/timer/animal-preview/

## 제작과 자산

승인된 `public/images/animal-design/natural-concepts-v2.png`를 스타일·동물 체형 참고로 사용했습니다. 내장 **image_gen** 도구로 토끼·곰·강아지·고양이·병아리의 투명 부위 아틀라스를 각각 생성했습니다. 기존 원화를 통째로 이동하는 대신 몸통·머리·귀/날개·꼬리·상부 다리·하부 다리·발을 독립적으로 움직입니다. 사진에서 추출한 실측 모션 캡처가 아닌 관찰 기반 보행 시안을 사용합니다.

- 원본: `atlases/rabbit.png`, `bear.png`, `dog.png`, `cat.png`, `chick.png`
- 실제 자산: `public/characters/raster-v1/{rabbit,bear,dog,cat,chick}.webp`
- [최종 생성 프롬프트 5개](imagegen-prompts.json): 내장 도구, 기준 이미지와 투명 배경 옵션 포함
- `src/lib/animalAtlases.json`: 실제 알파 영역을 관찰해 계산한 부위별 좌표. 각 원본에는 분리된 부위 11개와 선택 화면용 전신 1개가 있습니다.
- `scripts/prepare-character-atlases.mjs`: 알파 연결 영역을 읽어 부위 좌표를 만들고, 원본의 크기·알파·보이는 색을 유지한 채 무손실 WebP로 인코딩합니다. 원본을 자르거나 피부/털을 보정하지 않습니다. 실제 부위 분리는 브라우저 SVG 뷰포트에서 합니다.

```sh
npm run characters
npm test
npm run build
```

동물별 WebP는 약 0.76~0.99MB이며 다섯 장의 합계는 약 4.35MB입니다. 동일 동물의 모든 부위와 선택 아이콘은 같은 URL을 공유합니다. 새 브라우저 애니메이션 라이브러리나 서버, 원격 이미지 API는 필요하지 않습니다. Sharp는 자산 준비와 검사에만 사용합니다.

## 움직임과 타이머 연결

`PaintedAnimalArtwork.tsx`는 투명 원화 부위를 SVG 관절에 배치합니다. 가까운/반대편 다리 네 개를 독립적으로 그리고, 반대편은 제한된 크기의 명암 필터로 구분합니다. 선택 아이콘에는 같은 아틀라스의 전신 원화를 사용합니다. 자동차·기차·로켓은 기존 SVG를 유지합니다.

`animalMotion.ts`의 시안 보행을 실제 타이머에도 사용합니다. 두 뒷발을 함께 미는 토끼, 넓은 발을 디디는 곰, 네 발을 순서대로 움직이는 강아지와 고양이, 두 발을 교대하는 병아리의 주기·보폭을 각각 적용합니다. 지면 이동 거리는 동물의 보행 시계와 보폭에서 계산하므로 지지 중인 발과 지면의 속도가 같습니다.

`animalActionPose.ts`는 종료 시 현재 보행 자세에서 정지 자세로 350ms 동안 이어주고, 기존 `JUMP → LAND → CELEBRATE` 순서에 귀·발·꼬리·날개의 반응을 연결합니다. 부모 메뉴의 일시정지·계속, 새로고침, 백그라운드 복귀는 같은 경과 시각을 사용합니다. 매 프레임 React state를 갱신하지 않습니다.

`prefers-reduced-motion`에서는 관절·바운스·지면을 줄이면서 실제 남은 시간과 진행 경로는 유지합니다. `/timer/animal-preview/`의 **보행 구조 보기 / 원화로 보기**는 진행 중인 비교 시계를 초기화하지 않습니다.

모든 이미지 주소는 `assetPath()`를 거칩니다. 예: `/timer/characters/raster-v1/rabbit.webp`. 정적 `out/`에 다섯 자산이 포함되며 GitHub Pages 검증에서도 각각 요청합니다.

## 화면 캡처

- [실제 타이머 — 토끼 보행](timer-rabbit-mobile.png)
- [친구 선택 — 원화 아이콘](character-selection-mobile.png)
- [원화 보행 비교](painted-motion-preview.png)

## 검증

단위 검사에는 원본/무손실 자산의 알파·보이는 RGB 일치, 부위 12개씩의 범위·채색, 시안과 실제 타이머의 동일 보행, 정지 자세 연결, 종료 동작과 모션 감소를 포함했습니다. 브라우저 검사는 다섯 동물과 세 차량의 선택·보행·도착 자세, 네 발의 접지/지면 속도, 정지·재개·새로고침, 320px·가로 화면, 낮/밤, 전체화면, 완료음 한 번과 별 저장을 포함합니다. 실제 iPhone 하드웨어의 오디오·잠금 동작 검증을 대체하지는 않습니다.

2026-10-09 로컬 검증: TypeScript·ESLint·정적 빌드 및 `/timer` 자산 검사 통과, 단위 검사 **32개 통과**. 브라우저 60개 대상 중 실행 가능한 **59개를 검증**했고 네이티브 전체화면 미지원 모바일 WebKit 1개는 건너뛰었습니다. 최초 전체 실행에서 결승점의 첫 rAF 전에 속성을 읽던 종료 경계 검사를 발견해, 가상 시계에서 React 커밋 후 프레임을 진행하도록 보완했습니다. 관련 애니메이션 파일은 Chromium·모바일 WebKit **10개 모두 재검증 통과**했습니다.
