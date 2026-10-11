# 긴바지 왕자

현재 모션은 이 시안의 전신 비율을 적용한 [왕자 v3](../prince-v3/README.md)입니다. 선택 카드는 이 문서의 긴바지 전신을 사용합니다.

치마처럼 퍼지던 파란 튜닉 아랫자락을 제거하고 허리띠에서 끝나는 짧은 조끼와 크림색 긴바지로 수정했습니다. 내장 ImageGen의 이미지 편집 기능을 사용했으며, 두 번의 실제 프롬프트는 [prompts.json](./prompts.json)에 보관했습니다.

- [투명 PNG 원화](./prince-long-pants-atlas.png): 팔 없는 조끼·바지 허리 부분, 긴바지 전신, 양팔 축하 자세
- [사이트용 무손실 WebP](../../../public/characters/raster-v1/prince-long-pants-v2.webp)
- [새 원화 영역](../../../src/lib/princeOutfitAtlas.json)
- [서기·걷기·축하 자세 비교](./prince-long-pants-poses.png)
- [모바일 선택](./prince-selection-mobile.png), [걷기](./prince-walk-mobile.png), [도착](./prince-arrival-mobile.png)

기존 머리·팔·망토·부츠와 무릎에서 이어지는 바지 원화는 유지합니다. 몸통만 새 원화로 교체하고 바지 허리의 아래쪽 경계를 움직이는 허벅지와 부드럽게 겹칩니다. 선택 카드도 긴바지 전신으로 교체했습니다. PNG 원본을 덧칠하거나 배경을 제거하지 않고 무손실 WebP 변환만 수행합니다.

메인과 진행바는 동일한 원화·보행 설정을 사용합니다. 시간 계산·지면 접촉·배경 속도·일시정지·도착 동작은 기존 타이머 상태를 따릅니다. 모든 자산은 `/timer/` 경로에서 제공됩니다.

검증: 타입 검사·린트·단위 테스트 107개·정적 빌드 통과. Chromium과 모바일 WebKit의 왕자 전신·진행바 브라우저 검사 4개 통과. 새 PNG의 알파·색 보존, 허리 연결점, 허리 아래 크림색 바지, 실제 픽셀 연결과 발 접촉을 검사했습니다.
