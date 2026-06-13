/**
 * 全局选注单：同场可多选（复式），最多 6 场过关。
 */
import { reactive, watch } from "vue";
import { getPlayOptions } from "./odds.js";
import { uniqueMatchCount } from "./parlayMath.js";

export const MAX_MATCHES = 6;
const STORAGE_KEY = "wc_betslip";

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** { matchId, label, date, group, playId, pick, odds } */
export const legs = reactive(load());

watch(
  legs,
  (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)),
  { deep: true }
);

export function legsFor(matchId) {
  const id = String(matchId);
  return legs.filter((l) => String(l.matchId) === id);
}

export function isSelected(matchId, playId, pick) {
  return legs.some(
    (l) => String(l.matchId) === String(matchId) && l.playId === playId && l.pick === pick
  );
}

function makeLeg(match, playId, pick, odds) {
  return {
    matchId: match.espn_event_id,
    label: match.fixture_zh,
    date: `${match.beijing_date} ${match.beijing_time}`,
    group: match.group,
    playId,
    pick,
    odds,
  };
}

/**
 * 点选赔率：已选则取消；未选则追加（同场可多选）。
 * 已满 6 场且本场未入单时返回 false。
 */
export function toggleSelection(match, playId, pick, odds) {
  const id = String(match.espn_event_id);
  const idx = legs.findIndex((l) => String(l.matchId) === id && l.playId === playId && l.pick === pick);
  if (idx >= 0) {
    legs.splice(idx, 1);
    return true;
  }
  const inSlip = legs.some((l) => String(l.matchId) === id);
  if (!inSlip && uniqueMatchCount(legs) >= MAX_MATCHES) return false;
  legs.push(makeLeg(match, playId, pick, odds));
  return true;
}

export function addMatchDefault(match) {
  if (!match || legsFor(match.espn_event_id).length) return;
  if (uniqueMatchCount(legs) >= MAX_MATCHES) return;
  const options = getPlayOptions(match, "spf");
  if (options.length) legs.push(makeLeg(match, "spf", options[0].pick, options[0].odds));
}

export function removeLegAt(index) {
  legs.splice(index, 1);
}

export function removeMatch(matchId) {
  const id = String(matchId);
  for (let i = legs.length - 1; i >= 0; i--) {
    if (String(legs[i].matchId) === id) legs.splice(i, 1);
  }
}

export function clearSlip() {
  legs.splice(0, legs.length);
}

/** 向后兼容 */
export const MAX_LEGS = MAX_MATCHES;
