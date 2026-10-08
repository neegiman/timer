# 실제 동물 체형과 움직임 시안

미리보기: https://neegiman.github.io/timer/animal-preview/

## 결과물과 범위

- `public/images/animal-design/natural-concepts-v2.png`: ImageGen 기본 내장 도구로 생성한 토끼·곰·강아지·고양이·병아리 그림 시안. 사진이나 검증된 스프라이트 시트가 아닙니다.
- `rabbit-photo-reference.png`: 실제 토끼의 옆모습 사진. [PurePNG 원문](https://purepng.com/photo/578/animals-blonde-rabbit-walking-from-side)의 CC0 / 상업 사용 허용 표기를 확인했습니다. 체형 관찰 자료로 보존하며 앱의 캐릭터로 사용하지 않습니다.
- `src/components/NaturalAnimalArtwork.tsx`: 낮은 몸통과 네 다리, 동물의 머리·귀·꼬리를 구분한 SVG 보행 시안. 원화의 털 텍스처는 이 단계에서 재현하지 않았습니다.
- `src/lib/animalMotion.ts`: 동물별 주기·지지 시간·보폭·발 순서·관절 길이·무릎 방향·귀와 꼬리 반응을 정의합니다. 영상에서 추출한 실측 모션 캡처가 아닌 관찰 자료 기반의 근사 모델입니다.
- `AnimalMotionPreview.tsx`, `src/app/animal-preview/page.tsx`: 원화와 동작을 구분하여 보여주는 정적 비교 화면. 재생·정지·0.5배속·초기화, 모션 감소를 지원합니다.
- 실제 렌더링 캡처는 로컬 `artifacts/natural-animal-preview-320.png`, `390.png`, `1440.png`에 저장합니다.
- [데스크톱 화면 캡처](motion-study-screen.png)를 이 디렉터리에도 보존합니다. 이는 시안 웹페이지의 스크린샷이며 실제 동물 촬영 영상이나 모션 캡처 데이터가 아닙니다.

이번 결과물은 디자인과 보행 비교 시안입니다. 기존 타이머의 캐릭터 교체, 원화 분할 리깅, 영상 추적 데이터 적용은 포함하지 않습니다. 타이머의 저장 데이터와 진행·도착 시각은 이 화면에서 변경하지 않습니다.

## 동물별 표현

| 동물 | 보행과 반응 |
| --- | --- |
| 토끼 | 두 뒷발의 동시 밀기, 시간차가 있는 앞발 접지, 작은 공중 구간, 귀의 지연 반응 |
| 곰 | 긴 접지 시간, 넓은 발, 느린 네 발 보행과 작은 체중 이동 |
| 강아지 | 네 발의 순차 보행, 어깨와 팔꿈치 분리, 귀와 꼬리의 작은 움직임 |
| 고양이 | 안정적인 몸통, 앞발이 디딘 자리로 옮기는 뒷발, 작은 꼬리 균형 동작 |
| 병아리 | 두 발의 교대, 짧고 빠른 걸음, 몸 곁의 날개와 작은 머리 반응 |

지지 중 발의 뒤쪽 속도는 지면의 이동 속도와 같습니다. 몸의 작은 상하 움직임을 역기구학의 목표 발 높이에서 보정해 발이 지면을 떠나지 않게 합니다. 발목은 무릎 회전을 상쇄합니다. 머리·귀·꼬리와 다리는 별개 관절이고, 메인 동물의 X좌표는 고정합니다.

현재 시각에서 경과 시간을 계산하며 프레임 수를 시간으로 사용하지 않습니다. 재생 속도와 정지 변경 시 누적 경과 시간을 보존합니다. requestAnimationFrame에서 SVG transform과 지면 transform만 갱신하며 React state는 프레임마다 변경하지 않습니다. ResizeObserver로 배율을 캐시합니다.

## 관찰 자료

- Hall 외, 2022, [Rabbit hindlimb kinematics and ground contact kinetics during the stance phase of gait](https://pmc.ncbi.nlm.nih.gov/articles/PMC9208372/). 토끼의 뒷다리 접지·추진 및 bounding/half-bounding에 대한 관찰을 참고합니다. 논문의 각도·압력 데이터를 이 시안의 수치로 직접 복제하지 않았습니다.
- [Muybridge’s Animal Locomotion Study — University of Pennsylvania Archives](https://archives.upenn.edu/exhibits/penn-history/muybridge/). 실제 동물 연속 사진과 보행 관찰의 배경 자료입니다.
- [Cat walking, change to galloping — Plate 716, National Gallery of Art](https://www.nga.gov/artworks/220470-plate-number-716-cat-walking-change-galloping). 실제 고양이 동작의 옆모습 참고입니다.
- [실제 토끼 옆모습 — PurePNG](https://purepng.com/photo/578/animals-blonde-rabbit-walking-from-side).

곰·강아지·병아리의 각 수치는 시안을 위한 조정값이며 개체별 실측 동작을 나타내지 않습니다. 원화와 보행 원리는 별도로 검토하여 잘못된 AI 포즈를 그대로 반복 재생하지 않습니다.

## 검증

2026-10-09: TypeScript·lint·프로덕션 정적 빌드 통과, 단위 검사 28개 통과. Chromium·모바일 WebKit에서 동물 시안 4개와 기존 타이머의 도착·완료음·보상·새로고침·일시정지 시나리오 4개, 총 8개 통과. 320px·390px·1440px 렌더링을 캡처하고 가로 넘침이 없음을 확인했습니다. `verify-export`와 `verify-live`에는 시안 HTML·전용 이미지·시안 Next.js 파일·새로고침 검증을 추가했습니다.

## 생성 프롬프트

사용 방식: 내장 `image_gen`. CLI/API 모델 전환 없이 기본 도구를 사용했습니다. 출력 파일을 프로젝트의 `public/images/animal-design/natural-concepts-v2.png`에 복사했으며 런타임 경로는 `assetPath()`로 `/timer`를 적용합니다.

```text
Use case: illustration-story.
Asset type: visual development concept board for five animal characters in an existing Korean preschool visual timer.
Primary request: Redesign the existing rabbit, bear, dog, cat, and chick as recognizable real animals with natural anatomy and gentle picture-book appeal. This is an AI illustration concept sheet, not photography and not a verified animation sprite atlas.
Scene/backdrop: warm paper-white #fffaf0, generous spacing, tiny soft contact shadows, no environment.
Composition: polished landscape 3-column by 2-row character design board. Top row: rabbit, bear, dog. Bottom row: cat, chick, and a small secondary side-profile rabbit study. Every animal is fully visible, facing RIGHT in a clean side or slight three-quarter side view. Keep real horizontal animal body proportions and leg attachments obvious.
Subjects:
RABBIT: warm ivory domestic rabbit, normal dark eye, long ears, short forelegs, strong rounded haunches, long hind feet and small cotton tail. Low horizontal body, four limbs, resting in a natural ready-to-hop pose.
BEAR: gentle brown bear cub, substantial horizontal torso, short rounded ears, broad muzzle, four robust legs, broad planted paws.
DOG: small golden retriever puppy, natural horizontal spine, clear chest and hips, four paws, soft floppy ears, visible gently curved tail.
CAT: warm gray-green tabby kitten, natural flexible horizontal torso, four slender legs with distinct ankles, pointed ears, small muzzle, long upright curved tail.
CHICK: small fluffy yellow domestic chick, natural rounded body, two orange three-toed feet, a small side wing, small beak, attentive dark eye.
Style/medium: polished children's natural-history picture-book illustration, restrained soft fur texture and broad warm shading, anatomically grounded but kind and approachable. Faces should be sweet through natural animal expressions, without human facial proportions. Suitable for clear silhouettes at 120px on a phone and later limb/body segmentation for animation.
Constraints: mammals on FOUR PAWS, chick on TWO FEET. No upright human torsos, no hands, no human arm swings, no clothing, no props, no huge mascot eyes, no scary expressions. All ears, tails, feet and paws completely in frame. Consistent lighting and palette. No letters, labels, UI, logos or watermark. Do not pretend the poses are actual captured motion.
```
