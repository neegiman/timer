# 원화풍 왕자

공주의 부드러운 붓 질감에 맞춘 ImageGen 왕자입니다. 갈색 머리, 작은 금색 왕관, 파란 자수 튜닉과 망토, 크림색 바지, 갈색 부츠를 사용합니다. 기존 픽셀 왕자 원본과 생성 코드는 이전 제작 기록으로 보존하며 사이트는 새 원화를 사용합니다.

## 저장한 자산

- [ImageGen 투명 PNG 원본](./prince-atlas.png), 1448×1086
- [사이트용 무손실 WebP](../../../public/characters/raster-v1/prince-painted-v1.webp)
- [부위 영역](../../../src/lib/princeAtlas.json)
- [보행·관절 설정](../../../src/lib/paintedPrinceMotion.ts)
- [선택 화면](./prince-selection-mobile.png), [걷기](./prince-walk-mobile.png), [도착 후 양팔 축하](./prince-arrival-mobile.png)

`node scripts/prepare-painted-prince.mjs`는 PNG를 무손실 WebP로 변환합니다. 배경 제거, 그림 덧칠, 코드로 그린 대체 원화는 사용하지 않습니다. 사이트의 모든 자산 주소에는 `assetPath()`를 통해 `/timer/`가 붙습니다.

## 동작과 호환

선택 카드는 원화 전신을 보여 줍니다. 메인과 진행바는 같은 부위 그림·보행 시계를 사용하며 어깨·팔꿈치·엉덩이·무릎·발목이 각 원화의 실제 관절 위치를 중심으로 회전합니다. 몸은 가로로 미끄러지지 않습니다. 작은 체중 이동과 두 발의 역기구학을 사용해 지면 속도에 맞춰 걷고, 도착 후 두 다리를 곧게 세운 상태에서 양손을 얼굴 바깥으로 들어 올립니다. 일시정지·새로고침·모션 감소·기존 결승선 통과·완료음·별 보상은 기존 타이머 상태를 따릅니다.

## 생성 방식과 프롬프트

내장 ImageGen 도구를 사용했습니다. 공주 v1/v2 아틀라스는 스타일 참고 이미지로만 전달했습니다. 두 번째 호출은 몸통의 고정 소매를 제거하고 위팔 소매 색을 선택용 전신과 맞추는 수정입니다. 다음은 실제 전달한 프롬프트입니다.

### 최초 생성

```text
Use case: illustration-story.
Asset type: production transparent cutout animation atlas for a preschool visual timer, paired with the existing painted princess.
Input images: the two referenced princess atlases are STYLE REFERENCES ONLY. Create a new BOY PRINCE, do not reproduce the girl.
Primary request: a charming child prince in the exact same softly painted storybook illustration style as the princess: warm textured gouache/watercolor brushwork, delicate hand-painted edges, expressive large brown eyes, rosy cheeks, chestnut wavy short hair and a small gold crown. Gentle smile, three-quarter view facing RIGHT. Blue tunic with cream collar and subtle gold embroidered edging, cream slim trousers, warm brown ankle boots. Short muted blue cape, no sword or weapons. Same childlike proportions and polish as the princess, not pixel art, not vector, not 3D.
Composition: one landscape 4:3 TRANSPARENT PNG atlas laid out as a precise 4-column by 3-row grid of 12 isolated assets, with generous clear transparent gutters. EACH object centered entirely inside its own cell. No grid lines, no text, no labels, no ground, no cast shadows, no background.
Row 1 left to right:
1. Head with hair AND gold crown AND complete neck stub, facing right. No shoulders.
2. Full tunic torso with neck opening, shoulders, waist and hips; NO arms or legs. Wide enough at the shoulders for attaching sleeves. Blue cloth with cream collar and small gold buttons, flared lower tunic hem.
3. Near upper arm: short blue rounded sleeve at shoulder with cream cuff, skin upper arm ending in a rounded elbow cap; vertical downward with gentle taper. Complete rounded shoulder root, no forearm or hand.
4. Near forearm and hand: one straight downward skin forearm with a rounded elbow root and relaxed five-finger hand at bottom, no sleeve.
Row 2 left to right:
5. Upper leg: cream trouser thigh with a rounded hip root and rounded knee end, vertical straight, thick enough to attach to hips. No foot.
6. Lower leg: cream trouser shin with rounded knee root, narrow ankle at bottom, vertical straight. No foot.
7. One warm brown ankle boot facing RIGHT, rounded toe pointing right, flat horizontal sole, opening at top for ankle. No leg. Complete heel and toe.
8. Far upper arm: same clothing, scale, thickness and skin color as near upper arm, slight perspective shading; vertical with rounded shoulder and elbow. No forearm or hand.
Row 3 left to right:
9. Far forearm and hand, matching asset 4 in scale/thickness, elbow root and relaxed five-finger hand at bottom, slight perspective shading.
10. Short blue cape alone, draping down from shoulders, softly rounded cloth, transparent around it, NO body or head.
11. FULL ASSEMBLED PRINCE standing with both legs straight, separated boots on same baseline and both arms visible, matching all pieces exactly. Whole body and crown fully visible with margin.
12. FULL ASSEMBLED SAME PRINCE celebrating with BOTH arms lifted outward and up, both hands visible clear of face and crown, legs straight and boots separated. Whole body fully visible.
Rig constraints: every detachable limb extends to a rounded root designed to overlap inside its parent, never a narrow detached sliver. Skin and cream trouser colors must match across upper/lower joint pieces. Preserve complete hands and boots. Assets 11 and 12 must use the exact same face, hair, crown and outfit as assets 1-10. Full genuine transparent alpha, no checkerboard drawn into artwork. No cropping, no extra limbs, no pixelated edge.
```

### 소매와 몸통 수정

```text
Edit the referenced transparent painted prince atlas. Preserve the exact prince face, crown, hair, colors, painterly storybook style, cell layout, transparent background and ALL other assets. Change ONLY these three pieces:
- Top row column 2, torso: remove both attached cream sleeves/arm stumps completely, leaving only the blue tunic/vest with cream collar, complete neck/shoulder edges, belt and hips. The torso must be a clean sleeve-free and arm-free rigid puppet body. Do not narrow the chest or waist.
- Top row column 3, near upper arm: change its BLUE puff sleeve into a SMALL CREAM short sleeve with delicate gold cuff, matching the full prince in the bottom row. Keep the complete rounded shoulder attachment at the TOP, skin upper arm and rounded elbow attachment below, same overall placement and full object length.
- Middle row column 4, far upper arm: likewise use matching SMALL CREAM sleeve with gold cuff instead of blue puff, keep whole shoulder/upper arm/elbow and placement.
All legs, lower arms and hands, head, boots, cape and the two assembled princes stay unchanged. Genuine transparent alpha, no background, no captions, no grid lines. This asset will animate at the shoulders so no sleeve or arm should remain painted onto the torso.
```

## 검증

원본의 알파 및 보이는 색상 보존, 원화 안의 관절 위치, 한 보행 주기 480개 자세의 실제 발 접촉·도달 범위·지면 속도, 곧은 정지 자세와 양팔의 얼굴 바깥 배치를 검사합니다. 브라우저에서는 반복 선택·메인/진행바 동기화·일시정지·재개·새로고침·모션 감소·도착·완료음 1회·별 보상, 실제 렌더링 픽셀의 연결과 두 손의 표시를 검사합니다.

2026-10-11: 타입 검사·린트·단위 테스트 105개·정적 빌드 및 `/timer/` 자산 검사 통과. Chromium·모바일 WebKit에서 캐릭터·공주·왕자·도착점 고정·모바일 준비 버튼 관련 38개, 왕자 진행바의 실제 픽셀 움직임·일시정지·복원 관련 2개, 합계 브라우저 테스트 40개 통과.
