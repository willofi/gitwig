# GitWig 리팩토링 계획서 v1 (안정성·유지보수 우선, 점진적 개선)

## Summary
- 목표는 기능 변경 없이 코드베이스의 결합도/중복/타입 불일치를 줄여, 이후 성능·UI 개선이 빠르게 가능한 구조로 만드는 것이다.
- 1차는 `store`/`IPC`/`대형 UI 컴포넌트` 3축을 분리하고, 공통 실행 로깅·에러 처리·diff 파싱을 표준화한다.
- 우선 대상은 `src/store/repoStore.ts`, `electron/git/gitService.ts`, `src/components/CommitGraph/CommitGraph.tsx`.

## Implementation Changes
- 상태 계층 분리
  - `repoStore`를 `repo/session`, `git-log`, `ui-preference` 슬라이스로 분리한다.
  - `window as any` 기반 타이머(`_filterTimeout`, `_lastRefresh`)를 제거하고 store 내부 scheduler 유틸로 치환한다.
  - `refresh` 요청에 request-id 가드를 넣어 늦게 끝난 이전 응답이 최신 상태를 덮어쓰지 못하게 한다.
- IPC/서비스 계약 정리
  - preload-main-renderer 간 `any` 옵션 타입을 제거하고 `GitLogOptions`, `StashEntry`, `GitCommandResult`를 명시 타입으로 고정한다.
  - `git:readFile`/`git:writeFile`는 `repoPath + relativePath` 인터페이스로 변경한다.
  - `gitMap` 캐시 정리 정책(LRU 또는 project close cleanup)을 추가한다.
- UI 컴포넌트 구조화
  - `CommitGraph`/`BranchPanel` 액션 핸들러를 `useGitActions` 훅으로 추출해 중복 `runWithLog`를 단일화한다.
  - `alert/confirm` 흐름을 공통 `Notification/ConfirmModal`로 치환한다.
  - 반복되는 인라인 스타일을 토큰/variant 컴포넌트로 수렴한다.
- Diff/Conflict 로직 정규화
  - `DiffViewer`와 `SplitDiffViewer`의 `parseDiff` 중복을 `diffParser` 유틸로 통합한다.
  - Conflict 편집기 파서는 `electron/git/conflictParser.ts`를 단일 소스로 재사용한다.
- 안정성 보강
  - updater 이벤트 구독을 unsubscribe 가능한 형태로 바꿔 리스너 중복 등록을 막는다.
  - Git 액션 실패 문자열 분기를 에러 분류 유틸로 일원화한다.

## Public API / Interface Changes
- `window.electronAPI.git.readFile(path)` → `readFile(repoPath, relativePath)`
- `window.electronAPI.git.writeFile(path, content)` → `writeFile(repoPath, relativePath, content)`
- `getStashes(): Promise<{ all: any[] }>` → `Promise<{ all: StashEntry[] }>`
- 공통 훅: `useGitActions()`
- 공통 유틸: `parseUnifiedDiff(raw)`, `buildSplitRows(raw)`

## Test Plan
- 단위 테스트
  - `diffParser`: 추가/삭제/컨텍스트/hunk/file-header, 빈 diff, binary diff
  - `store scheduler`: 연속 refresh 시 최신 응답만 반영
  - `git error mapper`: checkout/pull/merge 충돌 메시지 분류 정확성
- 통합 테스트(렌더러+IPC mock)
  - 브랜치 액션에서 로그/로딩/에러 UI 흐름 일관성
  - staging add/reset/commit 이후 상태 갱신 경로 검증
  - 설정 모달 반복 open/close 시 updater 리스너 중복 미발생 확인
- 수동 검증
  - 대형 repo(커밋 3k+)에서 그래프 스크롤/필터/선택 반응성 회귀 확인
  - split diff 창 동기 스크롤/테마 전환/재오픈 안정성 확인

## Assumptions
- 우선순위: 안정성+유지보수
- 변경 폭: 점진적 개선
- 1차 범위는 기능 추가 없이 내부 구조 개선과 동작 동일성 유지에 집중한다.
- 패키징/릴리즈 환경 이슈는 별도 트랙으로 분리한다.
