/**
 * 抓取竞彩足球真实赔率（来源：500.com 静态 XML，与体彩官方开售赔率同步）。
 * 体彩官网 webapi 在本环境会被 EdgeOne 拦截，故采用 500 公开数据文件。
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://trade.500.com/static/public/jczq/newxml";
const UA = "Mozilla/5.0 (compatible; WorldCupOddsFetcher/1.0)";
const OUTPUT_DIR = path.resolve("data");
const ODDS_PATH = path.join(OUTPUT_DIR, "worldcup_2026_odds.json");
const HISTORY_DIR = path.join(OUTPUT_DIR, "odds_history");
const SCHEDULE_PATH = path.join(OUTPUT_DIR, "worldcup_2026_matches_beijing.json");

const BF_FIELDS = [
  ["a10", "1:0"], ["a20", "2:0"], ["a21", "2:1"], ["a30", "3:0"], ["a31", "3:1"], ["a32", "3:2"],
  ["a40", "4:0"], ["a41", "4:1"], ["a42", "4:2"], ["a50", "5:0"], ["a51", "5:1"], ["a52", "5:2"],
  ["aother", "胜其他"],
  ["c00", "0:0"], ["c11", "1:1"], ["c22", "2:2"], ["c33", "3:3"], ["cother", "平其他"],
  ["b10", "0:1"], ["b20", "0:2"], ["b21", "1:2"], ["b30", "0:3"], ["b31", "1:3"], ["b32", "2:3"],
  ["b40", "0:4"], ["b41", "1:4"], ["b42", "2:4"], ["b50", "0:5"], ["b51", "1:5"], ["b52", "2:5"],
  ["bother", "负其他"],
];

const BQC_FIELDS = [
  ["aa", "胜/胜"], ["ac", "胜/平"], ["ab", "胜/负"],
  ["ca", "平/胜"], ["cc", "平/平"], ["cb", "平/负"],
  ["ba", "负/胜"], ["bc", "负/平"], ["bb", "负/负"],
];

const JQS_FIELDS = [
  ["s0", "0球"], ["s1", "1球"], ["s2", "2球"], ["s3", "3球"],
  ["s4", "4球"], ["s5", "5球"], ["s6", "6球"], ["s7", "7+球"],
];

function parseAttrs(str) {
  const attrs = {};
  for (const m of str.matchAll(/(\w+)="([^"]*)"/g)) attrs[m[1]] = m[2];
  return attrs;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseMatchMeta(xml) {
  const map = new Map();
  for (const m of xml.matchAll(/<match\s+([^>]+)\/>/g)) {
    const a = parseAttrs(m[1]);
    if (!a.id) continue;
    map.set(a.id, {
      sporttery_match_id: a.id,
      home_zh: a.homename || a.homesxname,
      away_zh: a.awayname || a.awaysxname,
      beijing_date: a.matchdate,
      beijing_time: a.matchtime?.slice(0, 5),
      handicap_line: Number(a.rangqiu),
      match_num: a.matchnum,
    });
  }
  return map;
}

function parseSpfRows(xml) {
  const map = new Map();
  for (const m of xml.matchAll(/<m\s+id="(\d+)"[^>]*>([\s\S]*?)<\/m>/g)) {
    const rows = [...m[2].matchAll(/<row\s+([^>]+)\/>/g)].map((r) => parseAttrs(r[1]));
    if (!rows.length) continue;
    const latest = rows[0];
    const prev = rows[1];
    const home = Number(latest.win);
    const draw = Number(latest.draw);
    const away = Number(latest.lost);
    const delta = prev ? round2(home - Number(prev.win)) : 0;
    const history = rows.slice(0, 6).map((r) => round2(Number(r.win))).reverse();
    map.set(m[1], {
      home,
      draw,
      away,
      delta,
      history,
      updated_at: latest.updatetime,
    });
  }
  return map;
}

function parseSimpleOdds(xml, fields) {
  const map = new Map();
  for (const m of xml.matchAll(/<m\s+id="(\d+)"[^>]*\/>/g)) {
    const a = parseAttrs(m[0].slice(3, -2));
    const options = [];
    for (const [key, pick] of fields) {
      if (a[key]) options.push({ pick, odds: round2(Number(a[key])) });
    }
    if (options.length) map.set(m[1], { options, updated_at: a.updatetime });
  }
  return map;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

function findEspnId(scheduleMatches, home, away, date, time) {
  return scheduleMatches.find(
    (m) => m.home_team_zh === home && m.away_team_zh === away && m.beijing_date === date && m.beijing_time === time
  )?.espn_event_id;
}

async function main() {
  const [matchXml, nspfXml, spfXml, bfXml, jqsXml, bqcXml] = await Promise.all([
    fetchText(`${BASE}/match/match.xml`),
    fetchText(`${BASE}/pl/pl_nspf_2.xml`),
    fetchText(`${BASE}/pl/pl_spf_2.xml`),
    fetchText(`${BASE}/pl/pl_bf_2.xml`),
    fetchText(`${BASE}/pl/pl_jqs_2.xml`),
    fetchText(`${BASE}/pl/pl_bqc_2.xml`),
  ]);

  const meta = parseMatchMeta(matchXml);
  const had = parseSpfRows(nspfXml);
  const hhad = parseSpfRows(spfXml);
  const bf = parseSimpleOdds(bfXml, BF_FIELDS);
  const jqs = parseSimpleOdds(jqsXml, JQS_FIELDS);
  const bqc = parseSimpleOdds(bqcXml, BQC_FIELDS);

  const schedule = JSON.parse(await readFile(SCHEDULE_PATH, "utf8"));
  const fetchedAt = new Date().toISOString();
  const matches = [];

  for (const [id, info] of meta) {
    if (info.home_zh == null || info.away_zh == null) continue;
    const spf = had.get(id);
    const rq = hhad.get(id);
    const bfData = bf.get(id);
    const jqsData = jqs.get(id);
    const bqcData = bqc.get(id);
    if (!spf && !rq) continue;

    const espn_event_id = findEspnId(
      schedule.matches,
      info.home_zh,
      info.away_zh,
      info.beijing_date,
      info.beijing_time
    );

    const line = Number.isFinite(info.handicap_line)
      ? (info.handicap_line > 0 ? info.handicap_line : info.handicap_line)
      : null;

    matches.push({
      sporttery_match_id: id,
      espn_event_id: espn_event_id ?? null,
      home_zh: info.home_zh,
      away_zh: info.away_zh,
      beijing_date: info.beijing_date,
      beijing_time: info.beijing_time,
      match_num: info.match_num,
      updated_at: spf?.updated_at ?? rq?.updated_at ?? bfData?.updated_at,
      spf: spf ?? null,
      rqspf: rq
        ? {
            line,
            home: rq.home,
            draw: rq.draw,
            away: rq.away,
            updated_at: rq.updated_at,
          }
        : null,
      bf: bfData?.options ?? null,
      jqs: jqsData?.options ?? null,
      bqc: bqcData?.options ?? null,
    });
  }

  const payload = {
    fetched_at: fetchedAt,
    source: {
      name: "500.com 竞彩足球静态 XML（与体彩官方开售赔率同步）",
      urls: [
        `${BASE}/match/match.xml`,
        `${BASE}/pl/pl_nspf_2.xml`,
        `${BASE}/pl/pl_spf_2.xml`,
        `${BASE}/pl/pl_bf_2.xml`,
        `${BASE}/pl/pl_jqs_2.xml`,
        `${BASE}/pl/pl_bqc_2.xml`,
      ],
      note: "体彩官网 webapi 在自动化环境会被 EdgeOne 拦截；500 公开 XML 为业界常用的竞彩赔率镜像源。",
    },
    match_count: matches.length,
    mapped_count: matches.filter((m) => m.espn_event_id).length,
    matches,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(HISTORY_DIR, { recursive: true });
  await writeFile(ODDS_PATH, `${JSON.stringify(payload, null, 2)}\n`);

  const stamp = fetchedAt.replace(/[:.]/g, "-");
  await writeFile(path.join(HISTORY_DIR, `${stamp}.json`), `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`Saved ${matches.length} matches (${payload.mapped_count} mapped to espn_event_id)`);
  console.log(ODDS_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
