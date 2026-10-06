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

`next.config.ts`는 `output: 'export'`, `basePath: '/timer'`, `trailingSlash: true`, `images.unoptimized: true`를 설정합니다. 빌드는 `out/`를 생성하고 `scripts/verify-export.mjs`가 HTML/CSS/JS의 자산 경로, `_next` 파일, 이미지와 4개 MP3를 확인합니다. 빌드 뒤 Next.js/Node.js 서버, API, 데이터베이스, 인증 서버가 필요하지 않습니다.

`npm run preview`는 **개발 검증 전용** 파일 서버로 `http://127.0.0.1:3000/timer/`에서 `out/`만 제공합니다. GitHub Pages에서는 필요 없습니다.

포트가 사용 중이면 `npm run preview -- --port 17832`로 다른 포트를 지정할 수 있습니다.

## GitHub Pages 배포

1. `neegiman` 계정에 `timer` 저장소를 만듭니다. 무료 GitHub Pages는 공개 저장소를 사용합니다.
2. 소스와 `package-lock.json`을 해당 저장소의 `main`에 올립니다. `out/`와 `node_modules/`는 커밋하지 않습니다.
3. 저장소 **Settings → Pages → Build and deployment → Source → GitHub Actions**를 선택합니다.
4. **Actions → Deploy Next.js to GitHub Pages → Run workflow**를 실행하거나 `main`에 푸시합니다.
5. 빌드/배포 작업이 성공하면 **https://neegiman.github.io/timer/**를 엽니다.

배포 후 `npm run verify:live`로 정확한 게시 URL의 HTML, Next.js 자산, 4개 MP3, SVG와 새로고침 응답을 검증할 수 있습니다.

`.github/workflows/deploy.yml`에는 Node 22, `npm ci`, 타입 검사, 린트, 타이머 테스트, 정적 빌드, `out/` 확인, Pages 아티팩트 업로드와 배포를 설정했습니다. 페이지 설정에는 도메인 루트 `https://neegiman.github.io/`를 사용하지 마세요.

## 핵심 동작

- 씻기·잠자기·밥 먹기·정리·외출·영상 종료·직접 약속 입력.
- 5·10·15·20·30분 또는 1~120분 직접 설정.
- 토끼·곰·자동차·기차·로켓·병아리 여행 친구.
- 실제 타임스탬프와 경로의 누적 길이로 위치를 계산합니다. 애니메이션 프레임 수를 시간으로 세지 않습니다.
- `setup → ready → running → paused → arriving → completed` 상태를 사용합니다. 도착하면 같은 여행 화면에서 깃발과 반짝임이 먼저 나타나고, 650ms 뒤 도착 소리, 2.6초 뒤 별 보상이 나타납니다.
- 부모 메뉴의 일시정지·계속·다시 시작·종료. 다시 시작과 종료에는 확인창이 있습니다.
- 숫자 표시와 소리를 끌 수 있습니다. 숫자가 없어도 친구의 위치와 남은 길이 보입니다.
- 완료된 여행 하나당 별 하나만 받습니다. 별은 빼지 않으며 순위나 점수판이 없습니다. 오늘의 표시만 자정에 새로 시작합니다.

## 새로고침·화면 잠금·소리

`localStorage` 키는 `promise-journey:v1:` 접두어로 구분합니다. 캐릭터, 시간, 약속, 소리, 숫자 표시, 오늘의 별, 진행 중인 여행, 재생한 소리의 기록을 저장합니다. 잘못된 저장 데이터는 검증 후 기본값으로 대체합니다. 저장소 접근이 제한된 경우 현재 탭의 메모리로 동작합니다.

실행 중인 여행의 원래 종료 시각을 저장합니다. 일시정지 시 남은 시간을 고정하고, 재개할 때 종료 시각을 옮깁니다. `visibilitychange`와 `pageshow`에서 현재 시각을 다시 확인하므로, 브라우저가 백그라운드에서 일시 중단되어도 시간을 연장하지 않습니다. 끝난 뒤 돌아오면 도착 애니메이션부터 보여줍니다.

`출발!` 버튼의 명시적 탭에서 Web Audio 컨텍스트를 만들고 재개합니다. MP3를 미리 디코딩하고, 타이머가 끝나면 **finish.mp3를 한 번** 재생합니다. 별 버튼에는 별도의 **success.mp3** 보상 소리가 있습니다. 완료 화면의 새로고침으로 도착 소리가 반복되지 않습니다.

실제 iPhone은 잠금/무음/브라우저 오디오 정책에 따라 백그라운드 소리를 막을 수 있습니다. 잠금 중 즉시 소리를 보장하는 웹 앱은 아닙니다. 시간이 끝나는 시각은 유지하며, 복귀 후 브라우저가 재개를 막으면 **소리를 켜려면 여기를 눌러 주세요** 버튼을 표시합니다. 실행 중 새로고침으로 오디오 컨텍스트가 사라진 경우에도 같은 안내를 제공합니다.

## 정적 자산

`src/lib/assetPath.ts`의 `assetPath()`를 모든 외부 자산 참조에 사용합니다.

```ts
assetPath('/sounds/finish.mp3'); // /timer/sounds/finish.mp3
assetPath('/images/meadow.svg'); // /timer/images/meadow.svg
assetPath('/characters/rabbit.webp'); // /timer/characters/rabbit.webp
```

`public/sounds/`의 4개 MP3는 프로젝트용으로 직접 합성한 부드러운 차임입니다. `npm run sounds`로 다시 만들 수 있습니다. 그림과 아이콘은 프로젝트에 포함된 SVG이며 원격 이미지나 폰트에 의존하지 않습니다.

이미지 캐릭터를 추가하려면 `public/characters/`에 파일을 넣고 `src/lib/characters.ts`에서 `type: 'image'`, `src: '/characters/파일명.webp'`로 바꿉니다. 선택 화면과 여행 화면 모두 `CharacterIcon`을 공유하므로 자동으로 `/timer` 접두어가 적용됩니다.

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

## 이 작업의 검증 결과 (2026-10-06)

- TypeScript 검사 및 ESLint: 오류와 경고 없이 통과.
- 타임스탬프·일시정지·복원·도착·별·자산 경로 단위 검사: 6개 통과.
- 정적 출력의 Chromium 및 모바일 WebKit 브라우저 검사: 12개 통과. Windows WebKit 오디오 API 제한은 위에 명시했습니다.
- `npm run build`: 성공, `out/` 생성, `/timer/_next/` 참조, SVG/PNG 및 4개 MP3 존재 확인.
- 320px부터 휴대폰·태블릿·데스크톱·가로 화면: 페이지 가로 넘침 없음. 데스크톱과 휴대폰 스크린샷으로 레이아웃 확인.
- 저장소: `https://github.com/neegiman/timer`, 기본 브랜치 `main`. GitHub Actions를 통해 위의 고정 URL로 배포합니다.
- 실제 게시 상태 및 정적 리소스 응답은 `npm run verify:live`와 저장소의 최신 Actions 실행 결과로 확인할 수 있습니다.
- 실제 iPhone Safari의 스피커·잠금·복귀 오디오 검사: 실제 기기에서 별도 확인 필요.
