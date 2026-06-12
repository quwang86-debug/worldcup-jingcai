/**
 * 将 dist/ 上传到阿里云 OSS 静态网站（默认域名，国内可直连）。
 *
 * 控制台一次性配置（阿里云 OSS）：
 * 1. 创建 Bucket：地域选国内（如 oss-cn-hangzhou），读写权限「公共读」
 * 2. 基础设置 → 静态页面：默认首页 index.html，404 页也填 index.html（hash 路由兼容）
 * 3. RAM → 用户 → 创建 AccessKey，仅授予该 Bucket 的 PutObject / ListObjects / DeleteObject
 *
 * 环境变量：
 *   ALIYUN_OSS_REGION      如 oss-cn-hangzhou
 *   ALIYUN_OSS_BUCKET      桶名
 *   ALIYUN_OSS_ACCESS_KEY_ID
 *   ALIYUN_OSS_ACCESS_KEY_SECRET
 *
 * 用法：npm run build && npm run deploy:oss
 */
import OSS from "ali-oss";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

const REGION = process.env.ALIYUN_OSS_REGION;
const BUCKET = process.env.ALIYUN_OSS_BUCKET;
const ACCESS_KEY_ID = process.env.ALIYUN_OSS_ACCESS_KEY_ID;
const ACCESS_KEY_SECRET = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;

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

async function listAllKeys(client) {
  const keys = [];
  let marker = null;
  do {
    const result = await client.list({ marker, "max-keys": 1000 });
    for (const obj of result.objects || []) keys.push(obj.name);
    marker = result.isTruncated ? result.nextMarker : null;
  } while (marker);
  return keys;
}

async function main() {
  requireEnv("ALIYUN_OSS_REGION", REGION);
  requireEnv("ALIYUN_OSS_BUCKET", BUCKET);
  requireEnv("ALIYUN_OSS_ACCESS_KEY_ID", ACCESS_KEY_ID);
  requireEnv("ALIYUN_OSS_ACCESS_KEY_SECRET", ACCESS_KEY_SECRET);

  try {
    await access(DIST);
  } catch {
    throw new Error("dist/ 不存在，请先执行 npm run build");
  }

  const client = new OSS({
    region: REGION,
    accessKeyId: ACCESS_KEY_ID,
    accessKeySecret: ACCESS_KEY_SECRET,
    bucket: BUCKET,
  });

  const localFiles = await walk(DIST);
  const localKeys = new Set();

  console.log(`上传 ${localFiles.length} 个文件到 ${BUCKET} (${REGION})…`);

  for (const filePath of localFiles) {
    const key = path.relative(DIST, filePath).replace(/\\/g, "/");
    localKeys.add(key);
    const body = await readFile(filePath);
    await client.put(key, body, {
      headers: {
        "Content-Type": contentType(filePath),
        "Cache-Control": cacheControl(key),
      },
    });
    console.log(`  ↑ ${key}`);
  }

  const remoteKeys = await listAllKeys(client);
  const stale = remoteKeys.filter((k) => !localKeys.has(k));
  for (const key of stale) {
    await client.delete(key);
    console.log(`  − ${key}`);
  }

  const httpsUrl = `https://${BUCKET}.${REGION}.aliyuncs.com/index.html`;
  const websiteUrl = `http://${BUCKET}.oss-website-${REGION.replace(/^oss-/, "")}.aliyuncs.com/`;

  console.log("\n部署完成。国内访问地址（HTTPS，推荐分享）：");
  console.log(`  ${httpsUrl}`);
  console.log(`  赔率页：${httpsUrl}#/odds`);
  console.log("\n静态网站托管域名（HTTP，部分场景可用）：");
  console.log(`  ${websiteUrl}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
