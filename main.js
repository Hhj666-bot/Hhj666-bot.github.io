(() => {
  'use strict';

  const root = document.documentElement;
  const THEME_KEY = 'theme';

  function savedTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch {
      return null;
    }
  }

  function currentTheme() {
    return root.dataset.theme
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  const stored = savedTheme();
  if (stored === 'light' || stored === 'dark') root.dataset.theme = stored;

  document.querySelector('.theme').addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // The toggle still works for this visit without storage.
    }
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

  const MODELS = ['Random', 'Elo', 'MMR', 'MMRv2'];
  const DATA = {
    s1: {
      label: '第一赛季',
      stomp: [12.32, 1.23, 1.30, 0.74],
      jail: [58.15, 13.82, 14.17, 10.01],
      healthy: [29.53, 84.95, 84.53, 89.25],
      spearman: [0.9405, 0.9544, 0.9449, 0.9348],
      converge: [105000, 111000, 136000, 222000],
    },
    s2: {
      label: '第二赛季',
      stomp: [12.16, 2.14, 2.08, 1.39],
      jail: [61.15, 13.90, 14.25, 10.84],
      healthy: [26.69, 83.96, 83.67, 87.77],
      spearman: [0.9423, 0.9583, 0.9502, 0.9399],
      converge: [96000, 86000, 122000, 134000],
    },
  };
  const METRICS = {
    healthy: {
      title: '健康玩家占比',
      sub: '胜率在 40% 到 60% 之间的活跃玩家，统计于 50 万场对局后',
      best: Math.max,
      max: () => 100,
      format: (value) => `${value.toFixed(2)}%`,
      foot: {
        s1: 'Random 的 58.15% 玩家胜率低于 40%；只改匹配方式，这个比例就降到 13.82%。',
        s2: '第二赛季软重置后加入 500 名极端玩家，MMRv2 仍保持 87.77%。',
      },
    },
    spearman: {
      title: '排名准确度（Spearman）',
      sub: '系统排名和真实实力的一致程度，越接近 1 越准，统计于 50 万场对局后',
      best: Math.max,
      max: () => 1,
      format: (value) => value.toFixed(4),
      foot: {
        s1: '四种机制相差不到 0.02，光看排名几乎分不出好坏。',
        s2: '第二赛季的趋势一致，差距依然不到 0.02。',
      },
    },
    converge: {
      title: '收敛场次',
      sub: '同时达到三项收敛标准所需的总对局数，越少越快',
      best: Math.min,
      max: (values) => Math.max(...values),
      format: (value) => `${(value / 10000).toFixed(1)} 万场`,
      foot: {
        s1: 'MMRv2 用最慢的收敛换来了最好的玩家体验，这正是公平和速度的取舍。',
        s2: '赛季软重置保留了部分信息，四种机制的收敛都比第一赛季更快。',
      },
    },
  };

  const state = { metric: 'healthy', season: 's1' };

  function renderBars() {
    const metric = METRICS[state.metric];
    const season = DATA[state.season];
    const values = season[state.metric];
    const best = metric.best(...values);
    const max = metric.max(values);
    const bars = document.getElementById('bars');

    document.getElementById('chart-title').textContent = metric.title;
    document.getElementById('chart-sub').textContent = `${season.label} · ${metric.sub}`;
    document.getElementById('chart-foot').textContent = metric.foot[state.season];

    bars.replaceChildren(...MODELS.map((model, index) => {
      const bar = document.createElement('div');
      bar.className = values[index] === best ? 'bar best' : 'bar';
      bar.tabIndex = 0;
      const value = metric.format(values[index]);
      bar.setAttribute('aria-label', `${model}：${value}`);
      bar.innerHTML = `
        <span class="name">${model}</span>
        <span class="track">
          <span class="fill" style="width:calc((100% - 96px) * ${values[index] / max})"></span>
          <span class="value">${value}</span>
        </span>
        <span class="tip">胜率低于 40%：${season.jail[index].toFixed(2)}% · 高于 60%：${season.stomp[index].toFixed(2)}%</span>`;
      return bar;
    }));
  }

  function renderTable() {
    const rows = ['s1', 's2'].flatMap((key) => MODELS.map((model, index) => {
      const season = DATA[key];
      return `<tr><td>${season.label}</td><td>${model}</td>
        <td>${season.healthy[index].toFixed(2)}%</td>
        <td>${season.jail[index].toFixed(2)}%</td>
        <td>${season.stomp[index].toFixed(2)}%</td>
        <td>${season.spearman[index].toFixed(4)}</td>
        <td>${season.converge[index].toLocaleString('en-US')}</td></tr>`;
    })).join('');
    document.getElementById('data-table').innerHTML = `
      <thead><tr><th>赛季</th><th>机制</th><th>健康</th><th>胜率 &lt; 40%</th><th>胜率 &gt; 60%</th><th>Spearman</th><th>收敛场次</th></tr></thead>
      <tbody>${rows}</tbody>`;
  }

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
  renderBars();
  renderTable();
})();
