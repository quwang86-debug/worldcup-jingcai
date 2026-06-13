/**
 * 将 dist/ 上传到腾讯云 COS 静态网站（默认域名，国内可直连）。
 *
 * 控制台一次性配置（腾讯云 COS）：
 * 1. 创建存储桶：地域选广州/上海，访问权限「公有读私有写」
 * 2. 基础配置 → 静态网站：索引文档 index.html，错误文档 index.html
 * 3. 访问管理 → 密钥管理 → 创建 SecretId / SecretKey（仅授予 COS 上传权限）
 *
 * 环境变量：
 *   TENCENT_COS_REGION   如 ap-guangzhou
 *   TENCENT_COS_BUCKET   完整桶名（含 APPID，如 worldcup-1250000000）
 *   TENCENT_COS_SECRET_ID
 *   TENCENT_COS_SECRET_KEY
 *
 * 用法：npm run build && npm run deploy:cos
 */
import COS from "cos-nodejs-sdk-v5";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

const REGION = process.env.TENCENT_COS_REGION;
const BUCKET = process.env.TENCENT_COS_BUCKET;
const SECRET_ID = process.env.TENCENT_COS_SECRET_ID;
const SECRET_KEY = process.env.TENCENT_COS_SECRET_KEY;

function requireEnv(name, value) {
  if (!value) throw new Error(`缺少环境变量 ${name}`);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
    ".map": "application/json",
  };
  return map[ext] || "application/octet-stream";
}

function cacheControl(key) {
  if (key.startsWith("assets/") && /-[a-zA-Z0-9]{8,}\./.test(key)) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=0, must-revalidate";
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

async function listAllKeys(cos) {
  const keys = [];
  let marker = undefined;
  do {
    const result = await cos.getBucket({
      Bucket: BUCKET,
      Region: REGION,
      MaxKeys: 1000,
      Marker: marker,
    });
    for (const item of result.Contents || []) keys.push(item.Key);
    marker = result.IsTruncated === "true" ? result.NextMarker : undefined;
  } while (marker);
  return keys;
}

async function main() {
  requireEnv("TENCENT_COS_REGION", REGION);
  requireEnv("TENCENT_COS_BUCKET", BUCKET);
  requireEnv("TENCENT_COS_SECRET_ID", SECRET_ID);
  requireEnv("TENCENT_COS_SECRET_KEY", SECRET_KEY);

  try {
    await access(DIST);
  } catch {
    throw new Error("dist/ 不存在，请先执行 npm run build");
  }

  const cos = new COS({ SecretId: SECRET_ID, SecretKey: SECRET_KEY });

  const localFiles = await walk(DIST);
  const localKeys = new Set();

  console.log(`上传 ${localFiles.length} 个文件到 ${BUCKET} (${REGION})…`);

  for (const filePath of localFiles) {
    const key = path.relative(DIST, filePath).replace(/\\/g, "/");
    localKeys.add(key);
    const body = await readFile(filePath);
    await cos.putObject({
      Bucket: BUCKET,
      Region: REGION,
      Key: key,
      Body: body,
      ContentType: contentType(filePath),
      CacheControl: cacheControl(key),
    });
    console.log(`  ↑ ${key}`);
  }

  const remoteKeys = await listAllKeys(cos);
  for (const key of remoteKeys) {
    if (!localKeys.has(key)) {
      await cos.deleteObject({ Bucket: BUCKET, Region: REGION, Key: key });
      console.log(`  − ${key}`);
    }
  }

  const httpsUrl = `https://${BUCKET}.cos.${REGION}.myqcloud.com/index.html`;
  const websiteUrl = `http://${BUCKET}.cos-website.${REGION}.myqcloud.com/`;

  console.log("\n部署完成。国内访问地址（HTTPS，推荐分享）：");
  console.log(`  ${httpsUrl}`);
  console.log(`  赔率页：${httpsUrl}#/odds`);
  console.log("\n静态网站托管域名（HTTP）：");
  console.log(`  ${websiteUrl}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
