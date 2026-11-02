// Package a browser-rendered JPEG as one landscape A4 PDF page.
// Byte offsets are calculated from Uint8Array lengths, not string lengths.
export function singlePagePdf(jpeg, width, height) {
  if (!(jpeg instanceof Uint8Array) || jpeg[0] !== 255 || jpeg[1] !== 216) {
    throw new Error('无效的日历图像 / Invalid calendar image');
  }
  const encode = (text) => new TextEncoder().encode(text);
  const chunks = [encode('%PDF-1.4\n')];
  const offsets = [0];
  let length = chunks[0].length;
  function append(bytes) {
    chunks.push(bytes);
    length += bytes.length;
  }
  function object(id, head, stream) {
    offsets[id] = length;
    append(encode(`${id} 0 obj\n${head}`));
    if (stream) {
      append(encode('\nstream\n'));
      append(stream);
      append(encode('\nendstream'));
    }
    append(encode('\nendobj\n'));
  }
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(
    3,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Calendar 4 0 R >> >> /Contents 5 0 R >>',
  );
  object(
    4,
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`,
    jpeg,
  );
  const commands = encode('q\n841.89 0 0 595.28 0 0 cm\n/Calendar Do\nQ');
  object(5, `<< /Length ${commands.length} >>`, commands);
  const xref = length;
  append(encode('xref\n0 6\n0000000000 65535 f \n'));
  for (let id = 1; id <= 5; id++) {
    append(encode(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`));
  }
  append(encode(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return new Blob(chunks, { type: 'application/pdf' });
}
