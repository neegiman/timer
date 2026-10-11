# 원화 도로·기찻길

내장 **ImageGen**으로 제작한 구아슈·수채화 원본을 실제 바닥 자산으로 사용합니다. 도로에는 물감과 종이의 미세한 질감, 따뜻한 노란 점선과 모래 가장자리를 넣었습니다. 기찻길은 나무 침목의 결, 둥근 자갈, 부드러운 금속 하이라이트를 표현합니다. 기존 사계절 원화 배경과 어울리는 낮·밤 색상을 각각 제작했습니다.

- 생성 원본: [도로 낮](road-day.png), [도로 밤](road-night.png), [기찻길 낮](railway-day.png), [기찻길 밤](railway-night.png).
- 생성·편집에 사용한 최종 프롬프트: [prompts.json](prompts.json). 밤 버전은 낮 원본의 구도·레일 위치·투명 배경을 유지하며 내장 도구로 편집했습니다.
- 실제 모바일 적용 화면: [runtime-preview.png](runtime-preview.png).
- 런타임 파일: `public/images/vehicle-ground-v2/road-day.webp`, `road-night.webp`, `railway-day.webp`, `railway-night.webp`.
- 변환 명령: `npm run vehicle-ground`. Sharp는 필요한 원본 영역 선택·크기 변환·반사 타일 연결·무손실 WebP 변환에 사용하며 그림 내용은 ImageGen 원본입니다.

480×96 타일의 양끝과 중앙 반사 연결부 픽셀을 맞춰 반복 경계를 숨깁니다. 낮·밤은 같은 영역을 사용하므로 전환해도 길·레일이 이동하지 않습니다. 바닥은 화면 높이에 따라 늘이지 않고 96px 높이를 유지합니다. 앞쪽 레일의 밝은 표면은 정규화 이미지의 61~64행이며 바퀴 접점을 62px에 맞췄습니다. 자동차 접점은 18px로 유지합니다.

기존 타이머의 실제 경과 시간과 지면 이동률 1배를 함께 사용합니다. 추가 애니메이션 시계나 라이브러리를 넣지 않았습니다. 일시정지·재개·드래그 시간 조절·새로고침·완료와 고정 도착점 동작은 동일합니다. 모든 파일은 `/timer/images/vehicle-ground-v2/…`로 정적 로딩합니다.

주요 변경: `ScrollingScenery.tsx`, `paintedVehicleGround.json`, `globals.css`, `prepare-painted-vehicle-ground.mjs`. 이전 [SVG 바닥 제작 기록](../vehicle-ground-v1/README.md)은 보관합니다.

검증: 이미지 디코딩·투명 반복 경계·앞 레일의 밝기와 연속성·모바일 바퀴 접점·낮밤 전환·스크롤 동기화·일시정지·새로고침·도착 정지·320px/390px/가로 화면·정적 배포 경로를 확인합니다.
