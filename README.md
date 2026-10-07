# 약속 여행

숫자보다 **결승점까지 남은 거리**로 시간을 이해하는 유아용 비주얼 타이머입니다. 기본 언어는 한국어입니다.

**고정 배포 주소: https://neegiman.github.io/timer/**  
**저장소: https://github.com/neegiman/timer**

## 시작하기

Node.js 22와 npm을 사용합니다.

```sh
npm ci
npm run dev
```

개발 주소도 `http://localhost:3000/timer/`입니다. 루트 `/`에 설치하는 앱이 아닙니다.

## 정적 빌드와 미리보기

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

`next.config.ts`는 `output: 'export'`, `basePath: '/timer'`, `trailingSlash: true`, `images.unoptimized: true`를 설정합니다. 빌드는 `out/`를 생성하고 `scripts/verify-export.mjs`가 HTML/CSS/JS의 자산 경로, `_next` 파일, 이미지와 11개 MP3를 확인합니다. 빌드 뒤 Next.js/Node.js 서버, API, 데이터베이스, 인증 서버가 필요하지 않습니다.

`npm run preview`는 **개발 검증 전용** 파일 서버로 `http://127.0.0.1:3000/timer/`에서 `out/`만 제공합니다. GitHub Pages에서는 필요 없습니다.

포트가 사용 중이면 `npm run preview -- --port 17832`로 다른 포트를 지정할 수 있습니다.

## GitHub Pages 배포

1. `neegiman` 계정에 `timer` 저장소를 만듭니다. 무료 GitHub Pages는 공개 저장소를 사용합니다.
2. 소스와 `package-lock.json`을 해당 저장소의 `main`에 올립니다. `out/`와 `node_modules/`는 커밋하지 않습니다.
3. 저장소 **Settings → Pages → Build and deployment → Source → GitHub Actions**를 선택합니다.
4. **Actions → Deploy Next.js to GitHub Pages → Run workflow**를 실행하거나 `main`에 푸시합니다.
5. 빌드/배포 작업이 성공하면 **https://neegiman.github.io/timer/**를 엽니다.

배포 후 `npm run verify:live`로 정확한 게시 URL의 HTML, Next.js 자산, 11개 MP3, SVG와 새로고침 응답을 검증할 수 있습니다.

`.github/workflows/deploy.yml`에는 Node 22, `npm ci`, 타입 검사, 린트, 타이머 테스트, 정적 빌드, `out/` 확인, Pages 아티팩트 업로드와 배포를 설정했습니다. 페이지 설정에는 도메인 루트 `https://neegiman.github.io/`를 사용하지 마세요.

## 핵심 동작

- 약속 → 시간 → 친구를 한 화면에 하나씩 고르는 3단계 준비 화면. 약속은 2열, 친구는 3열로 배치하고 64~72px 아이콘과 22~24px 글자를 사용합니다.
- 여행 화면의 캐릭터는 100~120px이며 길은 화면 높이의 절반 이상을 차지합니다. 목적지에 선택한 약속 아이콘을 크게 보여줍니다.
- 아이에게는 짧은 문장으로 안내하고, 일시정지·재시작·종료·소리·숫자 표시는 부모 메뉴에서 조절합니다.
- 씻기·잠자기·밥 먹기·정리·외출·영상 종료·직접 약속 입력.
- 5·10·15·20·30분 또는 1~120분 직접 설정.
- 토끼·곰·자동차·기차·로켓·병아리 여행 친구.
- 타이머는 실제 종료 시각을 사용하고, 애니메이션 컨트롤러가 각 단계의 위치 앵커와 몸동작을 결정합니다. 원시 진행률을 캐릭터 위치에 직접 적용하지 않습니다.
- `setup → ready → running → paused → arriving → completed` 타이머 상태와 20개 애니메이션 Phase를 분리합니다. 결승선을 통과한 뒤 감속·뒤돌기·점프·착지·축하를 순서대로 보여주며, 4.25초 뒤 별 보상이 나타납니다.
- 부모 메뉴의 일시정지·계속·다시 시작·종료. 다시 시작과 종료에는 확인창이 있습니다.
- 숫자 표시와 소리를 끌 수 있습니다. 숫자가 없어도 친구의 위치와 남은 길이 보입니다.
- 완료된 여행 하나당 별 하나만 받습니다. 별은 빼지 않으며 순위나 점수판이 없습니다. 오늘의 표시만 자정에 새로 시작합니다.

## 새로고침·화면 잠금·소리

`localStorage` 키는 `promise-journey:v1:` 접두어로 구분합니다. 캐릭터, 시간, 약속, 소리, 숫자 표시, 오늘의 별, 진행 중인 여행, 재생한 소리의 기록을 저장합니다. 잘못된 저장 데이터는 검증 후 기본값으로 대체합니다. 저장소 접근이 제한된 경우 현재 탭의 메모리로 동작합니다.

실행 중인 여행의 원래 종료 시각을 저장합니다. 일시정지 시 남은 시간을 고정하고, 재개할 때 종료 시각을 옮깁니다. `visibilitychange`와 `pageshow`에서 현재 시각을 다시 확인하므로, 브라우저가 백그라운드에서 일시 중단되어도 시간을 연장하지 않습니다. 끝난 뒤 돌아오면 도착 애니메이션부터 보여줍니다.

`출발!` 버튼의 명시적 탭에서 Web Audio 컨텍스트를 만들고 재개합니다. MP3를 미리 디코딩하고, 타이머가 끝나면 **finish.mp3를 한 번** 재생합니다. 별 버튼에는 별도의 **success.mp3** 보상 소리가 있습니다. 완료 화면의 새로고침으로 도착 소리가 반복되지 않습니다.

실제 iPhone은 잠금/무음/브라우저 오디오 정책에 따라 백그라운드 소리를 막을 수 있습니다. 잠금 중 즉시 소리를 보장하는 웹 앱은 아닙니다. 시간이 끝나는 시각은 유지하며, 복귀 후 브라우저가 재개를 막으면 **소리 켜기** 버튼을 표시합니다. 실행 중 새로고침으로 오디오 컨텍스트가 사라진 경우에도 같은 안내를 제공합니다.

## 정적 자산

`src/lib/assetPath.ts`의 `assetPath()`를 모든 외부 자산 참조에 사용합니다.

```ts
assetPath('/sounds/finish.mp3'); // /timer/sounds/finish.mp3
assetPath('/images/meadow.svg'); // /timer/images/meadow.svg
assetPath('/characters/rabbit.webp'); // /timer/characters/rabbit.webp
```

`public/sounds/`의 11개 MP3는 프로젝트용으로 직접 합성한 부드러운 차임입니다. 시작·절반·결승점 인지·카운트다운·통과·점프·착지·축하에 맞춰 한 번씩 재생하며 일반 걷기 구간에는 효과음을 반복하지 않습니다. `npm run sounds`로 다시 만들 수 있습니다. 그림과 아이콘은 프로젝트에 포함된 SVG이며 원격 이미지나 폰트에 의존하지 않습니다.

이미지 캐릭터를 추가하려면 `public/characters/`에 파일을 넣고 `src/lib/characters.ts`에서 `type: 'image'`, `src: '/characters/파일명.webp'`로 바꿉니다. 선택 화면과 여행 화면 모두 `CharacterIcon`을 공유하므로 자동으로 `/timer` 접두어가 적용됩니다.

## 애니메이션 구조

`Timer Engine → AnimationController → Phase / Action / Target Position / Background / Sound / Message` 구조입니다.

- `src/lib/animation.ts`: 순수 상태 계산, 위치 앵커, 구간별 easing, 20개 Phase, 결승 후 순서와 길이.
- `src/hooks/useAnimationController.ts`: 타이머의 밀리초 입력을 애니메이션 상태로 전달합니다.
- `src/hooks/useJourneyRenderer.ts`: `requestAnimationFrame`에서 DOM의 `translate3d` 및 Web Animation의 `currentTime`만 갱신합니다. 매 프레임 React state를 갱신하지 않습니다.
- 이동 wrapper와 몸동작 sprite를 분리했습니다. 토끼 SVG의 발·귀·눈·머리·팔은 별도로 움직입니다.
- `src/lib/motionProfiles.ts`: 캐릭터별 보행 주기·바운스·기울기. 기존 여섯 캐릭터에 강아지·고양이를 추가해 여덟 친구를 지원합니다.
- 시작 연출은 INTRO 1.8초 + START 1초입니다. 휴식은 최대 1.2초, 반응은 최대 1초, 절반 점프는 1.8초로 제한합니다. 긴 타이머에서도 짧은 동작이 수 분으로 늘어나지 않습니다.
- 일반 문장은 최소 3초 표시합니다. 준비·출발·실제 초 카운트다운·결승 연출은 예외입니다. 숫자 표시를 끄면 마지막 10초 숫자와 숫자 문장도 숨깁니다.
- 마지막 10초와 3초는 비율 구간보다 우선하며 1~120분에서 항상 실제 남은 초를 따릅니다.
- 결승 후 `CROSS_FINISH(300ms) → OVERSHOOT(400ms) → BRAKE(450ms) → TURN(500ms) → JUMP(600ms) → LAND(400ms) → CELEBRATE(1600ms)` 순서입니다. 위치는 100%를 넘어 107%까지 이동합니다.
- 종료 순서는 별도의 저장된 도착 시각으로 계산합니다. 중첩 timeout이나 async delay 체인 없이 새로고침·백그라운드 복귀 시 단계와 경과 시간을 복원합니다. 종료·재시작은 이전 프레임 루프와 오디오를 취소합니다.
- 일시정지 시 Phase·위치·Web Animation의 현재 시간·배경·카운트다운을 유지하고, 재개 시 같은 동작부터 계속합니다.
- ResizeObserver로 실제 트랙/캐릭터 크기를 측정하고 이동 영역을 제한합니다. 가로 화면에서는 캐릭터를 줄여 점프 공간을 확보합니다.
- 모션 감소 시 바운스와 시차 배경을 제거하고 축하 별을 두 개로 줄입니다. 타이머 시각과 결승 순서는 동일합니다.

## 브라우저 검증

```sh
npx playwright install chromium webkit
npm run build
npm run test:e2e
```

실제 `out/`만 `/timer/`에서 제공하는 테스트 서버를 사용합니다. Chromium 및 iPhone 크기의 WebKit에서 10분 씻기 여행, 단계별 메시지, 도착 상태, 오디오 출력 호출 횟수, 별 중복 방지/새로고침 저장, 일시정지/재개, 백그라운드 시각 복원, 직접 입력, 확인창, 320px/휴대폰/태블릿/가로 화면, 잘못된 저장 데이터, 모션 감소 설정을 검사합니다.

이 작업 환경의 Windows WebKit에는 `AudioContext`가 없어 실제 오디오 디코딩/출력 횟수 검사는 Chromium에서 수행하며, WebKit은 여행·별·설정·복원·모바일 화면을 검사합니다. 테스트 결과에 이 제한을 명시합니다. WebKit 자동화는 실제 iPhone 하드웨어와 동일한 오디오 정책을 보장하지 않습니다. 실제 게시 뒤 다음 검사를 별도로 수행하세요.

1. iPhone Safari에서 씻기 → 10분 → 토끼 → 출발!을 눌러 출발 소리를 확인합니다.
2. 부모 메뉴로 일시정지·계속을 눌러 시간이 멈추고 이어지는지 확인합니다.
3. 화면을 잠갔다가 돌아와 경과한 시간만큼 친구가 이동했는지 확인합니다.
4. 도착 반짝임·소리가 한 번 나타나고 별을 한 번만 받을 수 있는지 확인합니다.
5. 게시 URL에서 새로고침하고 개발자 도구에서 `/timer/_next/`, `/timer/sounds/`, `/timer/images/`가 200을 반환하는지 확인합니다.

현재 로컬 구현과 실제 GitHub 배포 상태는 별개입니다. 저장소 접근과 Pages의 배포 성공을 확인하기 전에는 게시가 완료된 것으로 간주하지 않습니다.

## 이 작업의 검증 결과 (2026-10-07)

- TypeScript 검사 및 ESLint: 오류와 경고 없이 통과.
- 타임스탬프·일시정지·복원·도착·별·자산 경로 및 애니메이션 Phase·위치 연속성·1/10/120분·결승 순서 단위 검사: 13개.
- 정적 출력의 Chromium 및 모바일 WebKit 브라우저 검사: 22개. Windows WebKit 오디오 API 제한은 위에 명시했습니다.
- `npm run build`: 성공, `out/` 생성, `/timer/_next/` 참조, SVG/PNG 및 11개 MP3 존재 확인.
- 320px부터 휴대폰·태블릿·데스크톱·가로 화면: 페이지 가로 넘침 없음. 데스크톱과 휴대폰 스크린샷으로 레이아웃 확인.
- 저장소: `https://github.com/neegiman/timer`, 기본 브랜치 `main`. GitHub Actions를 통해 위의 고정 URL로 배포합니다.
- 실제 게시 상태 및 정적 리소스 응답은 `npm run verify:live`와 저장소의 최신 Actions 실행 결과로 확인할 수 있습니다.
- 실제 iPhone Safari의 스피커·잠금·복귀 오디오 검사: 실제 기기에서 별도 확인 필요.
