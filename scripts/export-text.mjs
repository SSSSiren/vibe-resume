import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createBrowserLaunchError } from "./export-errors.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const outputArg = process.argv[2];
const inputArg = process.argv[3] || process.env.RESUME_HTML;
const inputHtml = inputArg
  ? path.resolve(repoRoot, inputArg)
  : path.join(repoRoot, "index.html");
const outputText = path.resolve(repoRoot, outputArg || "export/钟杨波-计算机硕士-南航.txt");

function findPlaywrightHeadlessShell() {
  const cacheRoot = path.join(process.env.HOME || "", "Library", "Caches", "ms-playwright");
  if (!existsSync(cacheRoot)) return undefined;

  const versions = readdirSync(cacheRoot)
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse();

  for (const version of versions) {
    const candidate = path.join(
      cacheRoot,
      version,
      "chrome-headless-shell-mac-arm64",
      "chrome-headless-shell"
    );
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

function normalizePlainText(text) {
  return `${text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`;
}

const chromeCandidates = [
  process.env.CHROME_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  findPlaywrightHeadlessShell(),
  chromium.executablePath(),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/home/lmx/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable"
].filter(Boolean);

const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  throw new Error(
    "No Chromium executable found. Set CHROME_PATH to a Chrome/Chromium binary and rerun ./export-text.sh."
  );
}

await mkdir(path.dirname(outputText), { recursive: true });

let browser;
try {
  browser = await chromium.launch({
    executablePath,
    headless: true
  });
} catch (error) {
  throw createBrowserLaunchError(error, executablePath, "./export-text.sh");
}

try {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: {
      width: 1200,
      height: 2200
    }
  });

  await page.emulateMedia({ media: "screen" });
  await page.goto(pathToFileURL(inputHtml).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts?.ready);

  const text = await page.evaluate(() => {
    document.querySelector(".toolbar")?.remove();
    const resumeRoot =
      document.querySelector(".page") ||
      document.querySelector(".resume-book") ||
      document.querySelector(".resume-page") ||
      document.body;

    return resumeRoot.innerText || "";
  });

  await writeFile(outputText, normalizePlainText(text), "utf8");

  console.log(`Text exported: ${path.relative(repoRoot, outputText)}`);
  console.log(`Input HTML: ${path.relative(repoRoot, inputHtml)}`);
  console.log(`Chromium: ${executablePath}`);
} finally {
  await browser.close();
}
