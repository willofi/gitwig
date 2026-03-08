# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # 의존성 설치
npm run dev       # Electron + Vite 개발 서버 동시 실행 (HMR 지원)
npm run build     # TypeScript 컴파일 → Vite 빌드 → electron-builder 패키징
```

테스트 설정 없음.

## Architecture

GitWig은 **Electron + React** 기반의 Git GUI 데스크톱 앱이다. 프로세스 경계를 중심으로 두 개의 레이어로 나뉜다.

### Electron Main Process (`electron/`)

- **`main.ts`**: 앱 진입점. BrowserWindow 생성, GPU 비활성화 플래그 설정(크래시 방지), `gitService.ts` import로 IPC 핸들러 등록
- **`preload.ts`**: `contextBridge`로 `window.electronAPI`를 renderer에 노출. `git.*` 메서드와 `dialog.*` 메서드로 구성
- **`git/gitService.ts`**: `simple-git` 기반 IPC 핸들러 모음. `getGit(path)` 함수가 경로별 `SimpleGit` 인스턴스를 캐싱. `git:getLog`는 커스텀 포맷(`@%@` 구분자)으로 raw git log 반환

### Renderer Process (`src/`)

- **`store/repoStore.ts`**: 앱 전체 상태를 관리하는 단일 Zustand 스토어. `refresh()`가 핵심 함수로, `git:getLog`, `git:getStatus`, `git:getBranches`, `git:getStashes`를 병렬 호출 후 파싱. 커밋 목록 파싱은 스토어 내부에서 직접 처리
- **`types/git.types.ts`**: 타입 정의 + `Window` 인터페이스 확장 (`window.electronAPI` 타입 선언)
- **`utils/graphLayout.ts`**: `processCommitsForGraph()` — 커밋 목록에 lane/color/lanesIn/lanesOut 등 그래프 렌더링용 데이터를 주입. 입력 목록이 동일하면 캐시 반환

### UI 레이아웃 (`src/App.tsx`)

```
TitleBar
MainToolbar
├── [logs 모드] GitLogView
└── [repo 모드]
    ├── Sidebar (브랜치/프로젝트/스태시 패널)
    ├── CommitGraph + CommitDetail (메인 영역)
    └── StagingPanel (우측 280px)
ConflictResolutionPanel (오버레이)
StatusBar (하단 24px, VS Code 스타일)
```

### IPC 흐름

`renderer → preload (window.electronAPI.git.*) → ipcRenderer.invoke → ipcMain.handle → simple-git → OS git binary`

### 주요 키보드 단축키 (App.tsx)

- `Cmd/Ctrl+R`: 리포지토리 새로고침
- `Cmd/Ctrl+,`: 설정 모달 열기

### Path alias

`@/` → `src/` (vite.config.ts에서 설정)
