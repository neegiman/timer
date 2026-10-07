# 전신 캐릭터 디자인

## 원화와 구현

- `rabbit-concept.png`: ImageGen 기본 도구로 생성한 투명 배경 전신 토끼 원화.
- `rabbit-motion-reference.png`: 동일한 캐릭터의 준비·걷기·달리기·점프·착지 자세 참고표. 마지막 수정본입니다.
- 생성 이미지는 그림체와 자세의 참고 자료입니다. 자동으로 SVG로 변환하거나 PNG 프레임을 그대로 재생하지 않습니다. 생성된 두 걷기 자세는 완전한 교차 보행 사이클로 검증되지 않았으므로 실제 스프라이트 시트로 사용하지 않습니다.
- 앱은 `src/components/CharacterArtwork.tsx`의 프로젝트용 SVG를 사용합니다. 토끼의 따뜻한 색과 전신 비율을 바탕으로 곰·강아지·고양이·병아리와 자동차·기차·로켓까지 일관된 그림체로 확장했습니다.
- 선택 화면과 여행 화면은 동일한 벡터 그림을 공유합니다. 외부 이미지 서비스나 런타임 다운로드가 필요하지 않습니다.

## 관절 동작

머리·몸·귀·꼬리·팔꿈치·허벅지·무릎·발목을 분리합니다. 다리는 두 관절의 역기구학(IK)으로 목표 발 위치를 따라갑니다. 접지 → 지지 → 발끝 밀기 → 들어 올리기 → 다음 접지 순서이며, 양발은 반 주기 어긋나고 팔은 반대 방향으로 움직입니다. 발목은 무릎 회전을 상쇄해 지지 중 발바닥을 수평으로 유지합니다.

걷기·빠른 걷기·달리기·전력질주의 보폭, 발 높이, 팔 굽힘을 달리합니다. 점프는 팔을 들고 무릎을 접으며, 착지는 굽힌 무릎으로 충격을 받아냅니다. 축하는 손을 흔듭니다. 자동차·기차는 바퀴, 로켓은 불꽃을 별도로 움직입니다.

`src/lib/characterPose.ts`는 기존 AnimationController의 `actionElapsedMs`와 캐릭터 주기만으로 관절 각도를 계산합니다. 별도 타이머나 프레임별 React state는 없습니다. 일시정지와 새로고침 시 같은 경과 시간에서 같은 자세를 복원합니다. 모션 감소 설정은 반복 관절 동작을 멈춥니다.

## ImageGen 프롬프트 기록

사용 방식: 기본 내장 `image_gen` 도구. CLI/API 경로를 사용하지 않았습니다.

### 1. 전신 원화 (`transparent_background: true`)

```text
Use case: illustration-story.
Asset type: full-body character concept preview for a Korean preschool visual timer, to serve as reference for a later articulated SVG character.
Primary request: Create ONE original, polished, endearing full-body rabbit mascot, with clearly readable body, two arms and two legs. The rabbit will walk along a route toward a finish flag, so the anatomy must support real stepping rather than a floating emoji face.
Scene/backdrop: genuine transparent background, isolated character, no ground, no cast shadow or scenery.
Subject: warm ivory rabbit, pale rose inner ears and cheeks, warm dark-brown eyes and a small friendly smile; round soft torso, visible hip area, short but distinctly separate upper/lower legs and broad oval feet, small rounded hands, two long ears, a small round tail. Head is expressive but body and limbs occupy at least half the height excluding ears. Not a head with feet attached directly beneath it.
Style/medium: refined children's picture-book character design, clean hand-drawn organic silhouettes, subtle warm shading in only a few broad shapes, vector-friendly, readable at 90px tall on a phone. Match a gentle cream-and-leaf-green application. Avoid excessive fur texture or microdetails.
Composition/framing: full body with generous clear padding around ear tips and feet; three-quarter side view facing toward the RIGHT because the timer journey moves start to finish toward the right. Calm neutral ready pose, hands slightly away from torso, both feet visible, separated and planted, limb connections legible.
Constraints: exactly one complete rabbit, all parts visible and connected naturally, consistent rounded proportions, no cropped feet or ears, no letters, no labels, no watermark, no UI, no extra props, no clothing, no duplicate character, no confetti. Output is an illustration concept, not a claimed animation sprite sheet. Preserve true alpha transparency.
```

### 2. 자세 참고표 (`transparent_background: false`, 원화 참조)

```text
Use case: illustration-story.
Asset type: six-pose motion reference preview for a preschool visual timer character; this is a pose design sheet for a later SVG rig, not a production sprite atlas.
Input image: the referenced full-body rabbit is the identity and art-direction reference.
Primary request: Draw the EXACT SAME warm ivory, rosy-cheeked rabbit in six clearly distinct full-body poses. Preserve the head shape, eyes, smile, two ears, limb proportions, tail and warm color palette. Refine the art for legible mobile animation: clean organic edges, no outer halo, no background glow, only restrained broad shading.
Scene/backdrop: solid warm paper-white #fffaf0. No environment or extra props.
Composition: a generous, orderly 3-column by 2-row grid with equal-size characters and equal clean spacing. All six rabbits fully visible including ears and feet; consistent camera and overall scale. Face right in a three-quarter side view, matching start-to-finish travel.
Pose order, left to right:
TOP LEFT: calm ready stance, both feet planted, shoulders relaxed, two arms visibly distinct from torso.
TOP MIDDLE: WALK contact A, left foot planted forward, right leg behind with heel raised; right arm swings forward, left arm back. Make the forward supporting foot and trailing push-off foot unambiguous.
TOP RIGHT: WALK contact B, right foot planted forward, left leg behind with heel raised; left arm swings forward, right arm back. This must visibly exchange the legs and arms compared with contact A, not repeat the same pose.
BOTTOM LEFT: RUN flight pose, torso leaning gently forward, front knee lifting, opposite leg extending behind, elbows bent and counter-swinging, both feet off the invisible ground, ears gently lagging behind.
BOTTOM MIDDLE: joyful JUMP peak, both arms lifted up, body stretched, feet tucked slightly, happy expression. Keep limbs attached naturally.
BOTTOM RIGHT: LAND recovery, both feet planted, knees clearly bent, torso lowered and slightly squashed, arms balancing gently.
Constraints: exactly six poses of one consistent character, two arms and two legs in each pose, clean small-scale silhouette, anatomy readable at 90px tall, no clothing, no lettering, no panel borders, no watermark, no extra symbols, no motion trails, no particles, no casting shadows. Do not merely rotate or bob an unchanged image; change joint angles and limb placement as specified.
```

### 3. 보행 자세 수정 (`transparent_background: false`, 참고표 수정)

```text
Use case: precise-object-edit.
Edit target: the referenced six-pose rabbit design sheet.
Change ONLY the TOP RIGHT rabbit's walking pose. Preserve the other five rabbits, the 3x2 grid, the same rabbit face, ears, ivory color, shading style, camera and paper-white background exactly.
The current TOP MIDDLE and TOP RIGHT walking poses incorrectly repeat the same leg and arm placement. Make TOP RIGHT the OPPOSITE contact step.
Precise TOP RIGHT geometry: the NEAR/VISIBLE foreground leg, attached to the viewer-left side of the pelvis, must swing BACKWARD toward image LEFT. Its heel is raised and its foot is clearly behind the hip. The FAR/BACKGROUND leg must extend FORWARD toward image RIGHT and its whole foot is planted in front of the hip. This creates an open walking stride whose foreground leg points backward, opposite to TOP MIDDLE where the foreground leg points forward. The near arm must swing FORWARD across the torso toward image RIGHT, hand in front of the chest; the far arm swings BACKWARD toward image LEFT. Do not keep the same raised right-side fist and same forward foreground leg as TOP MIDDLE.
Keep the head facing right, gently smiling, torso upright, natural connected anatomy, exactly two arms and two legs, both feet fully in frame. This is a calm walking step, not running. No new letters, no markings, no props. All other poses and layout unchanged.
```
