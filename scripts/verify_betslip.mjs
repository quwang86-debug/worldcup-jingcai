/**
 * 选注流程移动端验收：赔率中心点选两场 → 出现悬浮方案栏 → 详情页点选 → 计算器自动同步。
 * 用法：先启动 dev server，再运行 node scripts/verify_betslip.mjs
 */
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL || "http://localhost:5180";
const OUT = "screenshots/betslip";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

// 1. 赔率中心：点选第一场「主胜」、第二场「客胜」
await page.goto(`${BASE}/#/odds`, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.removeItem("wc_betslip"));
await page.reload({ waitUntil: "networkidle0" });
await sleep(400);

const chips = await page.$$(".odds-item .opt-chip");
if (chips.length < 6) throw new Error(`期望至少 6 个赔率芯片，实际 ${chips.length}`);
await chips[0].tap(); // 第一场 主胜
await sleep(200);
await chips[5].tap(); // 第二场 客胜
await sleep(400);
await page.screenshot({ path: `${OUT}/odds-selected-mobile.png` });

const slipBar = await page.$(".slip-bar");
console.log("悬浮方案栏出现：", Boolean(slipBar));

// 2. 详情页赔率 tab：换玩法点选（总进球数）
await page.goto(`${BASE}/#/match/760416?tab=odds`, { waitUntil: "networkidle0" });
await sleep(400);
const detailChips = await page.$$(".chip-grid .opt-chip");
if (detailChips.length) await detailChips[detailChips.length - 1].tap();
await sleep(400);
await page.screenshot({ path: `${OUT}/detail-odds-selected-mobile.png` });

// 3. 计算器：应自动带入所有选注并默认 n 串 1
await page.goto(`${BASE}/#/calculator`, { waitUntil: "networkidle0" });
await sleep(400);
const legCount = await page.$$eval(".leg", (els) => els.length);
const resultText = await page.$eval(".calc-page", (el) => el.innerText.slice(0, 400));
console.log("计算器场次数：", legCount);
console.log(resultText.includes("串1") ? "已自动选择过关方式" : "未检测到过关方式文案");
await page.screenshot({ path: `${OUT}/calculator-synced-mobile.png` });

await browser.close();
console.log("完成，截图位于", OUT);
