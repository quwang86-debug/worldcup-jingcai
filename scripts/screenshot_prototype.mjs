/**
 * 原型验收截图：用本机 Chrome 精确模拟 16:9 桌面与 iPhone 视口。
 * 用法：先启动 dev server，再运行 node scripts/screenshot_prototype.mjs
 */
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL || "http://localhost:5180";
const OUT = "screenshots/prototype";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const VIEWPORTS = {
  desktop: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const PAGES = [
  { name: "home", path: "/" },
  { name: "odds", path: "/odds" },
  { name: "reports", path: "/reports" },
  { name: "detail-overview", path: "/match/760416" },
  { name: "detail-odds", path: "/match/760416?tab=odds" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();

for (const [device, viewport] of Object.entries(VIEWPORTS)) {
  await page.setViewport(viewport);

  for (const target of PAGES) {
    await page.goto(`${BASE}/#${target.path}`, { waitUntil: "networkidle0" });
    await sleep(400);
    await page.screenshot({ path: `${OUT}/${target.name}-${device}.png` });
  }

  // 计算器：预载一场 + 交互添加两场 + 选过关方式，截取真实使用状态
  await page.goto(`${BASE}/#/calculator?add=760416`, { waitUntil: "networkidle0" });
  await sleep(400);
  try {
    for (let i = 0; i < 2; i++) {
      await page.click(".add-more");
      await sleep(300);
      await page.click(".candidate");
      await sleep(300);
    }
    const pills = await page.$$(".size-pill");
    for (const pill of pills.slice(0, 2)) await pill.click();
    await sleep(300);
  } catch (error) {
    console.warn("calculator interaction failed:", error.message);
  }
  await page.screenshot({ path: `${OUT}/calc-${device}.png` });
}

await browser.close();
console.log("screenshots saved to", OUT);
