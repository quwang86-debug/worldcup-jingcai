import { getPlayOptions } from "./odds.js";

/** 五类竞彩玩法；赔率来自体彩真实数据（fetch_odds），无数据时回退 mock */
export const PLAY_TYPES = [
  {
    id: "spf",
    label: "胜平负",
    options(match) {
      return getPlayOptions(match, "spf");
    },
  },
  {
    id: "rqspf",
    label: "让球胜平负",
    options(match) {
      return getPlayOptions(match, "rqspf");
    },
  },
  {
    id: "bf",
    label: "比分",
    options(match) {
      return getPlayOptions(match, "bf");
    },
  },
  {
    id: "jqs",
    label: "总进球数",
    options(match) {
      return getPlayOptions(match, "jqs");
    },
  },
  {
    id: "bqc",
    label: "半全场",
    options(match) {
      return getPlayOptions(match, "bqc");
    },
  },
];

export function playTypeById(id) {
  return PLAY_TYPES.find((p) => p.id === id);
}
