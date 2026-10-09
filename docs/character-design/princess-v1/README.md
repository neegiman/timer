# 그림책 원화 공주

기존 따뜻한 원화 캐릭터와 어울리는 새 친구입니다. 작은 금색 왕관, 밤색 머리, 분홍 드레스, 크림색 타이츠와 메리제인 신발을 사용합니다. 무릎과 발이 보이는 치마로 두 발의 교대 보행을 표현합니다.

## 원화와 생성 기록

- 생성: **내장 ImageGen 도구**, `transparent_background: true`. CLI/API fallback을 사용하지 않았습니다.
- 최종 생성 프롬프트: [prompt.txt](./prompt.txt)
- 변경 없이 보관한 PNG 원본: [princess-atlas.png](./princess-atlas.png), 1448×1086
- 사이트용 무손실 WebP: [public/characters/raster-v1/princess.webp](../../../public/characters/raster-v1/princess.webp)
- 부위 영역: [src/lib/princessAtlas.json](../../../src/lib/princessAtlas.json)
- 실제 브라우저에서 캡처한 여섯 보행 자세: [walking-poses.png](./walking-poses.png)

4열×3행 투명 부위 시트에 머리·왕관, 상의, 치마, 팔, 다리, 신발과 선택용 전신 그림을 생성했습니다. `node scripts/prepare-princess-atlas.mjs`는 PNG를 무손실 WebP로 변환하며 픽셀을 그리거나 보정하지 않습니다. 사이트에서는 `/timer/characters/raster-v1/princess.webp`를 사용합니다.

## 조립과 움직임

`PaintedPrincessArtwork.tsx`의 SVG 부위 뷰포트가 원화를 배치합니다. 생성 결과의 팔 부위에도 소매가 포함되어 있어 뷰포트로 위 팔의 피부와 팔꿈치 아래 부분을 선택합니다. 상의의 둥근 퍼프 소매를 유지하고, 그 아래에 팔 관절을 연결하여 어깨에 소매가 중복되지 않게 합니다. 원본 PNG와 WebP는 그대로 유지합니다.

`princessMotion.ts`에 관절의 원화 좌표와 몸통 기준 위치를 명시했습니다. 머리·왕관은 한 부위로 유지하고 목에서 회전합니다. 치마는 엉덩이를 가리고 1.2도 이내로 움직입니다. 각 팔은 어깨·팔꿈치, 각 다리는 엉덩이·무릎·발목으로 연결합니다. 부위를 늘이지 않고 원래 비율로 배치합니다.

걷기 주기는 1.25초입니다. 두 발은 반 주기 차이로 교대하고 팔은 반대로 움직입니다. 지지 구간에서는 실제 그림의 신발 밑창을 지면 205에 고정하도록 두 관절 IK를 계산합니다. 보폭 36과 배경 이동 거리를 같은 시간 시계로 계산하여 발 미끄러짐을 줄입니다. 메인 캐릭터 X좌표는 기존처럼 화면 42%에 고정합니다.

일시정지·새로고침은 동일한 보행 시각의 관절을 복원합니다. 도착 시 `SETTLE → JUMP → LAND → CELEBRATE`를 유지하고, 축하 중에는 두 발을 땅에 둔 채 손을 흔듭니다. 모션 감소 환경에서는 반복 관절 동작을 멈춥니다. 기존 효과음, 별 보상, 낮·밤, 전체화면, 시간 계산을 재사용하며 새로운 라이브러리는 추가하지 않았습니다.

## 검증

`tests/princessMotion.test.ts`는 원화의 무손실 변환, 실제 그림 안에 있는 관절, 400개 자세의 밑창 접촉·도달 범위, 보행 경계의 연속성과 모션 감소를 검사합니다.

`tests/e2e/princess-artwork.spec.ts`는 모바일 반복 선택, 관절과 그림 좌표의 일치, 실제 신발 픽셀의 지면 접촉, 배경과 발 속도, 일시정지·재개·새로고침, 도착·효과음·별 보상 및 320px부터 PC·가로 화면까지 검사합니다. Chromium과 모바일 WebKit에서 실행합니다. 실제 iPhone Safari의 오디오 출력은 기기에서 별도로 확인해야 합니다.
