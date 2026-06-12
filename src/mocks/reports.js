/**
 * 模拟 AI 赛前报告（阶段四接入真实 LLM 管道后，改为读取 data/reports/ 下
 * 由 GitHub Actions 生成的 markdown，输出形状不变）。
 */
import { getOdds } from "../data/odds.js";
import { groupStandings } from "../data/matches.js";

export function getReport(match) {
  const odds = getOdds(match);
  const fav = odds.home <= odds.away ? match.home_team_zh : match.away_team_zh;
  const dog = fav === match.home_team_zh ? match.away_team_zh : match.home_team_zh;
  const gap = Math.abs(odds.home - odds.away);
  const confidence = gap > 1.2 ? "高" : gap > 0.5 ? "中" : "低";

  const summary = [
    `模拟赔率显示${fav}获得市场倾向（主胜 ${odds.home} / 平 ${odds.draw} / 客胜 ${odds.away}）。`,
    `近 24 小时主胜赔率变动 ${odds.delta > 0 ? "+" : ""}${odds.delta}，${Math.abs(odds.delta) > 0.15 ? "存在明显资金异动，需关注阵容消息" : "盘口平稳，未见异常资金流向"}。`,
    `${dog}若采取低位防守反击策略，平局选项（${odds.draw}）具备一定博弈空间。`,
  ];

  let groupSection = "";
  if (match.group) {
    const rows = groupStandings(match.group);
    if (rows.length) {
      groupSection = `\n### ${match.group}组当前形势\n\n${rows
        .map((r, i) => `${i + 1}. ${r.team} — ${r.played}赛 ${r.pts}分（净胜球 ${r.gf - r.ga > 0 ? "+" : ""}${r.gf - r.ga}）`)
        .join("\n")}\n`;
    }
  }

  const markdown = `## ${match.fixture_zh} 赛前分析

**${match.stage_zh}${match.group ? ` · ${match.group}组` : ""} · ${match.beijing_date} ${match.beijing_time}（北京时间） · ${match.venue}**

### 盘口解读

${summary[0]}${summary[1]}

### 关键变量

- 比赛地点位于 ${match.city}（${match.country}），注意当地气候与时差对球员状态的影响。
- ${fav} 作为市场热门，需警惕热门陷阱：小组赛阶段强队轮换是常见变量。
- ${summary[2]}
${groupSection}
### 倾向参考

综合模拟数据，本场倾向 **${fav} 不败**，信心等级 **${confidence}**。

> 本报告由模拟数据生成，仅用于产品原型演示，不构成任何投注建议。彩票是公益娱乐形式，请理性参与。`;

  return {
    id: match.espn_event_id,
    title: `${match.fixture_zh} 赛前分析`,
    summary,
    confidence,
    markdown,
  };
}
