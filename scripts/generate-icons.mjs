import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function insideRoundedRect(x, y, left, top, width, height, radius) {
  if (x < left || y < top || x > left + width || y > top + height) return false;
  const cx = Math.min(Math.max(x, left + radius), left + width - radius);
  const cy = Math.min(Math.max(y, top + radius), top + height - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function drawIconSample(x, y, size) {
  const padding = size * 0.02;
  if (
    !insideRoundedRect(x, y, padding, padding, size - padding * 2, size - padding * 2, size * 0.23)
  ) {
    return [0, 0, 0, 0];
  }

  let color = mix([22, 163, 74], [5, 74, 45], Math.min(1, (x / size) * 0.55 + (y / size) * 0.65));

  const cx = size * 0.5;
  const cy = size * 0.49;
  const outer = size * 0.3;
  const ring = size * 0.045;
  const d = Math.hypot(x - cx, y - cy);

  if (d <= outer && d >= outer - ring) color = [255, 255, 255];
  if (Math.abs(x - cx) <= size * 0.065 && y >= size * 0.16 && y <= size * 0.24) {
    color = [255, 255, 255];
  }

  const handWidth = size * 0.042;
  if (distanceToSegment(x, y, cx, cy, cx, cy - size * 0.16) <= handWidth) color = [255, 255, 255];
  if (distanceToSegment(x, y, cx, cy, cx + size * 0.13, cy + size * 0.07) <= handWidth) {
    color = [255, 255, 255];
  }
  if (Math.hypot(x - cx, y - cy) <= size * 0.035) color = [255, 255, 255];

  return [color[0], color[1], color[2], 255];
}

function renderIcon(size) {
  const samples = size <= 48 ? 6 : 4;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const sample = drawIconSample(x + (sx + 0.5) / samples, y + (sy + 0.5) / samples, size);
          const alpha = sample[3] / 255;
          r += sample[0] * alpha;
          g += sample[1] * alpha;
          b += sample[2] * alpha;
          a += sample[3];
        }
      }
      const count = samples * samples;
      const alpha = a / count;
      const offset = (y * size + x) * 4;
      if (alpha > 0) {
        rgba[offset] = Math.round(r / (count * (alpha / 255)));
        rgba[offset + 1] = Math.round(g / (count * (alpha / 255)));
        rgba[offset + 2] = Math.round(b / (count * (alpha / 255)));
      }
      rgba[offset + 3] = Math.round(alpha);
    }
  }
  return encodePng(size, size, rgba);
}

const FONT = {
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function drawText(sample, text, startX, startY, scale, color) {
  let cursor = startX;
  for (const rawChar of text) {
    const glyph = FONT[rawChar] ?? FONT[' '];
    for (let row = 0; row < 7; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        if (glyph[row][column] !== '1') continue;
        for (let py = 0; py < scale; py += 1) {
          for (let px = 0; px < scale; px += 1) {
            const x = cursor + column * scale + px;
            const y = startY + row * scale + py;
            if (x < 0 || y < 0 || x >= sample.width || y >= sample.height) continue;
            const idx = (y * sample.width + x) * 4;
            const alpha = color[3] ?? 255;
            sample.data[idx] = color[0];
            sample.data[idx + 1] = color[1];
            sample.data[idx + 2] = color[2];
            sample.data[idx + 3] = Math.max(sample.data[idx + 3], alpha);
          }
        }
      }
    }
    cursor += 6 * scale;
  }
}

function renderPromo() {
  const width = 440;
  const height = 280;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      let color = mix(
        [4, 30, 18],
        [12, 74, 45],
        Math.min(1, (x / width) * 0.7 + (y / height) * 0.5),
      );
      const square = 36;
      if (Math.floor(x / square) % 2 === Math.floor(y / square) % 2) {
        color = mix(color, [255, 255, 255], 0.025);
      }
      if (insideRoundedRect(x, y, 16, 16, width - 32, height - 32, 20)) {
        color = mix(color, [34, 197, 94], 0.04);
      }
      data[idx] = color[0];
      data[idx + 1] = color[1];
      data[idx + 2] = color[2];
      data[idx + 3] = 255;
    }
  }

  const cx = 152;
  const cy = 154;
  const radius = 64;
  const ring = 9;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const d = Math.hypot(x - cx, y - cy);
      if (d <= radius && d >= radius - ring) {
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
      }
      if (distanceToSegment(x, y, cx, cy, cx, cy - 34) <= 7) {
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
      }
      if (distanceToSegment(x, y, cx, cy, cx + 27, cy + 15) <= 7) {
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
      }
      if (Math.hypot(x - cx, y - cy) <= 7) {
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
      }
      if (x > cx + 70) {
        const angle = Math.atan2(y - cy, x - cx);
        for (const [waveRadius, opacity] of [
          [86, 0.85],
          [110, 0.55],
          [134, 0.3],
        ]) {
          if (Math.abs(d - waveRadius) <= 3 && Math.abs(angle) < 0.55) {
            data[idx] = Math.round(255 * opacity + data[idx] * (1 - opacity));
            data[idx + 1] = Math.round(255 * opacity + data[idx + 1] * (1 - opacity));
            data[idx + 2] = Math.round(255 * opacity + data[idx + 2] * (1 - opacity));
          }
        }
      }
      if (y > 190 && x > 270) {
        const bars = 10;
        const barWidth = 10;
        const gap = 8;
        const barX = x - 286;
        const index = Math.floor(barX / (barWidth + gap));
        const within = barX % (barWidth + gap);
        if (index >= 0 && index < bars && within < barWidth) {
          const heights = [22, 38, 54, 34, 62, 44, 28, 48, 30, 18];
          const h = heights[index];
          if (y > 218 - h && y < 218) {
            data[idx] = 74;
            data[idx + 1] = 222;
            data[idx + 2] = 128;
          }
        }
      }
    }
  }

  const sample = { width, height, data };
  drawText(sample, 'CHESS CLOCK VOICE', 24, 22, 4, [255, 255, 255, 255]);
  drawText(sample, 'NEVER LOSE ON TIME', 24, 238, 3, [180, 255, 205, 255]);
  return encodePng(width, height, data);
}

const iconDir = join(root, 'public', 'icons');
const storeDir = join(root, 'store');
mkdirSync(iconDir, { recursive: true });
mkdirSync(storeDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = renderIcon(size);
  writeFileSync(join(iconDir, `icon${size}.png`), png);
  if (size === 128) writeFileSync(join(storeDir, 'icon-128.png'), png);
}

const promo = renderPromo();
writeFileSync(join(storeDir, 'promo-tile-440x280.png'), promo);
console.log('Generated icons 16/48/128 and store/promo-tile-440x280.png');
