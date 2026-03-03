# GitWig (깃위그) 🧶

**GitWig**은 개발자를 위한 가볍고 직관적인 모던 Git GUI 클라이언트입니다. Electron과 React를 기반으로 구축되었으며, 복잡한 Git 명령어를 시각화하여 더 쉽고 안전한 버전 관리를 도와줍니다.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Electron](https://img.shields.io/badge/Electron-40-47848F?logo=electron)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss)

---

## 주요 기능 ✨

- **시각화된 커밋 그래프**: Git 히스토리를 한눈에 파악할 수 있는 유려한 인터페이스를 제공합니다.
- **강력한 스테이징 영역**: 변경된 파일을 손쉽게 스테이징하고, 커밋 메시지를 작성할 수 있습니다.
- **상세한 디프(Diff) 뷰어**: Monaco Editor를 사용하여 코드 변경 사항을 선명하게 확인합니다.
- **충돌 해결 도구**: Merge/Rebase 과정에서 발생하는 충돌을 전용 에디터에서 직관적으로 해결할 수 있습니다.
- **사이드바 관리**: 브랜치 생성, 전환, 삭제 및 스태시(Stash) 목록을 간편하게 관리합니다.
- **자동 페치(Auto-fetch)**: 원격 저장소의 변경 사항을 주기적으로 확인하여 로컬 상태를 최신으로 유지합니다.
- **VS Code 스타일 UI**: 익숙하고 깔끔한 다크 테마 기반의 레이아웃을 제공합니다.

## 기술 스택 🛠️

- **Framework**: [React 19](https://react.dev/), [Electron 40](https://www.electronjs.org/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Styling**: [TailwindCSS 4](https://tailwindcss.com/), [Styled-components](https://styled-components.com/)
- **Git Engine**: [Simple-git](https://github.com/steveukx/simple-git)
- **Code Editor**: [Monaco Editor (@monaco-editor/react)](https://github.com/suren-atoyan/monaco-react)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)

## 시작하기 🚀

### 요구 사항
- [Node.js](https://nodejs.org/) (v18 이상 권장)
- [Git](https://git-scm.com/) 설치 필수

### 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone https://github.com/your-username/gitwig.git
   cd gitwig
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **개발 모드 실행**
   ```bash
   npm run dev
   ```

4. **빌드 (패키징)**
   ```bash
   npm run build
   ```

## 기여하기 🤝

GitWig은 오픈소스 프로젝트입니다. 버그 제보, 기능 제안, 그리고 Pull Request는 언제나 환영합니다!

1. 이 저장소를 Fork 합니다.
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`).
3. 변경 사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`).
4. 브랜치에 Push 합니다 (`git push origin feature/AmazingFeature`).
5. Pull Request를 생성합니다.

## 라이선스 📄

이 프로젝트는 **ISC** 라이선스에 따라 라이선스가 부여됩니다. 자세한 내용은 `package.json`을 확인하세요.

