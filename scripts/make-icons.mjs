// Generates public/icon-192.png and icon-512.png (black square, white rounded vertical "phone" bar) with no dependencies.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}

function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  const w = size * 0.32, h = size * 0.58, r = w * 0.2
  const x0 = (size - w) / 2, y0 = (size - h) / 2
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const dx = Math.max(x0 + r - x, 0, x - (x0 + w - r)), dy = Math.max(y0 + r - y, 0, y - (y0 + h - r))
      const inside = x >= x0 && x <= x0 + w && y >= y0 && y <= y0 + h && dx * dx + dy * dy <= r * r
      const v = inside ? 255 : 0
      const o = y * (size * 3 + 1) + 1 + x * 3
      raw[o] = raw[o + 1] = raw[o + 2] = v
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

mkdirSync('public', { recursive: true })
for (const s of [192, 512]) writeFileSync(`public/icon-${s}.png`, png(s))
