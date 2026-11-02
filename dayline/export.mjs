import { singlePagePdf } from './pdf.mjs';
import { weekDates, occurs, exportWeek } from './model.mjs';

const weekdays = [
  '周一 / Mon',
  '周二 / Tue',
  '周三 / Wed',
  '周四 / Thu',
  '周五 / Fri',
  '周六 / Sat',
  '周日 / Sun',
];
export function weeklyData(events, selected) {
  return weekDates(selected).map((date, index) => ({
    date,
    label: weekdays[index],
    events: events
      .filter((event) => occurs(event, date))
      .sort((a, b) => a.start.localeCompare(b.start)),
  }));
}
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function downloadCalendar(events, selected) {
  const dates = weekDates(selected);
  download(
    new Blob([exportWeek(events, selected)], { type: 'text/calendar;charset=utf-8' }),
    `Dayline-${dates[0]}-${dates[6]}.ics`,
  );
}

// Measure and wrap by Unicode characters to support Chinese and English names.
function wrapText(ctx, text, width) {
  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    for (const char of paragraph) {
      if (line && ctx.measureText(line + char).width > width) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
    lines.push(line);
  }
  return lines;
}
export async function downloadPng(events, selected) {
  await document.fonts.ready;
  const week = weeklyData(events, selected);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('无法创建图片 / Unable to create image');
  const width = 1820,
    column = 248,
    padding = 42;
  ctx.font = '18px sans-serif';
  const columns = week.map((day) =>
    day.events.map((event) => ({
      category: event.category,
      lines: [
        event.start + '–' + event.end,
        ...wrapText(ctx, event.title, column - 28),
        ...(event.location
          ? wrapText(ctx, '地点 / Location: ' + event.location, column - 28)
          : []),
        ...(event.notes
          ? wrapText(ctx, '备注 / Notes: ' + event.notes, column - 28)
          : []),
      ],
    })),
  );
  const height = Math.max(
    700,
    ...columns.map(
      (cards) => 240 + cards.reduce((n, card) => n + card.lines.length * 28 + 34, 0),
    ),
  );
  if (height > 16000)
    throw Error('本周内容过多，请选择 PDF / Too much content for one image; choose PDF');
  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#182b42';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('日程线 · 每周行程 / Dayline · Weekly schedule', padding, 58);
  ctx.font = '20px sans-serif';
  ctx.fillText(`${week[0].date} — ${week[6].date} · 本地时间 / Local time`, padding, 99);
  week.forEach((day, i) => {
    const x = padding + i * column;
    ctx.fillStyle = '#245de2';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(day.label, x + 8, 150);
    ctx.font = '18px sans-serif';
    ctx.fillText(day.date, x + 8, 180);
    let y = 202;
    if (!columns[i].length) {
      ctx.fillStyle = '#687b93';
      ctx.fillText('暂无安排 / No events', x + 8, y + 26);
    }
    for (const card of columns[i]) {
      const h = card.lines.length * 28 + 24;
      ctx.fillStyle = { course: '#eaf1ff', study: '#f0ecff', life: '#e4f5ef' }[
        card.category
      ];
      ctx.fillRect(x, y, column - 10, h);
      ctx.fillStyle = '#182b42';
      ctx.font = '18px sans-serif';
      card.lines.forEach((line, j) => ctx.fillText(line, x + 9, y + 28 + j * 28));
      y += h + 10;
    }
  });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw Error('图片生成失败 / Image generation failed');
  download(blob, `Dayline-${week[0].date}-${week[6].date}.png`);
}

// One landscape page with compact daily lists, independent of event duration.
export async function downloadPdf(events, selected) {
  await document.fonts.ready;
  const week = weeklyData(events, selected);
  const canvas = document.createElement('canvas');
  canvas.width = 2526;
  canvas.height = 1786;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw Error('无法创建 PDF / Unable to create PDF');
  const left = 65,
    top = 258,
    right = 2466,
    bottom = 1670;
  const column = (right - left) / 7;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#182b42';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('日程线 · 每周课表 / Dayline · Weekly planner', 65, 89);
  ctx.font = '27px sans-serif';
  ctx.fillStyle = '#536985';
  ctx.fillText(`${week[0].date} — ${week[6].date}  ·  本地时间 / Local time`, 65, 142);
  ctx.fillStyle = '#edf3ff';
  ctx.fillRect(left, 176, right - left, top - 176);
  week.forEach((day, index) => {
    const x = left + column * index;
    ctx.fillStyle = '#245de2';
    ctx.font = 'bold 27px sans-serif';
    ctx.fillText(day.label, x + 17, 211);
    ctx.font = '23px sans-serif';
    ctx.fillText(day.date, x + 17, 244);
  });
  ctx.strokeStyle = '#dce3ed';
  ctx.lineWidth = 2;
  for (let index = 0; index <= 7; index++) {
    const x = left + index * column;
    ctx.beginPath();
    ctx.moveTo(x, 176);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
  let abbreviated = false;
  week.forEach((day, index) => {
    const x = left + column * index + 7;
    const width = column - 14;
    let y = top + 14;
    if (!day.events.length) {
      ctx.fillStyle = '#687b93';
      ctx.font = '24px sans-serif';
      ctx.fillText('暂无安排 / No events', x + 10, y + 32);
      return;
    }
    // Fit the entire day on the page; shorten long details only when necessary.
    const available = bottom - y;
    let font = 26;
    const makeCards = () => {
      ctx.font = `${font}px sans-serif`;
      return day.events.map((event) => ({
        event,
        lines: [
          `${event.start}–${event.end}`,
          ...wrapText(ctx, event.title, width - 24),
          ...(event.location ? wrapText(ctx, event.location, width - 24) : []),
          ...(event.notes ? wrapText(ctx, event.notes, width - 24) : []),
        ],
      }));
    };
    let cards = makeCards();
    while (
      font > 20 &&
      cards.reduce((sum, card) => sum + card.lines.length * font * 1.3 + 32, 0) >
        available
    ) {
      font -= 1;
      cards = makeCards();
    }
    const lineHeight = font * 1.3;
    const maximumLines = Math.floor((available / cards.length - 32) / lineHeight);
    if (maximumLines < 2) {
      throw Error(
        '单日事项过多，无法清晰放入一页；请使用 PNG 或 ICS。 / Too many daily events for a readable single page; use PNG or ICS.',
      );
    }
    for (const { event, lines } of cards) {
      const shown = lines.slice(0, maximumLines);
      if (shown.length < lines.length) {
        abbreviated = true;
        let lastLine = shown[shown.length - 1];
        while (lastLine && ctx.measureText(lastLine + '…').width > width - 24)
          lastLine = lastLine.slice(0, -1);
        shown[shown.length - 1] = lastLine + '…';
      }
      const height = shown.length * lineHeight + 20;
      ctx.fillStyle = { course: '#eaf1ff', study: '#f0ecff', life: '#e4f5ef' }[
        event.category
      ];
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = { course: '#3272e8', study: '#8562cc', life: '#2b9b77' }[
        event.category
      ];
      ctx.fillRect(x, y, 4, height);
      ctx.fillStyle = '#182b42';
      ctx.font = `${font}px sans-serif`;
      shown.forEach((line, lineIndex) =>
        ctx.fillText(line, x + 12, y + 8 + (lineIndex + 1) * lineHeight - 3),
      );
      y += height + 12;
    }
  });
  ctx.fillStyle = '#536985';
  ctx.font = '21px sans-serif';
  ctx.fillText(
    abbreviated
      ? '空间有限，部分文字已省略；完整内容请查看应用或 ICS。 / Some text shortened; full details in app or ICS.'
      : '课程 / Course · 学习 / Study · 生活 / Life',
    65,
    1736,
  );
  const image = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.97),
  );
  if (!image) throw Error('PDF 生成失败 / PDF generation failed');
  const pdf = singlePagePdf(
    new Uint8Array(await image.arrayBuffer()),
    canvas.width,
    canvas.height,
  );
  download(pdf, `Dayline-${week[0].date}-${week[6].date}.pdf`);
}
