export const key = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parse = (s) => new Date(s + 'T12:00:00');
export function validDate(s) {
  return (
    typeof s === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !isNaN(parse(s)) &&
    key(parse(s)) === s
  );
}
export const minutes = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
export function validate(e) {
  if (!e || typeof e.title !== 'string' || !e.title.trim() || e.title.length > 100)
    throw Error('请填写名称 / Please enter a title');
  if (!validDate(e.date) || !['course', 'study', 'life'].includes(e.category))
    throw Error('日期或类型无效 / Invalid date or category');
  if (
    ![e.start, e.end].every(
      (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s),
    ) ||
    e.end <= e.start
  )
    throw Error('结束时间必须晚于开始时间 / End must be after start');
  if (
    typeof e.repeat !== 'boolean' ||
    (e.repeat && (!validDate(e.until) || e.until < e.date))
  )
    throw Error('请选择有效的重复截止日期 / Choose a valid repeat end date');
  if (
    typeof e.location !== 'string' ||
    e.location.length > 100 ||
    typeof e.notes !== 'string' ||
    e.notes.length > 500
  )
    throw Error('地点或备注过长 / Location or notes too long');
  return e;
}
export function occurs(e, date) {
  return (
    e.date === date ||
    (e.repeat &&
      date >= e.date &&
      date <= e.until &&
      parse(date).getDay() === parse(e.date).getDay())
  );
}
export function overlaps(a, b) {
  if (a.id === b.id || a.start >= b.end || b.start >= a.end) return false;
  const start = a.date > b.date ? a.date : b.date;
  const end = [a.repeat ? a.until : a.date, b.repeat ? b.until : b.date].sort()[0];
  if (start > end) return false;
  let d = parse(start);
  for (let i = 0; i < 7 && key(d) <= end; i++, d.setDate(d.getDate() + 1)) {
    if (occurs(a, key(d)) && occurs(b, key(d))) return true;
  }
  return false;
}

export function weekDates(selected) {
  const start = parse(selected);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return key(d);
  });
}
// Connected overlap groups share columns; touching endpoints do not overlap.
export function layoutEvents(items) {
  const sorted = [...items].sort(
    (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end),
  );
  const result = [];
  let group = [],
    end = -1;
  function flush() {
    const lanes = [];
    for (const event of group) {
      let lane = lanes.findIndex((n) => n <= minutes(event.start));
      if (lane < 0) lane = lanes.length;
      lanes[lane] = minutes(event.end);
      result.push({ event, lane, group: group[0].id });
    }
    const count = lanes.length;
    for (const item of result) if (item.group === group[0]?.id) item.columns = count;
    group = [];
  }
  for (const event of sorted) {
    if (group.length && minutes(event.start) >= end) flush();
    if (!group.length) end = -1;
    group.push(event);
    end = Math.max(end, minutes(event.end));
  }
  if (group.length) flush();
  return result;
}
const icsEscape = (s) =>
  String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
function foldLine(line) {
  const encoder = new TextEncoder();
  let output = '',
    part = '',
    length = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (length + size > 75) {
      output += part + '\r\n';
      part = ' ';
      length = 1;
    }
    part += char;
    length += size;
  }
  return output + part;
}
export function exportWeek(events, selected, now = new Date()) {
  const dates = weekDates(selected),
    stamp = now
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dayline//Weekly Planner//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:每周行程 / Weekly schedule',
  ];
  for (const date of dates)
    for (const e of events
      .filter((e) => occurs(e, date))
      .sort((a, b) => a.start.localeCompare(b.start))) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${icsEscape(e.id)}-${date}@dayline.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${date.replace(/-/g, '')}T${e.start.replace(':', '')}00`,
        `DTEND:${date.replace(/-/g, '')}T${e.end.replace(':', '')}00`,
        `SUMMARY:${icsEscape(e.title)}`,
        `LOCATION:${icsEscape(e.location)}`,
        `DESCRIPTION:${icsEscape(e.notes)}`,
        'END:VEVENT',
      );
    }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
