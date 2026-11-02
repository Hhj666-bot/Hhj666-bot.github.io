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

  document.querySelector('.theme').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    saveSetting(THEME_KEY, next);
  });

  function drawSkyline() {
    const svg = document.getElementById('skyline');
    const ns = 'http://www.w3.org/2000/svg';
    const heights = [3, 5, 4, 7, 6, 9, 8, 10, 8, 9, 6, 7, 4, 3];
    const ground = 318;
    const stepX = 28;
    const stepY = 28;
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const add = (tag, attributes) => {
      const node = document.createElementNS(ns, tag);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
      svg.append(node);
      return node;
    };

    heights.forEach((rows, index) => {
      const x = 16 + index * stepX;
      const top = ground - rows * stepY - 6;
      add('rect', { class: 'body', x: x - 5, y: top, width: stepX, height: ground - top });
      if (rows >= 7) {
        add('path', {
          class: 'body',
          d: `M${x - 5} ${top}L${x + 9} ${top - 26}L${x + 23} ${top}Z`,
        });
      }
    });

    heights.forEach((rows, index) => {
      const x = 16 + index * stepX;
      for (let row = 0; row < rows; row += 1) {
        const roll = random();
        const className = roll < 0.2 ? 'pulse' : roll < 0.4 ? 'lit' : 'off';
        const cell = add('rect', {
          class: className,
          x,
          y: ground - (row + 1) * stepY,
          width: 18,
          height: 22,
          rx: 2,
        });
        if (className === 'pulse') {
          cell.style.animationDelay = `-${(random() * 9).toFixed(1)}s`;
        }
      }
    });
    add('rect', { class: 'ground', x: 0, y: ground, width: 420, height: 3 });
  }

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
    heroProjects: 'View projects',
    heroResearch: 'Read the research',
    skylineLabel: 'A building whose windows light up and dim',
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
    researchEyebrow: 'Research · ECE3280 four-person course project',
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
    toolsEyebrow: 'Tools',
    toolsTitle: 'Solving everyday problems',
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

  drawSkyline();
  bindSegmented('metric', 'metric');
  bindSegmented('season', 'season');
  applyLanguage(preferredLanguage());
})();
