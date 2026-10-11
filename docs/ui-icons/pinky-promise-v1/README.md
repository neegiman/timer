# 새끼손가락 약속 아이콘

‘직접 약속 쓰기’와 직접 입력한 활동의 아이콘을 두 손이 새끼손가락을 거는 원화로 교체했습니다. 기존 악수 로고와 다른 활동의 아이콘은 유지합니다.

- 제작: 내장 ImageGen. `../story-v1/icon-family.png`를 질감·색감 참고 이미지로 사용했습니다.
- 원본: [source.png](source.png), 투명 배경.
- 최종 프롬프트: [prompt.txt](prompt.txt).
- 사이트 자산: `public/images/story-v1/custom.webp`, 320×320, 투명 WebP.
- 재생성: `npm run icons`. 커밋된 원본을 정규화하므로 이미지 생성 도구 없이 재현됩니다.
- 실제 화면: [runtime-preview.png](runtime-preview.png).

선택 화면에서는 40px로 표시하고, 진행 화면·도착점·보상 기록에서도 같은 `PromiseIcon`을 사용합니다. 모든 요청 경로는 `/timer/images/story-v1/custom.webp`입니다.
