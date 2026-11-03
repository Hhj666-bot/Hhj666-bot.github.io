(() => {
  'use strict';

  const root = document.documentElement;
  const THEME_KEY = 'theme';
  const LANG_KEY = 'lang';

  function loadSetting(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function saveSetting(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // The choice still applies for this visit without storage.
    }
  }

  function currentTheme() {
    return root.dataset.theme
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  const storedTheme = loadSetting(THEME_KEY);
  if (storedTheme === 'light' || storedTheme === 'dark') root.dataset.theme = storedTheme;

  // The scene is a fixed city of lit windows. It is what the glass panels refract,
  // so it is drawn once per size or theme on a canvas, with a few lights on top.
  const canvas = document.getElementById('scene');
  const lights = document.getElementById('scene-lights');
  let sceneSize = '';

  function drawScene(force) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const size = `${width}x${Math.round(height / 120)}`;
    if (!force && size === sceneSize) return;
    sceneSize = size;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const style = getComputedStyle(root);
    const color = (name) => style.getPropertyValue(name).trim();
    let seed = 11;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const candidates = [];

    function layer(options) {
      let x = -random() * 40;
      while (x < width) {
        const w = options.minWidth + random() * (options.maxWidth - options.minWidth);
        const h = height * (options.minHeight + random() * (options.maxHeight - options.minHeight));
        const top = height - h;
        context.fillStyle = options.body;
        context.fillRect(x, top, w, h);
        if (options.spires && random() < 0.35) {
          context.beginPath();
          context.moveTo(x, top);
          context.lineTo(x + w / 2, top - Math.min(60, w * 0.6));
          context.lineTo(x + w, top);
          context.fill();
        }
        const columns = Math.max(1, Math.floor((w - options.pad) / options.stepX));
        const offset = x + (w - columns * options.stepX + options.stepX - options.cellW) / 2;
        for (let row = top + options.pad; row + options.cellH < height - 4; row += options.stepY) {
          for (let column = 0; column < columns; column += 1) {
            const cx = offset + column * options.stepX;
            const lit = random() < options.lit;
            context.globalAlpha = lit ? options.litAlpha : options.offAlpha;
            context.fillStyle = lit ? options.litColor : color('--win-off');
            context.fillRect(cx, row, options.cellW, options.cellH);
            if (lit && options.pulses && row > height * 0.35) candidates.push([cx, row, options.cellW, options.cellH]);
          }
        }
        context.globalAlpha = 1;
        x += w + options.gap;
      }
    }

    layer({
      body: color('--far'), minWidth: 44, maxWidth: 96, minHeight: 0.34, maxHeight: 0.7,
      stepX: 14, stepY: 18, cellW: 6, cellH: 9, pad: 10, gap: 4,
      lit: 0.14, litColor: color('--win-far'), litAlpha: 0.75, offAlpha: 0.45,
    });
    layer({
      body: color('--near'), minWidth: 70, maxWidth: 150, minHeight: 0.14, maxHeight: 0.44,
      stepX: 20, stepY: 26, cellW: 11, cellH: 15, pad: 14, gap: 10, spires: true,
      lit: 0.24, litColor: color('--win-lit'), litAlpha: 1, offAlpha: 0.9, pulses: true,
    });

    lights.replaceChildren(...candidates
      .sort(() => random() - 0.5)
      .slice(0, 16)
      .map(([x, y, w, h], index) => {
        const light = document.createElement('span');
        light.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;animation-delay:-${(index * 1.7) % 11}s`;
        return light;
      }));
  }

  document.querySelector('.theme').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    saveSetting(THEME_KEY, next);
    drawScene(true);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => drawScene(true));
  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => drawScene(false));
  });

  // Chinese text lives in index.html; this table only adds the English version.
  const ENGLISH = {
    skip: 'Skip to content',
    navLabel: 'Page navigation',
    navProjects: 'Projects',
    navResearch: 'Research',
    navTools: 'Tools',
    themeLabel: 'Toggle light and dark mode',
    heroEyebrow: 'The Chinese University of Hong Kong, Shenzhen · CSE undergraduate',
    heroTitle: 'Bringing different agents<br>under one roof',
    heroStatus: 'Currently building HiveLab',
    heroProjects: 'View projects',
    heroResearch: 'Research',
    labelProjects: 'Projects',
    labelResearch: 'Research',
    labelTools: 'Tools',
    hiveEyebrow: 'Main project · In development',
    hiveTitle: 'HiveLab',
    hiveBody: 'A local, multi-member AI desktop workspace. It brings coding assistants such as Claude Code, Codex and DeepSeek into one window: discussions stay visible, task approval, file diffs and acceptance all happen in one place, and each member works through its own native runtime and separate login.',
    hivePoint1: 'Three processes: interface, Electron main process and background service',
    hivePoint2: 'SQLite for business data and the event stream',
    hivePoint3: 'Unit, integration, UI and desktop smoke tests',
    hiveNote: 'Built on the open-source project <a href="https://github.com/tonyAmadeus/offAice">offAice</a>. The source is being prepared and is not public yet.',
    flow1: 'Discuss',
    flow2: 'Approve',
    flow3: 'Diff',
    flow4: 'Accept',
    ashenEyebrow: 'Minecraft mod · Unofficial fan prototype',
    ashenTitle: 'Ashen Draft',
    ashenBody: 'A technical prototype of a Minecraft × Warhammer 40,000 survival mod, currently at v0.9. Recruit three unit types, command them with multi-select and equip each soldier; follow dirt roads across the wasteland into procedurally generated hive cities, then bribe or defeat the guards to climb up from the underhive. There is no story quest system yet.',
    fact1: 'army unit cap',
    fact2: 'persistent squads',
    fact3: 'game server tests',
    viewSource: 'View source',
    facadeAlt: 'Procedurally generated hive facade with stepped towers and lit windows',
    facadeCaption: 'Procedural facade projection, not an in-game screenshot',
    researchEyebrow: 'ECE3280 four-person course project',
    researchTitle: 'Who you face matters more than how scores update',
    researchBody: 'We built a configurable benchmark framework and compared Random, Elo, MMR and our proposed MMRv2 using 10,000 simulated players and 500,000 1v1 matches.',
    metricLabel: 'Choose a metric',
    metricHealthy: 'Healthy players',
    metricSpearman: 'Rank accuracy',
    metricConverge: 'Convergence',
    seasonLabel: 'Choose a season',
    season1: 'Season 1',
    season2: 'Season 2',
    showData: 'Show all data',
    finding1Title: 'Matching outweighs scoring',
    finding1Body: 'The post-match update formulas are nearly identical, yet changing only the matching puts Elo 55.4 percentage points above Random in healthy players.',
    finding2Title: 'Fairness costs speed',
    finding2Body: 'MMRv2 has the most healthy players at 89.25%, but it is also the slowest to converge, at 222,000 matches.',
    finding3Title: 'Ranking accuracy barely differs',
    finding3Body: 'All four mechanisms finish with a Spearman between 0.93 and 0.96. The real difference lies in player experience.',
    paperRepo: 'Group repository',
    daylineBody: 'A bilingual daily planner and weekly timetable with recurring classes and conflict warnings. It exports to PDF, PNG and calendar files, and your data stays in your browser.',
    tryOnline: 'Try it online',
    source: 'Source',
    badmintonTitle: 'Badminton Court Booking Helper',
    badmintonBody: 'A Tampermonkey userscript that picks courts in priority order, checks the time slot and fills in the booking form. It does not read passwords or cookies.',
    footer: 'hhj · CUHK-Shenzhen CSE',
  };

  const PAGE = {
    zh: {
      title: document.title,
      description: document.querySelector('meta[name="description"]').content,
      langCode: 'zh-CN',
      switchTo: 'EN',
      switchLabel: 'Switch to English',
      switchLang: 'en',
    },
    en: {
      title: 'hhj · Personal site',
      description: 'hhj, a CSE undergraduate at CUHK-Shenzhen. HiveLab, the Ashen Draft mod and research on matchmaking.',
      langCode: 'en',
      switchTo: '中文',
      switchLabel: '切换到中文',
      switchLang: 'zh-CN',
    },
  };

  const textNodes = [...document.querySelectorAll('[data-i18n]')].map((node) => ({
    node,
    zh: node.innerHTML,
    en: ENGLISH[node.dataset.i18n],
  }));
  const attributeNodes = [...document.querySelectorAll('[data-i18n-attr]')].map((node) => {
    const [attribute, key] = node.dataset.i18nAttr.split(':');
    return { node, attribute, zh: node.getAttribute(attribute), en: ENGLISH[key] };
  });

  const MODELS = ['Random', 'Elo', 'MMR', 'MMRv2'];
  const DATA = {
    s1: {
      label: { zh: '第一赛季', en: 'Season 1' },
      stomp: [12.32, 1.23, 1.30, 0.74],
      jail: [58.15, 13.82, 14.17, 10.01],
      healthy: [29.53, 84.95, 84.53, 89.25],
      spearman: [0.9405, 0.9544, 0.9449, 0.9348],
      converge: [105000, 111000, 136000, 222000],
    },
    s2: {
      label: { zh: '第二赛季', en: 'Season 2' },
      stomp: [12.16, 2.14, 2.08, 1.39],
      jail: [61.15, 13.90, 14.25, 10.84],
      healthy: [26.69, 83.96, 83.67, 87.77],
      spearman: [0.9423, 0.9583, 0.9502, 0.9399],
      converge: [96000, 86000, 122000, 134000],
    },
  };
  const METRICS = {
    healthy: {
      best: Math.max,
      max: () => 100,
      format: (value) => `${value.toFixed(2)}%`,
      zh: {
        title: '健康玩家占比',
        sub: '胜率在 40% 到 60% 之间的活跃玩家，统计于 50 万场对局后',
        s1: 'Random 的 58.15% 玩家胜率低于 40%；只改匹配方式，这个比例就降到 13.82%。',
        s2: '第二赛季软重置后加入 500 名极端玩家，MMRv2 仍保持 87.77%。',
      },
      en: {
        title: 'Healthy player share',
        sub: 'Active players with a win rate between 40% and 60%, after 500,000 matches',
        s1: 'Under Random, 58.15% of players win less than 40% of their matches. Changing only the matching brings that down to 13.82%.',
        s2: 'After the Season 2 soft reset added 500 extreme players, MMRv2 still held 87.77%.',
      },
    },
    spearman: {
      best: Math.max,
      max: () => 1,
      format: (value) => value.toFixed(4),
      zh: {
        title: '排名准确度（Spearman）',
        sub: '系统排名和真实实力的一致程度，越接近 1 越准，统计于 50 万场对局后',
        s1: '四种机制相差不到 0.02，光看排名几乎分不出好坏。',
        s2: '第二赛季的趋势一致，差距依然不到 0.02。',
      },
      en: {
        title: 'Rank accuracy (Spearman)',
        sub: 'How closely system rank matches true skill, where closer to 1 is better, after 500,000 matches',
        s1: 'The four mechanisms sit within 0.02 of each other, so rankings alone barely separate them.',
        s2: 'Season 2 follows the same pattern, with the gap still under 0.02.',
      },
    },
    converge: {
      best: Math.min,
      max: (values) => Math.max(...values),
      format: (value, lang) => (lang === 'en'
        ? `${(value / 1000).toFixed(0)}k matches`
        : `${(value / 10000).toFixed(1)} 万场`),
      zh: {
        title: '收敛场次',
        sub: '同时达到三项收敛标准所需的总对局数，越少越快',
        s1: 'MMRv2 用最慢的收敛换来了最好的玩家体验，这正是公平和速度的取舍。',
        s2: '赛季软重置保留了部分信息，四种机制的收敛都比第一赛季更快。',
      },
      en: {
        title: 'Matches to converge',
        sub: 'Total matches needed to meet all three convergence criteria, where fewer is faster',
        s1: 'MMRv2 pays for the best player experience with the slowest convergence: this is the fairness-speed trade-off.',
        s2: 'The soft reset carries some information forward, so all four mechanisms converge faster than in Season 1.',
      },
    },
  };
  const TABLE = {
    zh: {
      headers: ['赛季', '机制', '健康', '胜率 &lt; 40%', '胜率 &gt; 60%', 'Spearman', '收敛场次'],
      tip: (low, high) => `胜率低于 40%：${low}% · 高于 60%：${high}%`,
    },
    en: {
      headers: ['Season', 'Mechanism', 'Healthy', 'Win rate &lt; 40%', 'Win rate &gt; 60%', 'Spearman', 'Matches to converge'],
      tip: (low, high) => `Win rate under 40%: ${low}% · over 60%: ${high}%`,
    },
  };

  const state = { metric: 'healthy', season: 's1', lang: 'zh' };

  function renderBars() {
    const metric = METRICS[state.metric];
    const copy = metric[state.lang];
    const season = DATA[state.season];
    const values = season[state.metric];
    const best = metric.best(...values);
    const max = metric.max(values);
    const bars = document.getElementById('bars');

    document.getElementById('chart-title').textContent = copy.title;
    document.getElementById('chart-sub').textContent = `${season.label[state.lang]} · ${copy.sub}`;
    document.getElementById('chart-foot').textContent = copy[state.season];

    bars.replaceChildren(...MODELS.map((model, index) => {
      const bar = document.createElement('div');
      bar.className = values[index] === best ? 'bar best' : 'bar';
      bar.tabIndex = 0;
      const value = metric.format(values[index], state.lang);
      const tip = TABLE[state.lang].tip(season.jail[index].toFixed(2), season.stomp[index].toFixed(2));
      bar.setAttribute('aria-label', `${model}: ${value}`);
      bar.innerHTML = `
        <span class="name">${model}</span>
        <span class="track">
          <span class="fill" style="width:calc((100% - 112px) * ${values[index] / max})"></span>
          <span class="value">${value}</span>
        </span>
        <span class="tip">${tip}</span>`;
      return bar;
    }));
  }

  function renderTable() {
    const rows = ['s1', 's2'].flatMap((key) => MODELS.map((model, index) => {
      const season = DATA[key];
      return `<tr><td>${season.label[state.lang]}</td><td>${model}</td>
        <td>${season.healthy[index].toFixed(2)}%</td>
        <td>${season.jail[index].toFixed(2)}%</td>
        <td>${season.stomp[index].toFixed(2)}%</td>
        <td>${season.spearman[index].toFixed(4)}</td>
        <td>${season.converge[index].toLocaleString('en-US')}</td></tr>`;
    })).join('');
    const headers = TABLE[state.lang].headers.map((name) => `<th>${name}</th>`).join('');
    document.getElementById('data-table').innerHTML = `
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>`;
  }

  function applyLanguage(lang) {
    state.lang = lang;
    const page = PAGE[lang];
    root.lang = page.langCode;
    document.title = page.title;
    document.querySelector('meta[name="description"]').content = page.description;
    textNodes.forEach((item) => { item.node.innerHTML = item[lang]; });
    attributeNodes.forEach((item) => { item.node.setAttribute(item.attribute, item[lang]); });

    const button = document.querySelector('.lang');
    button.textContent = page.switchTo;
    button.lang = page.switchLang;
    button.setAttribute('aria-label', page.switchLabel);

    renderBars();
    renderTable();
  }

  function preferredLanguage() {
    const stored = loadSetting(LANG_KEY);
    if (stored === 'zh' || stored === 'en') return stored;
    return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  document.querySelector('.lang').addEventListener('click', () => {
    const next = state.lang === 'zh' ? 'en' : 'zh';
    saveSetting(LANG_KEY, next);
    applyLanguage(next);
  });

  function bindSegmented(id, key) {
    const group = document.getElementById(id);
    group.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      state[key] = button.dataset.value;
      group.querySelectorAll('button').forEach((item) => {
        item.setAttribute('aria-pressed', String(item === button));
      });
      renderBars();
    });
  }

  drawScene(true);
  bindSegmented('metric', 'metric');
  bindSegmented('season', 'season');
  applyLanguage(preferredLanguage());
})();
