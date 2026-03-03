/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = {
  appId: "com.gitwig.app",
  productName: "GitWig",
  directories: {
    output: "release",
    buildResources: "build"
  },
  files: [
    "dist",
    "dist-electron"
  ],
  mac: {
    target: ["dmg"],
    icon: "build/icon.icns"
  },
  win: {
    target: ["nsis"],
    icon: "build/icon.ico"
  },
  linux: {
    target: ["AppImage"],
    icon: "build/icon.png"
  }
};
