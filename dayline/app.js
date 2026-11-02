import { downloadCalendar, downloadPng, downloadPdf } from './export.mjs';
import {
  key,
  parse,
  minutes,
  validate,
  occurs,
  overlaps,
  weekDates,
  layoutEvents,
  exportWeek,
} from './model.mjs';
const $ = (s) => document.querySelector(s),
  f = $('#form'),
  dialog = $('#editor'),
  storageKey = 'dayline.events.v1';
let events = [],
  selected = key(new Date()),
  view = 'week',
  editing = null;
try {
  const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (!Array.isArray(data)) throw Error();
  events = data.map((e) => {
    validate(e);
    if (typeof e.id !== 'string') throw Error();
    return e;
  });
} catch {
  $('#notice').textContent =
    '无法读取保存的数据，请勿清除浏览器数据。 / Unable to load saved data; please keep browser data intact.';
}
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const days = [
  '周日 / Sun',
  '周一 / Mon',
  '周二 / Tue',
  '周三 / Wed',
  '周四 / Thu',
  '周五 / Fri',
  '周六 / Sat',
];
const onDate = (date) =>
  events.filter((e) => occurs(e, date)).sort((a, b) => a.start.localeCompare(b.start));
const conflictOn = (e, date) =>
  onDate(date).some((b) => b.id !== e.id && e.start < b.end && b.start < e.end);
function card(e, date) {
  return /* HTML */ `<button class="event ${e.category}" data-id="${esc(e.id)}">
    <span class="time">${e.start}–${e.end}</span
    ><strong>${esc(e.title)}</strong>${e.location
      ? /* HTML */ `<small>${esc(e.location)}</small>`
      : ''}${e.repeat ? '<small>↻ 每周 / Weekly</small>' : ''}${conflictOn(e, date)
      ? '<small class="conflict">⚠ 时间冲突 / Conflict</small>'
      : ''}
  </button>`;
}
function timeline(week) {
  const items = week.flatMap(onDate);
  const first = Math.min(8, ...items.map((e) => Math.floor(minutes(e.start) / 60)));
  const last = Math.max(20, ...items.map((e) => Math.ceil(minutes(e.end) / 60)));
  const height = (last - first) * 96;
  const ticks = Array.from(
    { length: last - first + 1 },
    (_, i) =>
      /* HTML */ `<span style="top:${i * 96}px"
        >${String(first + i).padStart(2, '0')}:00</span
      >`,
  ).join('');
  return /* HTML */ `<div class="time-grid">
    <div class="time-header">时间<br />Time</div>
    ${week
      .map(
        (day) =>
          /* HTML */ `<button
            class="day-head ${day === selected ? 'chosen' : ''}"
            data-day="${day}"
          >
            ${days[parse(day).getDay()]}<strong>${parse(day).getDate()}</strong>
          </button>`,
      )
      .join('')}
    <div class="time-axis" style="height:${height}px">${ticks}</div>
    ${week
      .map(
        (day) =>
          /* HTML */ `<div
            class="time-day ${day === selected ? 'selected' : ''}"
            style="height:${height}px"
          >
            ${layoutEvents(onDate(day))
              .map(
                ({ event: e, lane, columns }) =>
                  /* HTML */ `<button
                    class="event timed ${e.category}"
                    data-id="${esc(e.id)}"
                    style="top:${(minutes(e.start) - first * 60) *
                    1.6}px;height:${(minutes(e.end) - minutes(e.start)) *
                    1.6}px;left:calc(${(lane / columns) * 100}% + 3px);width:calc(${100 /
                    columns}% - 6px)"
                    title="${esc(
                      e.title + ' · ' + e.start + '–' + e.end + ' · ' + e.location,
                    )}"
                  >
                    <span class="time">${e.start}–${e.end}</span
                    ><strong>${esc(e.title)}</strong>${e.location
                      ? /* HTML */ `<small>${esc(e.location)}</small>`
                      : ''}${conflictOn(e, day)
                      ? '<small class="conflict">冲突 / Conflict</small>'
                      : ''}
                  </button>`,
              )
              .join('')}
          </div>`,
      )
      .join('')}
  </div>`;
}
function render() {
  const date = parse(selected),
    monday = parse(selected);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return key(d);
  });
  $('#selectedDate').value = selected;
  $('#range').textContent =
    view === 'week' ? `${week[0]} — ${week[6]}` : `${selected} · ${days[date.getDay()]}`;
  $('#weekView').classList.toggle('active', view === 'week');
  $('#dayView').classList.toggle('active', view === 'day');
  const daily = onDate(selected);
  $('#board').innerHTML =
    view === 'week'
      ? timeline(week)
      : /* HTML */ `<div class="daily-list">
          ${daily.map((e) => card(e, selected)).join('') ||
          '<div class="empty">今天，留给新的可能。<br>A clear day, a fresh start.<br><br><button data-new="true">＋ 添加安排 / Add event</button></div>'}
        </div>`;
  $('#dayTitle').textContent =
    `${date.getMonth() + 1}/${date.getDate()} · ${days[date.getDay()]}`;
  const total = daily.reduce((n, e) => n + minutes(e.end) - minutes(e.start), 0);
  $('#summary').textContent =
    `${daily.length} 项安排 / events · ${(total / 60).toFixed(1)} 小时 / hours`;
  $('#agenda').innerHTML =
    daily
      .map(
        (e) =>
          /* HTML */ `<div class="agenda-item">
            <button data-id="${esc(e.id)}">
              <small>${e.start} — ${e.end}</small><strong>${esc(e.title)}</strong
              ><small>${esc(e.location || '未设置地点 / No location')}</small>
            </button>
          </div>`,
      )
      .join('') ||
    '<div class="empty">暂无安排 / No events<br>从一件小事开始。<br>Start with one small plan.</div>';
}
function openEditor(id) {
  editing = id || null;
  f.reset();
  const e = events.find((e) => e.id === id);
  f.elements.date.value = selected;
  const until = parse(selected);
  until.setMonth(until.getMonth() + 4);
  f.elements.until.value = key(until);
  if (e)
    for (const k of [
      'title',
      'category',
      'date',
      'start',
      'end',
      'location',
      'notes',
      'until',
    ])
      f.elements[k].value = e[k] || '';
  f.elements.repeat.checked = !!e?.repeat;
  $('#untilLabel').hidden = !f.elements.repeat.checked;
  $('#delete').hidden = !e;
  $('#formTitle').textContent = e ? '编辑安排 / Edit event' : '新建安排 / New event';
  $('#error').textContent = '';
  dialog.showModal();
}
function persist(next) {
  localStorage.setItem(storageKey, JSON.stringify(next));
  events = next;
  render();
  $('#notice').textContent = '已保存到本机 / Saved on this device';
}
$('#add').onclick = () => openEditor();
$('#close').onclick = $('#cancel').onclick = () => dialog.close();
f.elements.repeat.onchange = () => {
  $('#untilLabel').hidden = !f.elements.repeat.checked;
};
f.onsubmit = (event) => {
  event.preventDefault();
  try {
    const data = Object.fromEntries(new FormData(f));
    const e = {
      ...data,
      id: editing || crypto.randomUUID(),
      title: data.title.trim(),
      repeat: f.elements.repeat.checked,
    };
    validate(e);
    const conflicts = events.filter((b) => overlaps(e, b));
    if (
      conflicts.length &&
      !confirm(
        `与以下安排冲突 / Conflicts with:\n${conflicts.map((e) => e.title).join('\n')}\n\n仍然保存？ / Save anyway?`,
      )
    )
      return;
    persist([...events.filter((b) => b.id !== editing), e]);
    selected = e.date;
    render();
    dialog.close();
  } catch (error) {
    $('#error').textContent =
      error.name === 'QuotaExceededError'
        ? '保存空间不足 / Storage is full'
        : error.message || '保存失败 / Unable to save';
  }
};
$('#delete').onclick = () => {
  if (
    confirm(
      '删除此安排？重复安排将删除整个系列。 / Delete this event? All occurrences in the series will be deleted.',
    )
  ) {
    try {
      persist(events.filter((e) => e.id !== editing));
      dialog.close();
    } catch {
      $('#error').textContent = '删除失败 / Unable to delete';
    }
  }
};
$('#weekView').onclick = () => {
  view = 'week';
  render();
};
$('#dayView').onclick = () => {
  view = 'day';
  render();
};
$('#selectedDate').onchange = (e) => {
  if (e.target.value) {
    selected = e.target.value;
    render();
  }
};
$('#today').onclick = () => {
  selected = key(new Date());
  render();
};
for (const [id, delta] of [
  ['prev', -1],
  ['next', 1],
])
  $('#' + id).onclick = () => {
    const d = parse(selected);
    d.setDate(d.getDate() + delta * (view === 'week' ? 7 : 1));
    selected = key(d);
    render();
  };
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-id],[data-day],[data-new]');
  if (!target) return;
  if (target.dataset.id) openEditor(target.dataset.id);
  else if (target.dataset.day) {
    selected = target.dataset.day;
    render();
  } else openEditor();
});
window.addEventListener('storage', (e) => {
  if (e.key === storageKey) {
    try {
      const next = JSON.parse(e.newValue || '[]');
      if (!Array.isArray(next)) return;
      next.forEach(validate);
      events = next;
      render();
    } catch {}
  }
});
render();
if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(
      document.modelContext.registerTool({
        name: 'start_event_creation',
        title: '添加安排 / Add event',
        description: 'Open the event form for the selected date; does not save an event.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false },
        execute(input) {
          if (!input || Object.keys(input).length) throw Error('Invalid input');
          if (!dialog.open) openEditor();
          return { opened: true, date: selected };
        },
      }),
    ).catch(() => {});
  } catch {}
}

const exportDialog = $('#exportDialog');
$('#exportWeek').onclick = () => {
  $('#exportStatus').textContent = '';
  exportDialog.showModal();
};
$('#closeExport').onclick = () => exportDialog.close();
$('#exportFormat').onchange = () => {
  $('#calendarHelp').hidden = $('#exportFormat').value !== 'ics';
  $('#pdfHelp').hidden = $('#exportFormat').value !== 'pdf';
};
$('#runExport').onclick = async () => {
  const button = $('#runExport');
  button.disabled = true;
  try {
    const format = $('#exportFormat').value;
    if (format === 'png') await downloadPng(events, selected);
    else if (format === 'ics') downloadCalendar(events, selected);
    else {
      await downloadPdf(events, selected);
    }
    $('#exportStatus').textContent =
      '已生成文件，请查看下载 / File generated; check downloads';
  } catch (error) {
    $('#exportStatus').textContent =
      error.message || '导出失败，请重试 / Export failed; try again';
  } finally {
    button.disabled = false;
  }
};
