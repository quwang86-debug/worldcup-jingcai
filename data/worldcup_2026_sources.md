# 2026 World Cup Schedule Sources

Fetched at: 2026-06-12T06:31:32.914Z

- ESPN FIFA World Cup scoreboard API: https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260720&limit=200
- Official FIFA schedule page for cross-checking: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures
- Chinese schedule/reporting cross-check: https://app.xinhuanet.com/news/article.html?articleId=7f0b010f4b1234442d27d51d25526b94
- China Sports Lottery World Cup coverage note: https://www.sporttery.cn/jczx/jczq/jcdj/20260609/10054070.html

All kickoff fields in the JSON/CSV with `beijing_*` prefixes are converted to `Asia/Shanghai` / UTC+8.

## Odds (竞彩足球)

- Fetched by: `npm run fetch:odds` → `data/worldcup_2026_odds.json`
- Source: 500.com static XML (mirrors China Sports Lottery official 竞彩开售赔率)
  - `https://trade.500.com/static/public/jczq/newxml/match/match.xml`
  - `https://trade.500.com/static/public/jczq/newxml/pl/pl_nspf_2.xml` (胜平负)
  - `https://trade.500.com/static/public/jczq/newxml/pl/pl_spf_2.xml` (让球胜平负)
  - `https://trade.500.com/static/public/jczq/newxml/pl/pl_bf_2.xml` (比分)
  - `https://trade.500.com/static/public/jczq/newxml/pl/pl_jqs_2.xml` (总进球)
  - `https://trade.500.com/static/public/jczq/newxml/pl/pl_bqc_2.xml` (半全场)
- Note: `webapi.sporttery.cn` is blocked by EdgeOne in automated environments; 500.com XML is the standard public mirror used by data sites.
