/* 泰國行程網站 — 依 body[data-page] / body[data-day] 渲染
   依賴 window.TAI = { IMG, HERO, DATA, FOOD, MASSAGE }（來自 data.js）*/
(function () {
  const { IMG, HERO, DATA, FOOD, MASSAGE, STAY, GEO, INFO } = window.TAI;
  const ALL = [...DATA.bangkok, ...DATA.chiangmai]; // Day1..Day11 依序
  const CITY_NAME = { bangkok: "曼谷", chiangmai: "清邁" };

  const pad2 = (n) => String(n).padStart(2, "0");
  const dayHref = (n) => `day${pad2(n)}.html`;
  const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => (s == null ? "" : String(s).replace(/[&<>"']/g, (c) => ESC_MAP[c]));
  const firstImg = (key) => (IMG[key] && IMG[key][0]) || "";

  // 捲動到區塊，扣掉置頂 citybar 的實際高度（位移的唯一來源，同頁與跨頁共用）
  function scrollToSection(id, smooth) {
    const el = document.getElementById(id);
    if (!el) return;
    const bar = document.querySelector(".citybar");
    const top = el.getBoundingClientRect().top + window.pageYOffset - (bar ? bar.offsetHeight : 0);
    window.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
  }

  // 每天代表圖：優先用 star 景點，否則第一個景點
  function dayHeroKey(day) {
    const star = day.spots.find((s) => s.tagc === "tag-star");
    return (star || day.spots[0]).img;
  }

  const INFO_META = {
    hours:    { ic: "🕘", lab: "營業時間" },
    price:    { ic: "💵", lab: "費用" },
    duration: { ic: "⏳", lab: "建議停留" },
    access:   { ic: "🚇", lab: "交通" },
    checkin:  { ic: "🛎️", lab: "入住／退房" },
    booking:  { ic: "📅", lab: "預約" },
  };

  let galId = 0;
  const GALLERIES = []; // {id, imgs, name}

  function galleryHTML(s) {
    const imgs = IMG[s.img] || [];
    const id = "gal" + (++galId);
    GALLERIES.push({ id, imgs, name: s.name });
    const slides = imgs
      .map((src, i) => `<div class="slide${i === 0 ? " on" : ""}" data-i="${i}" style="background-image:url('${src}')"></div>`)
      .join("");
    const multi = imgs.length > 1;
    const dots = multi
      ? `<div class="gal-dots">${imgs.map((_, i) => `<i class="${i === 0 ? "on" : ""}" data-i="${i}"></i>`).join("")}</div>`
      : "";
    const arrows = multi
      ? `<button class="gal-btn gal-prev" aria-label="上一張">‹</button><button class="gal-btn gal-next" aria-label="下一張">›</button>`
      : "";
    const count = multi ? `<span class="gal-count">📷 ${imgs.length}</span>` : "";
    return `<div class="gallery" id="${id}">
      <div class="frame">${slides}</div>
      <span class="spot-tag ${s.tagc}">${esc(s.tag)}</span>
      ${arrows}${dots}${count}
    </div>`;
  }

  function infoHTML(info) {
    if (!info) return "";
    const rows = Object.keys(INFO_META)
      .filter((k) => info[k])
      .map((k) => {
        const m = INFO_META[k];
        return `<div class="row"><span class="ic">${m.ic}</span><span><span class="lab">${m.lab}</span><span class="val">${esc(info[k])}</span></span></div>`;
      })
      .join("");
    return rows ? `<div class="spot-info">${rows}</div>` : "";
  }

  function linksHTML(s) {
    const parts = [];
    if (s.map) parts.push(`<a class="map" href="${s.map}" target="_blank" rel="noopener">📍 Google 地圖</a>`);
    (s.links || []).forEach((l) => parts.push(`<a href="${l.url}" target="_blank" rel="noopener">🔗 ${esc(l.label)}</a>`));
    return parts.length ? `<div class="spot-links">${parts.join("")}</div>` : "";
  }

  function spotCard(s) {
    const en = s.en ? `<span class="en">${esc(s.en)}</span>` : "";
    const tip = s.tip ? `<div class="tip">${esc(s.tip)}</div>` : "";
    const eat = s.eattip ? `<div class="tip eat-tip">${esc(s.eattip)}</div>` : "";
    return `<div class="spot">
      ${galleryHTML(s)}
      <div class="spot-body">
        <h4>${esc(s.name)} ${en}</h4>
        <p>${esc(s.desc)}</p>
        ${infoHTML(s.info)}
        ${tip}${eat}
        ${linksHTML(s)}
      </div>
    </div>`;
  }

  function flightHTML(f) {
    return `<div class="flight"><span class="plane">✈️</span>
      <div class="fx"><b>${esc(f.from)} → ${esc(f.to)}</b><div class="r">${esc(f.note)}</div></div></div>`;
  }

  // active: "bangkok" | "chiangmai" | "food" | "massage" | null
  function cityBarHTML(active) {
    const tab = (href, name, en, sub, isActive) =>
      `<a class="city-tab${isActive ? " active" : ""}" href="${href}">${name} ${en}<span class="sub">${sub}</span></a>`;
    return `<nav class="citybar"><div class="inner">
      ${tab("index.html#bangkok", "曼谷", "BANGKOK", "DAY 1 – 6", active === "bangkok")}
      ${tab("index.html#chiangmai", "清邁", "CHIANG MAI", "DAY 7 – 11", active === "chiangmai")}
      ${tab("food.html", "美食", "FOOD", "EAT LIST", active === "food")}
      ${tab("massage.html", "按摩", "SPA", "RELAX", active === "massage")}
      ${tab("info.html", "資訊", "INFO", "TIPS", active === "info")}
    </div></nav>`;
  }

  function dayNavHTML(activeN) {
    const chips = ALL.map((d) => {
      const active = d.n === activeN ? " active" : "";
      return `<a class="day-chip${active}" href="${dayHref(d.n)}"><b>${d.day.split(" ")[1]}</b>${d.date.split(" ")[0]}</a>`;
    }).join("");
    return `<div class="daynav"><div class="scroll">${chips}</div></div>`;
  }

  function footerHTML() {
    return `<footer>
      <div class="th">สวัสดี</div>
      泰國 11 天行程 · 曼谷 × 清邁 · 2027.02.03 – 02.13
      <div class="credit">圖片來源：Wikimedia Commons（CC 授權）及各店家官網／旅遊部落格，詳見 <a href="credits.html">出處與授權</a>。</div>
    </footer>`;
  }

  const lightboxHTML = `<div class="lightbox" id="lightbox">
    <button class="lb-close" aria-label="關閉">×</button>
    <button class="lb-nav lb-prev" aria-label="上一張">‹</button>
    <img id="lb-img" alt="">
    <button class="lb-nav lb-next" aria-label="下一張">›</button>
    <div class="lb-cap" id="lb-cap"></div>
  </div>`;

  /* ---------- 每日路線地圖（Leaflet + OpenStreetMap，免金鑰） ---------- */
  function dayGeoPoints(day) {
    return day.spots
      .map((s, i) => { const g = GEO[day.n + "-" + i]; return g ? { lat: g[0], lng: g[1], name: s.name } : null; })
      .filter(Boolean);
  }
  let leafletLoading;
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (leafletLoading) return leafletLoading;
    leafletLoading = new Promise((resolve) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      js.onload = resolve;
      document.head.appendChild(js);
    });
    return leafletLoading;
  }
  function initDayMap(day) {
    const pts = dayGeoPoints(day);
    if (!pts.length) return;
    loadLeaflet().then(() => {
      const el = document.getElementById("daymap");
      if (!el || el._leaflet_id) return;
      const map = L.map(el, { scrollWheelZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      const latlngs = pts.map((p) => [p.lat, p.lng]);
      if (latlngs.length > 1) {
        L.polyline(latlngs, { color: "#b5341f", weight: 3, opacity: 0.7, dashArray: "6 6" }).addTo(map);
      }
      pts.forEach((p, i) => {
        const icon = L.divIcon({ className: "daypin", html: `<span>${i + 1}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] });
        L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(`${i + 1}. ${esc(p.name)}`);
      });
      map.fitBounds(latlngs, { padding: [40, 40], maxZoom: 16 });
    });
  }

  /* ---------- 頁面組裝 ---------- */

  function renderDay(n) {
    const day = ALL.find((d) => d.n === n);
    if (!day) return;
    const heroImg = firstImg(dayHeroKey(day));
    const idx = ALL.findIndex((d) => d.n === n);
    const prev = ALL[idx - 1], next = ALL[idx + 1];

    document.title = `${day.day} ${day.title} · 泰國 11 天`;

    const hero = `<header class="hero day-hero" style="background-image:url('${heroImg}')">
      <div class="daynum-big">${CITY_NAME[day.city]} · ${day.day}${day.star ? " ★" : ""} · ${esc(day.date)}</div>
      <h1>${esc(day.title)}</h1>
      <div class="dsum">${esc(day.sum)}</div>
    </header>`;

    const flight = day.flight ? flightHTML(day.flight) : "";
    const spots = day.spots.map((s) =>
      `<div class="tl-item"><div class="tl-rail"><span class="tl-node ${esc(s.tagc)}"></span><span class="tl-time">${esc(s.tag)}</span></div>${spotCard(s)}</div>`
    ).join("");
    const mapSec = dayGeoPoints(day).length
      ? `<section class="wrap"><div class="daymap-block"><h5 class="daymap-h">🗺️ 當日路線</h5><div id="daymap"></div><p class="daymap-note">數字為當日順序，點圖釘看地點名稱、可縮放查看周邊；座標為概略位置。</p></div></section>`
      : "";
    const body = `${mapSec}<section class="wrap"><div class="day">${flight}<div class="timeline">${spots}</div></div></section>`;

    const pcard = (d, cls, k) =>
      d
        ? `<a class="${cls}" href="${dayHref(d.n)}"><span class="k">${k}</span><span class="t">${d.day} ${esc(d.title)}</span></a>`
        : `<a class="${cls} empty"><span class="k">${k}</span><span class="t">—</span></a>`;
    const pager = `<nav class="pager">
      ${pcard(prev, "prev", "← 前一天")}
      <a class="home" href="index.html"><span class="k">總覽</span><span class="t">🏠 行程首頁</span></a>
      ${pcard(next, "next", "下一天 →")}
    </nav>`;

    document.getElementById("app").innerHTML =
      hero + cityBarHTML(day.city) + dayNavHTML(n) + body + pager + footerHTML();
    initDayMap(day);
  }

  function daycardHTML(d) {
    const img = firstImg(dayHeroKey(d));
    const spotTags = d.spots.map((s) => `<span>${esc(s.name)}</span>`).join("");
    return `<a class="daycard" href="${dayHref(d.n)}">
      <div class="thumb" style="background-image:url('${img}')">
        <span class="badge">${d.day.toUpperCase()}</span>
        ${d.star ? '<span class="star">★</span>' : ""}
        <div class="cap"><div class="dt">${esc(d.date)}</div><div class="tt">${esc(d.title)}</div></div>
      </div>
      <div class="cbody">
        <div class="csum">${esc(d.sum)}</div>
        <div class="spots">${spotTags}</div>
        <div class="go">查看當日行程 →</div>
      </div>
    </a>`;
  }

  // 住宿卡：重用 spotCard（相簿＋燈箱＋資訊格）
  function stayCardHTML(s) {
    return spotCard({
      img: s.img, tag: s.tag, tagc: "tag-time",
      name: s.n, en: s.en, desc: s.desc,
      info: s.info, tip: s.tip,
      map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.map || s.n)}`,
      links: s.links,
    });
  }
  function cityIntro(city, thai, text) {
    const stay = STAY[city]
      ? `<div class="stay-block"><h5 class="stay-h">🏨 住宿</h5>${stayCardHTML(STAY[city])}</div>`
      : "";
    return `<section class="wrap" id="${city}"><div class="intro">
      <h2><span>${CITY_NAME[city]}</span><span class="thaichar">${thai}</span></h2>
      <p>${text}</p>
    </div>
    ${stay}
    <div class="daygrid">${DATA[city].map(daycardHTML).join("")}</div>
    </section>`;
  }

  // 把一筆美食資料整成 spot 形狀，重用 spotCard（相簿輪播＋燈箱＋資訊格全部沿用）
  function foodCard(i, catTagc) {
    const s = {
      img: i.img,
      tag: i.tag || "",
      tagc: i.tagc || catTagc,
      name: i.n,
      en: i.en || "",
      desc: i.desc || "",
      info: i.info,
      tip: i.tip,
      eattip: i.eattip,
      map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.map || i.n)}`,
      links: i.links,
    };
    return spotCard(s);
  }
  // 分類式圖文索引（美食／按摩共用）：cats=[{cat,items}]；tagcFn 決定每類標籤顏色
  function catSectionHTML(cats, { id, h3, lead, tagcFn }) {
    const blocks = cats.map((c) => {
      const cards = c.items.map((i) => foodCard(i, tagcFn(c))).join("");
      return `<div class="food-cat-block">
        <h5 class="food-cat-title">${esc(c.cat)}</h5>
        <div class="food-cards">${cards}</div>
      </div>`;
    }).join("");
    return `<section class="foodindex" id="${id}"><div class="wrap">
      <h3>${h3}</h3>
      <p class="lead">${lead}</p>
      ${blocks}
    </div></section>`;
  }
  const foodHTML = () => catSectionHTML(FOOD, {
    id: "food", h3: "🍽️ 美食索引",
    lead: "這趟的味覺地圖——從曼谷的螃蟹到清邁的咖哩麵，每一味都附上完整介紹、實用資訊、實景照片與地圖連結。",
    tagcFn: (c) => (c.cat.includes("☕") ? "tag-cafe" : "tag-eat"),
  });
  const massageHTML = () => catSectionHTML(MASSAGE, {
    id: "massage", h3: "💆 按摩 · SPA 專區",
    lead: "走跳一整天後，用一場正宗泰式按摩或蘭納 SPA 收尾。以下是曼谷與清邁網路上口碑最好的幾家，含價位、交通、預約與地圖連結。",
    tagcFn: () => "tag-spa",
  });

  // 首頁的美食／按摩入口小卡（沿用行程卡 .daycard 樣式，點入才展開完整卡片）
  function entryCard(href, badge, title, sum, imgKey, go) {
    return `<a class="daycard" href="${href}">
      <div class="thumb" style="background-image:url('${firstImg(imgKey)}')">
        <span class="badge">${badge}</span>
        <div class="cap"><div class="tt">${esc(title)}</div></div>
      </div>
      <div class="cbody">
        <div class="csum">${esc(sum)}</div>
        <div class="go">${go}</div>
      </div>
    </a>`;
  }
  function exploreHTML() {
    return `<section class="wrap"><div class="section-title" style="padding-top:44px">
      <h3>美食 &amp; 按摩 <span class="thaichar">กิน · นวด</span></h3>
      <p>另外兩份獨立索引——這趟必吃的餐廳咖啡，以及走累了犒賞雙腿的按摩・SPA。點進去看完整圖文卡。</p>
    </div>
    <div class="daygrid explore-grid">
      ${entryCard("food.html", "美食 FOOD", "🍽️ 美食索引", "從曼谷的招牌咖哩螃蟹到清邁的靈魂咖哩麵，18 家必吃餐廳、街邊小吃與冠軍咖啡。", "somboon-crab", "查看美食索引 →")}
      ${entryCard("massage.html", "按摩 SPA", "💆 按摩 · SPA 專區", "泰式古法、蘭納 SPA 到都會奢華療程，曼谷與清邁口碑最好的 6 家名店。", "massage-fahlanna", "查看按摩專區 →")}
    </div></section>`;
  }

  function renderHome() {
    document.title = "泰國 11 天 · 曼谷 × 清邁";
    const hero = `<header class="hero" style="background-image:url('${firstImg(HERO.site)}')">
      <div class="eyebrow">2027 · Thailand Itinerary</div>
      <h1>曼谷<span class="amp">×</span>清邁</h1>
      <div class="dates">2027年2月3日 – 2月13日 · 11 天 10 夜</div>
      <div class="meta">
        <span>🦀 曼谷 6 天</span><span>🏯 清邁 4 天</span>
        <span>📸 鄭王廟寫真</span><span>☕ 網紅咖啡</span><span>🛕 蘭納古城</span>
      </div>
    </header>`;

    const intro = `<section class="wrap"><div class="section-title" style="padding-top:40px">
      <h3>行程總覽 <span class="thaichar">11 วัน</span></h3>
      <p>11 天分成曼谷（Day 1–6）與清邁（Day 7–11）兩段，點按任一天的卡片，即可進入該日的獨立頁面——含詳細解說、實用資訊、多張實景照片與地圖連結。</p>
    </div></section>`;

    const bangkok = cityIntro(
      "bangkok", "กรุงเทพ",
      "天使之城，泰國的心跳。你的曼谷六天圍繞著三件事轉：暹羅商圈的無盡逛街、招牌咖哩螃蟹的鮮甜，以及鄭王廟前那一襲泰服寫真。住在暹羅正中心，逛累了隨時回房，一切都在 BTS 的路線內。"
    );
    const chiangmai = cityIntro(
      "chiangmai", "เชียงใหม่",
      "泰北的玫瑰，蘭納王朝的舊都。步調在這裡慢下來——古城的方格裡塞滿百年寺廟、週末夜市與手沖咖啡。你住在柴迪隆寺對面的 Kiri 基里飯店，推開門就是古城的靈魂；尼曼的文青咖啡與素帖山的夕陽，則濃縮在完整的一天裡。"
    );

    document.getElementById("app").innerHTML =
      hero + cityBarHTML(null) + intro + bangkok + chiangmai + exploreHTML() + footerHTML();

    // 同頁點擊「曼谷／清邁」：平滑捲動並扣掉 citybar 高度
    document.querySelectorAll('.citybar a[href^="index.html#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href").split("#")[1];
        if (!document.getElementById(id)) return;
        e.preventDefault();
        scrollToSection(id, true);
      });
    });
    // 從其他頁帶 #hash 進來時的後備：等資源載入、版面定案後再校正一次位移
    // （主要靠 CSS scroll-margin-top 讓瀏覽器原生錨點捲動落在 citybar 下方）
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash && document.getElementById(hash)) {
      window.addEventListener("load", () => scrollToSection(hash, false));
    }
  }

  // 獨立索引頁（美食／按摩共用一套版型）
  function renderSectionPage({ title, heroKey, daynum, h1, dsum, tab, section }) {
    document.title = title;
    const hero = `<header class="hero day-hero" style="background-image:url('${firstImg(heroKey)}')">
      <div class="daynum-big">${daynum}</div>
      <h1>${h1}</h1>
      <div class="dsum">${dsum}</div>
    </header>`;
    document.getElementById("app").innerHTML =
      hero + cityBarHTML(tab) + section() + footerHTML();
  }
  const renderFood = () => renderSectionPage({
    title: "美食索引 · 泰國 11 天", heroKey: "khao-soi", tab: "food", section: foodHTML,
    daynum: "EAT LIST · 美食索引", h1: "味覺地圖",
    dsum: "從曼谷的招牌咖哩螃蟹到清邁的靈魂咖哩麵，一路吃到冠軍咖啡與芒果糯米飯——這趟的必吃清單。",
  });
  const renderMassage = () => renderSectionPage({
    title: "按摩 · SPA · 泰國 11 天", heroKey: "massage-fahlanna", tab: "massage", section: massageHTML,
    daynum: "RELAX · 按摩 · SPA", h1: "按摩 · SPA 專區",
    dsum: "泰式古法、蘭納 SPA 到都會奢華療程——曼谷與清邁口碑最好的幾家，替走跳的雙腿好好充電。",
  });

  // 行前資訊頁：實用資訊 + 必訂清單（＋常用泰語、打包清單）
  function infoPageHTML() {
    const practical = INFO.practical.map((x) =>
      `<div class="info-card"><span class="ic">${x.ic}</span><div class="tx"><h4>${esc(x.t)}</h4><p>${esc(x.d)}</p></div></div>`
    ).join("");
    const checklist = INFO.checklist.map((c) =>
      `<div class="chk"><div class="chk-when">${esc(c.when)}</div><ul>${c.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`
    ).join("");
    const phrases = (INFO.phrases || []).map((p) =>
      `<div class="phrase"><div class="th">${esc(p.th)}</div><div class="rm">${esc(p.rm)}</div><div class="zh">${esc(p.zh)}</div></div>`
    ).join("");
    const packing = (INFO.packing || []).map((g) =>
      `<div class="pack-cat"><h4>${esc(g.cat)}</h4><ul>${g.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`
    ).join("");
    return `<section class="wrap infopage">
      <h3 class="info-h">🧳 行前實用資訊</h3>
      <div class="info-grid">${practical}</div>
      <h3 class="info-h">✅ 出發前必訂清單</h3>
      <p class="info-lead">泰國熱門店家與活動常需提前預訂，這張清單照時間軸排好各階段該做什麼。</p>
      <div class="chk-list">${checklist}</div>
      <h3 class="info-h">🗣️ 常用泰語小卡</h3>
      <p class="info-lead">點餐、殺價、問路都用得上；句末加 ค่ะ(kâ，女)／ครับ(kráp，男) 最有禮貌。</p>
      <div class="phrase-grid">${phrases}</div>
      <h3 class="info-h">🎒 打包清單（2 月泰國）</h3>
      <p class="info-lead">乾季偏乾熱——曼谷白天熱、清邁早晚涼，寺廟需遮肩過膝。照類別打勾帶齊。</p>
      <div class="pack-grid">${packing}</div>
    </section>`;
  }
  function renderInfo() {
    document.title = "行前資訊 · 泰國 11 天";
    const hero = `<header class="hero day-hero" style="background-image:url('${firstImg("grand-palace")}')">
      <div class="daynum-big">TRAVEL TIPS · 行前資訊</div>
      <h1>行前準備</h1>
      <div class="dsum">簽證、換匯、網路、交通、天氣穿著，到出發前的必訂清單——出門前掃一遍，玩得更安心。</div>
    </header>`;
    document.getElementById("app").innerHTML =
      hero + cityBarHTML("info") + infoPageHTML() + footerHTML();
  }

  /* ---------- 相簿互動 ---------- */
  function wireGalleries() {
    GALLERIES.forEach((g) => {
      if (g.imgs.length <= 1) {
        // 單張也可點開燈箱（0 張時無 .slide，需防呆避免整頁互動掛掉）
        const el = document.getElementById(g.id);
        const slide = el && el.querySelector(".slide");
        if (slide) slide.addEventListener("click", () => openLightbox(g.imgs, 0, g.name));
        return;
      }
      const el = document.getElementById(g.id);
      if (!el) return;
      const slides = [...el.querySelectorAll(".slide")];
      const dots = [...el.querySelectorAll(".gal-dots i")];
      let cur = 0;
      const show = (i) => {
        cur = (i + slides.length) % slides.length;
        slides.forEach((s, k) => s.classList.toggle("on", k === cur));
        dots.forEach((d, k) => d.classList.toggle("on", k === cur));
      };
      el.querySelector(".gal-prev").addEventListener("click", (e) => { e.stopPropagation(); show(cur - 1); });
      el.querySelector(".gal-next").addEventListener("click", (e) => { e.stopPropagation(); show(cur + 1); });
      dots.forEach((d) => d.addEventListener("click", (e) => { e.stopPropagation(); show(+d.dataset.i); }));
      slides.forEach((s) => s.addEventListener("click", () => openLightbox(g.imgs, cur, g.name)));
    });
  }

  /* ---------- 燈箱 ---------- */
  let lb = { imgs: [], i: 0, name: "" };
  function openLightbox(imgs, i, name) {
    lb = { imgs, i, name };
    const box = document.getElementById("lightbox");
    updateLightbox();
    box.classList.add("on");
    document.body.style.overflow = "hidden";
  }
  function updateLightbox() {
    document.getElementById("lb-img").src = lb.imgs[lb.i];
    document.getElementById("lb-cap").textContent =
      `${lb.name}　${lb.i + 1} / ${lb.imgs.length}`;
  }
  function wireLightbox() {
    const box = document.getElementById("lightbox");
    if (!box) return;
    const close = () => { box.classList.remove("on"); document.body.style.overflow = ""; };
    box.querySelector(".lb-close").addEventListener("click", close);
    box.querySelector(".lb-prev").addEventListener("click", () => { lb.i = (lb.i - 1 + lb.imgs.length) % lb.imgs.length; updateLightbox(); });
    box.querySelector(".lb-next").addEventListener("click", () => { lb.i = (lb.i + 1) % lb.imgs.length; updateLightbox(); });
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    document.addEventListener("keydown", (e) => {
      if (!box.classList.contains("on")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") { lb.i = (lb.i - 1 + lb.imgs.length) % lb.imgs.length; updateLightbox(); }
      if (e.key === "ArrowRight") { lb.i = (lb.i + 1) % lb.imgs.length; updateLightbox(); }
    });
  }

  // 每個 render 路徑共用：掛上燈箱、綁定相簿與燈箱事件
  function finalize() {
    document.body.insertAdjacentHTML("beforeend", lightboxHTML);
    wireGalleries();
    wireLightbox();
  }

  /* ---------- 進入點 ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const b = document.body;
    if (b.dataset.day) renderDay(+b.dataset.day);
    else if (b.dataset.page === "food") renderFood();
    else if (b.dataset.page === "massage") renderMassage();
    else if (b.dataset.page === "info") renderInfo();
    else renderHome();
    finalize();
  });
})();
