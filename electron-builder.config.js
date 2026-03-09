/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = {
  appId: "com.gitwig.app",
  productName: "Gitwig",
  directories: {
    output: "dist",
    buildResources: "build"
  },
  files: [
    "dist/index.html",
    "dist/assets/**/*",
    "dist-electron/**/*"
  ],
  // GitHub Releases 자동 업데이트 설정
  publish: {
    provider: "github",
    owner: "willofi",
    repo: "gitwig",
    releaseType: "release"
  },
  mac: {
    target: [
      { target: "dmg", arch: ["arm64", "x64"] }
    ],
    icon: "build/icon.png",
    // 코드 사이닝 없이 배포할 경우: CSC_IDENTITY_AUTO_DISCOVERY=false
    // 프로덕션에서는 Apple Developer 인증서 설정 권장
    hardenedRuntime: false
  },
  win: {
    target: [
      { target: "nsis", arch: ["x64"] }
    ],
    icon: "build/icon.ico"
  },
  linux: {
    target: ["AppImage"],
    icon: "build/icon.png"
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  }
};
