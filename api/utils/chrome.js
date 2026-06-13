const fs = require('fs');
const path = require('path');

/**
 * Finds the Chrome/Chromium executable path dynamically based on OS platform.
 * Supports Windows (Dev), Kali Linux (Dev), Archcraft (Dev), and Debian Linux (Prod).
 * Returns null if no custom/system installation is found, enabling Puppeteer's default fallback.
 */
function getChromePath() {
  // 1. Explicit environment variable check
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  const paths = [];
  const platform = process.platform;

  if (platform === 'win32') {
    // Windows paths
    const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env.LOCALAPPDATA;
    const userProfile = process.env.USERPROFILE;

    paths.push(
      path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe')
    );
    if (localAppData) {
      paths.push(path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'));
    }
    if (userProfile) {
      paths.push(path.join(userProfile, 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'));
    }
  } else if (platform === 'darwin') {
    // macOS paths
    paths.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else {
    // Linux standard paths (Debian, Kali, Archcraft, Ubuntu)
    paths.push(
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    );
  }

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

module.exports = { getChromePath };
