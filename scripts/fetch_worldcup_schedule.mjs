import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const API_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260720&limit=200";
const OUTPUT_DIR = path.resolve("data");
const JSON_PATH = path.join(OUTPUT_DIR, "worldcup_2026_matches_beijing.json");
const CSV_PATH = path.join(OUTPUT_DIR, "worldcup_2026_matches_beijing.csv");
const SOURCES_PATH = path.join(OUTPUT_DIR, "worldcup_2026_sources.md");

const STAGE_ZH = {
  "group-stage": "小组赛",
  "round-of-32": "1/16决赛",
  "round-of-16": "1/8决赛",
  quarterfinals: "1/4决赛",
  semifinals: "半决赛",
  "3rd-place-match": "三四名决赛",
  "third-place": "三四名决赛",
  final: "决赛",
};

const WEEKDAY_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const TEAM_ZH = {
  Algeria: "阿尔及利亚",
  Argentina: "阿根廷",
  Australia: "澳大利亚",
  Austria: "奥地利",
  Belgium: "比利时",
  "Bosnia-Herzegovina": "波黑",
  Brazil: "巴西",
  Canada: "加拿大",
  "Cape Verde": "佛得角",
  Colombia: "哥伦比亚",
  "Congo DR": "刚果(金)",
  Croatia: "克罗地亚",
  Curaçao: "库拉索",
  Czechia: "捷克",
  Ecuador: "厄瓜多尔",
  Egypt: "埃及",
  England: "英格兰",
  France: "法国",
  Germany: "德国",
  Ghana: "加纳",
  Haiti: "海地",
  Iran: "伊朗",
  Iraq: "伊拉克",
  "Ivory Coast": "科特迪瓦",
  Japan: "日本",
  Jordan: "约旦",
  Mexico: "墨西哥",
  Morocco: "摩洛哥",
  Netherlands: "荷兰",
  "New Zealand": "新西兰",
  Norway: "挪威",
  Panama: "巴拿马",
  Paraguay: "巴拉圭",
  Portugal: "葡萄牙",
  Qatar: "卡塔尔",
  "Saudi Arabia": "沙特阿拉伯",
  Scotland: "苏格兰",
  Senegal: "塞内加尔",
  "South Africa": "南非",
  "South Korea": "韩国",
  Spain: "西班牙",
  Sweden: "瑞典",
  Switzerland: "瑞士",
  Tunisia: "突尼斯",
  Türkiye: "土耳其",
  "United States": "美国",
  Uruguay: "乌拉圭",
  Uzbekistan: "乌兹别克斯坦",
};
const TEAM_GROUP = {
  Mexico: "A",
  "South Africa": "A",
  "South Korea": "A",
  Czechia: "A",
  Canada: "B",
  "Bosnia-Herzegovina": "B",
  Qatar: "B",
  Switzerland: "B",
  Brazil: "C",
  Morocco: "C",
  Haiti: "C",
  Scotland: "C",
  "United States": "D",
  Paraguay: "D",
  Australia: "D",
  Türkiye: "D",
  Germany: "E",
  Curaçao: "E",
  "Ivory Coast": "E",
  Ecuador: "E",
  Netherlands: "F",
  Japan: "F",
  Sweden: "F",
  Tunisia: "F",
  Belgium: "G",
  Egypt: "G",
  Iran: "G",
  "New Zealand": "G",
  Spain: "H",
  "Cape Verde": "H",
  "Saudi Arabia": "H",
  Uruguay: "H",
  France: "I",
  Senegal: "I",
  Iraq: "I",
  Norway: "I",
  Argentina: "J",
  Algeria: "J",
  Austria: "J",
  Jordan: "J",
  Portugal: "K",
  "Congo DR": "K",
  Uzbekistan: "K",
  Colombia: "K",
  England: "L",
  Croatia: "L",
  Ghana: "L",
  Panama: "L",
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function toBeijingParts(utcDateString) {
  const shifted = new Date(new Date(utcDateString).getTime() + 8 * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = pad(shifted.getUTCMonth() + 1);
  const day = pad(shifted.getUTCDate());
  const hour = pad(shifted.getUTCHours());
  const minute = pad(shifted.getUTCMinutes());
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
    datetime: `${year}-${month}-${day}T${hour}:${minute}:00+08:00`,
    weekday: WEEKDAY_ZH[shifted.getUTCDay()],
  };
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function localizeTeamName(name) {
  if (!name) return null;
  if (TEAM_ZH[name]) return TEAM_ZH[name];

  let match = name.match(/^Group ([A-L]) Winner$/);
  if (match) return `${match[1]}组第一`;

  match = name.match(/^Group ([A-L]) 2nd Place$/);
  if (match) return `${match[1]}组第二`;

  match = name.match(/^Group ([A-L]) 3rd Place$/);
  if (match) return `${match[1]}组第三`;

  match = name.match(/^Third Place Group ([A-L](?:\/[A-L])*)$/);
  if (match) return `${match[1]}组第三`;

  match = name.match(/^Round of 32 ([0-9]+) Winner$/);
  if (match) return `1/16决赛第${match[1]}场胜者`;

  match = name.match(/^Round of 16 ([0-9]+) Winner$/);
  if (match) return `1/8决赛第${match[1]}场胜者`;

  match = name.match(/^Quarterfinal ([0-9]+) Winner$/);
  if (match) return `1/4决赛第${match[1]}场胜者`;

  match = name.match(/^Semifinal ([0-9]+) Winner$/);
  if (match) return `半决赛第${match[1]}场胜者`;

  match = name.match(/^Semifinal ([0-9]+) Loser$/);
  if (match) return `半决赛第${match[1]}场负者`;

  return name;
}

function localizeStatus(state, completed) {
  if (completed) return "已完赛";
  if (state === "pre") return "未开赛";
  if (state === "in") return "进行中";
  if (state === "post") return "已完赛";
  return state ?? null;
}

function getCompetitor(competition, homeAway) {
  return competition.competitors.find((competitor) => competitor.homeAway === homeAway);
}

function deriveGroupMap(events) {
  const parent = new Map();
  const earliest = new Map();

  function find(name) {
    if (!parent.has(name)) parent.set(name, name);
    if (parent.get(name) !== name) parent.set(name, find(parent.get(name)));
    return parent.get(name);
  }

  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  }

  for (const event of events.filter((event) => event.season?.slug === "group-stage")) {
    const competition = event.competitions?.[0];
    const names = competition?.competitors?.map((competitor) => competitor.team.displayName) ?? [];
    if (names.length < 2) continue;
    union(names[0], names[1]);
    for (const name of names) {
      const current = earliest.get(name);
      if (!current || event.date < current) earliest.set(name, event.date);
    }
  }

  const components = new Map();
  for (const name of parent.keys()) {
    const root = find(name);
    if (!components.has(root)) components.set(root, []);
    components.get(root).push(name);
  }

  const sortedComponents = [...components.values()].sort((a, b) => {
    const firstA = Math.min(...a.map((name) => new Date(earliest.get(name)).getTime()));
    const firstB = Math.min(...b.map((name) => new Date(earliest.get(name)).getTime()));
    return firstA - firstB;
  });

  const groupByTeam = new Map();
  sortedComponents.forEach((teams, index) => {
    const group = String.fromCharCode("A".charCodeAt(0) + index);
    for (const team of teams) groupByTeam.set(team, group);
  });
  return groupByTeam;
}

function normalizeEvent(event, index, groupByTeam) {
  const competition = event.competitions[0];
  const home = getCompetitor(competition, "home");
  const away = getCompetitor(competition, "away");
  const beijing = toBeijingParts(event.date);
  const status = competition.status?.type ?? event.status?.type ?? {};
  const isPre = status.state === "pre";
  const homeScore = isPre ? null : Number(home?.score ?? 0);
  const awayScore = isPre ? null : Number(away?.score ?? 0);
  const stage = event.season?.slug ?? "";
  const homeTeam = home?.team.displayName ?? null;
  const awayTeam = away?.team.displayName ?? null;
  const group = stage === "group-stage" ? TEAM_GROUP[homeTeam] ?? groupByTeam.get(homeTeam) ?? null : null;
  const homeTeamZh = localizeTeamName(homeTeam);
  const awayTeamZh = localizeTeamName(awayTeam);

  let result = null;
  if (!isPre && Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
    result = homeScore > awayScore ? "home_win" : homeScore < awayScore ? "away_win" : "draw";
  }

  return {
    kickoff_order: index + 1,
    espn_event_id: event.id,
    stage,
    stage_zh: STAGE_ZH[stage] ?? stage,
    group,
    beijing_datetime: beijing.datetime,
    beijing_date: beijing.date,
    beijing_time: beijing.time,
    beijing_weekday: beijing.weekday,
    utc_datetime: event.date,
    home_team: homeTeam,
    home_team_zh: homeTeamZh,
    home_team_abbr: home?.team.abbreviation ?? null,
    away_team: awayTeam,
    away_team_zh: awayTeamZh,
    away_team_abbr: away?.team.abbreviation ?? null,
    fixture: `${homeTeam ?? ""} vs ${awayTeam ?? ""}`.trim(),
    fixture_zh: `${homeTeamZh ?? ""} vs ${awayTeamZh ?? ""}`.trim(),
    home_score: homeScore,
    away_score: awayScore,
    result,
    status_state: status.state ?? null,
    status_zh: localizeStatus(status.state, status.completed),
    status_detail: status.detail ?? status.shortDetail ?? status.description ?? null,
    venue: competition.venue?.fullName ?? null,
    city: competition.venue?.address?.city ?? null,
    country: competition.venue?.address?.country ?? null,
  };
}

const response = await fetch(API_URL, {
  headers: {
    accept: "application/json",
    "user-agent": "WorldCup local schedule fetcher",
  },
});

if (!response.ok) {
  throw new Error(`Failed to fetch schedule: ${response.status} ${response.statusText}`);
}

const payload = await response.json();
const events = [...(payload.events ?? [])].sort((a, b) => new Date(a.date) - new Date(b.date));
if (events.length !== 104) {
  throw new Error(`Expected 104 events, received ${events.length}`);
}

const groupByTeam = deriveGroupMap(events);
const matches = events.map((event, index) => normalizeEvent(event, index, groupByTeam));
const fetchedAt = new Date().toISOString();

const data = {
  tournament: "2026 FIFA World Cup",
  timezone: "Asia/Shanghai",
  timezone_label: "北京时间",
  source: {
    name: "ESPN FIFA World Cup scoreboard API",
    url: API_URL,
  },
  fetched_at: fetchedAt,
  match_count: matches.length,
  matches,
};

const columns = [
  "kickoff_order",
  "espn_event_id",
  "stage_zh",
  "group",
  "beijing_datetime",
  "beijing_date",
  "beijing_time",
  "beijing_weekday",
  "home_team",
  "home_team_zh",
  "away_team",
  "away_team_zh",
  "fixture",
  "fixture_zh",
  "home_score",
  "away_score",
  "result",
  "status_state",
  "status_zh",
  "status_detail",
  "venue",
  "city",
  "country",
  "utc_datetime",
];

const csv = [
  columns.join(","),
  ...matches.map((match) => columns.map((column) => csvEscape(match[column])).join(",")),
].join("\n");

const sources = `# 2026 World Cup Schedule Sources

Fetched at: ${fetchedAt}

- ESPN FIFA World Cup scoreboard API: ${API_URL}
- Official FIFA schedule page for cross-checking: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures
- Chinese schedule/reporting cross-check: https://app.xinhuanet.com/news/article.html?articleId=7f0b010f4b1234442d27d51d25526b94
- China Sports Lottery World Cup coverage note: https://www.sporttery.cn/jczx/jczq/jcdj/20260609/10054070.html

All kickoff fields in the JSON/CSV with \`beijing_*\` prefixes are converted to \`Asia/Shanghai\` / UTC+8.
`;

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(JSON_PATH, `${JSON.stringify(data, null, 2)}\n`);
await writeFile(CSV_PATH, `${csv}\n`);
await writeFile(SOURCES_PATH, sources);

console.log(`Saved ${matches.length} matches`);
console.log(JSON_PATH);
console.log(CSV_PATH);
console.log(SOURCES_PATH);
