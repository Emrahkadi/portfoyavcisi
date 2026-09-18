// Basit PNG ikon oluşturucu
// Node.js ile minimal PNG dosyaları oluşturur
// Herhangi bir external kütüphane gerektirmez

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size, color) {
  // Basit bir PNG oluştur (solid color square)
  const width = size;
  const height = size;

  // PNG header
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT chunk - pixel data
  const rawData = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 3)] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      const offset = y * (1 + width * 3) + 1 + x * 3;
      // Basit bir ev şekli çiz (basit gradient)
      const centerX = width / 2;
      const centerY = height / 2;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);

      if (dist < maxDist * 0.9) {
        // İç kısım - mavi tonları
        rawData[offset] = color.r;
        rawData[offset + 1] = color.g;
        rawData[offset + 2] = color.b;
      } else {
        // Dış kısım - şeffaf arka plan
        rawData[offset] = 255;
        rawData[offset + 1] = 255;
        rawData[offset + 2] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = computeCRC(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function computeCRC(buffer) {
  // CRC32 hesaplama
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }

  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// İkonları oluştur
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const sizes = [16, 48, 128];
const color = { r: 59, g: 130, b: 246 }; // Mavi (#3B82F6)

sizes.forEach(size => {
  const png = createPNG(size, color);
  const filename = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(filename, png);
  console.log(`✓ Created ${filename} (${png.length} bytes)`);
});

console.log('\n✅ Tüm ikonlar oluşturuldu!');
console.log('Şimdi Chrome\'da extension\'ı tekrar yükleyebilirsin.');