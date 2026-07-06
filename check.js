#!/usr/bin/env node
/* 泰國行程網站 — 資料自動檢查
 * 用法：改完 assets/data.js 後，在專案根目錄執行  node check.js
 * 有錯誤時 exit code = 1（方便接 CI）；只有提醒則照樣通過。
 */
const fs = require("fs");
const path = require("path");
const ROOT = __dirname;

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

/* 1) 載入並解析 data.js */
let TAI;
try {
  global.window = {};
  require(path.join(ROOT, "assets/data.js"));
  TAI = global.window.TAI;
} catch (e) {
  console.error("❌ data.js 無法解析（JS 語法錯誤）：\n   " + e.message);
  process.exit(1);
}
if (!TAI) {
  console.error("❌ data.js 沒有設定 window.TAI");
  process.exit(1);
}

/* 2) 必要的匯出 */
["IMG", "HERO", "DATA", "FOOD", "MASSAGE", "STAY", "GEO", "INFO"].forEach((k) => {
  if (!(k in TAI)) err(`window.TAI 缺少 ${k}`);
});
const { IMG = {}, HERO = {}, DATA = {}, FOOD = [], MASSAGE = [], STAY = {}, GEO = {}, INFO = {} } = TAI;

const usedKeys = new Set();
const imgOk = (key) => Array.isArray(IMG[key]) && IMG[key].length > 0;
function checkImg(key, where) {
  usedKeys.add(key);
  if (!imgOk(key)) err(`${where}：img 鍵 "${key}" 不存在於 IMG（或為空陣列）`);
}

/* 3) IMG 檔案是否真的存在 */
Object.entries(IMG).forEach(([key, arr]) => {
  if (!Array.isArray(arr)) return err(`IMG["${key}"] 不是陣列`);
  arr.forEach((p) => {
    if (!fs.existsSync(path.join(ROOT, p))) err(`IMG["${key}"] 圖片不存在：${p}`);
  });
});

/* 4) 每日行程 DATA */
const cities = ["bangkok", "chiangmai"];
const allDays = [];
cities.forEach((c) => {
  if (!Array.isArray(DATA[c])) return err(`DATA.${c} 不是陣列`);
  DATA[c].forEach((d, di) => {
    allDays.push(d);
    const tag = `DATA.${c}[${di}]`;
    ["day", "n", "date", "city", "title", "sum", "spots"].forEach((f) => {
      if (d[f] === undefined) err(`${tag} 缺少欄位 ${f}`);
    });
    if (d.city && d.city !== c) warn(`${tag} city="${d.city}" 與所在陣列 ${c} 不符`);
    if (!Array.isArray(d.spots) || !d.spots.length) return err(`${tag} spots 為空`);
    d.spots.forEach((s, si) => {
      const st = `Day ${d.n} spot[${si}]（${s.name || "?"}）`;
      if (!s.name) err(`${st}：缺少 name`);
      if (!s.img) err(`${st}：缺少 img`);
      else checkImg(s.img, st);
      if (!s.desc) warn(`${st}：沒有 desc`);
      if (!s.map) warn(`${st}：沒有 map（不會有地圖連結）`);
    });
  });
});
const nums = allDays.map((d) => d.n);
[...new Set(nums.filter((n, i) => nums.indexOf(n) !== i))].forEach((n) => err(`重複的 day n：${n}`));
nums.forEach((n, i) => {
  if (n !== i + 1) warn(`day n 非連續：第 ${i + 1} 個 day 的 n=${n}（預期 ${i + 1}）`);
});

/* 5) GEO 座標：key 對得上、經緯度落在泰國範圍 */
Object.entries(GEO).forEach(([k, v]) => {
  const m = /^(\d+)-(\d+)$/.exec(k);
  if (!m) return err(`GEO key 格式錯誤："${k}"（應為 "天-序號"，如 "5-2"）`);
  const n = +m[1], i = +m[2];
  const day = allDays.find((d) => d.n === n);
  if (!day) err(`GEO "${k}" 指向不存在的第 ${n} 天`);
  else if (!day.spots[i]) err(`GEO "${k}" 指向 Day ${n} 不存在的 spot[${i}]`);
  if (!Array.isArray(v) || v.length !== 2 || v.some((x) => typeof x !== "number"))
    return err(`GEO "${k}" 座標格式錯誤（應為 [緯度, 經度]）`);
  const [lat, lng] = v;
  if (lat < 5 || lat > 21) err(`GEO "${k}" 緯度 ${lat} 超出泰國範圍（5–21）`);
  if (lng < 97 || lng > 106) err(`GEO "${k}" 經度 ${lng} 超出泰國範圍（97–106）`);
});

/* 6) 美食 / 按摩（結構相同） */
function checkCatList(list, label) {
  if (!Array.isArray(list)) return err(`${label} 不是陣列`);
  list.forEach((cat, ci) => {
    if (!cat.cat) warn(`${label}[${ci}] 沒有分類標題 cat`);
    if (!Array.isArray(cat.items)) return err(`${label}[${ci}].items 不是陣列`);
    cat.items.forEach((it) => {
      const t = `${label} "${it.n || "?"}"`;
      if (!it.n) err(`${t}：缺少 n（名稱）`);
      if (!it.img) err(`${t}：缺少 img`);
      else checkImg(it.img, t);
      if (!it.desc) warn(`${t}：沒有 desc`);
    });
  });
}
checkCatList(FOOD, "FOOD");
checkCatList(MASSAGE, "MASSAGE");

/* 7) 住宿 */
cities.forEach((c) => {
  const s = STAY[c];
  if (!s) return warn(`STAY.${c} 不存在`);
  if (!s.n) err(`STAY.${c} 缺少 n（名稱）`);
  if (!s.img) err(`STAY.${c} 缺少 img`);
  else checkImg(s.img, `STAY.${c}`);
});

/* 8) HERO 英雄圖 */
Object.entries(HERO).forEach(([k, v]) => checkImg(v, `HERO.${k}`));

/* 9) 資訊頁結構 */
["practical", "checklist", "phrases", "packing"].forEach((k) => {
  if (!Array.isArray(INFO[k])) warn(`INFO.${k} 不是陣列（或缺少）`);
});

/* 10) 未使用的 IMG 鍵（僅提醒，可刪以精簡） */
Object.keys(IMG).forEach((k) => {
  if (!usedKeys.has(k)) warn(`IMG "${k}" 未被任何景點／美食／SPA／住宿／HERO 使用（可刪）`);
});

/* 11) site.js 語法 */
try {
  new Function(fs.readFileSync(path.join(ROOT, "assets/site.js"), "utf8"));
} catch (e) {
  err(`site.js 語法錯誤：${e.message}`);
}

/* 12) 頁面檔案是否齊全 */
allDays.forEach((d) => {
  const f = `day${String(d.n).padStart(2, "0")}.html`;
  if (!fs.existsSync(path.join(ROOT, f))) err(`缺少頁面 ${f}（Day ${d.n}）`);
});
["index.html", "food.html", "massage.html", "info.html", "credits.html"].forEach((f) => {
  if (!fs.existsSync(path.join(ROOT, f))) warn(`缺少頁面 ${f}`);
});

/* 報告 */
const foodN = FOOD.reduce((a, c) => a + (c.items ? c.items.length : 0), 0);
const spaN = MASSAGE.reduce((a, c) => a + (c.items ? c.items.length : 0), 0);
console.log("—— 泰國行程網站 · 資料檢查 ——");
console.log(`天數 ${allDays.length}　美食 ${foodN}　SPA ${spaN}　住宿 ${Object.keys(STAY).length}　GEO 座標 ${Object.keys(GEO).length}　圖片鍵 ${Object.keys(IMG).length}`);
if (warns.length) {
  console.log(`\n⚠️  提醒（${warns.length}）：`);
  warns.forEach((w) => console.log("   • " + w));
}
if (errors.length) {
  console.log(`\n❌ 錯誤（${errors.length}）：`);
  errors.forEach((e) => console.log("   • " + e));
  console.log("\n檢查未通過，請修正後再 commit。");
  process.exit(1);
}
console.log("\n✅ 全部通過，可以 commit / push。");
