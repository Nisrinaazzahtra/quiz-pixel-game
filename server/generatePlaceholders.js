const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create directories
const baseDir = path.join(__dirname, '..', 'public', 'assets', 'images');
const maleDir = path.join(baseDir, 'characters', 'male');
const femaleDir = path.join(baseDir, 'characters', 'female');
const bgDir = path.join(baseDir, 'backgrounds');
const iconDir = path.join(baseDir, 'icons');

[maleDir, femaleDir, bgDir, iconDir].forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
});

// Minimal PNG encoder in pure Node.js
function createPNG(width, height, pixelData) {
  // pixelData: Buffer of width * height * 4 (RGBA)
  const scanlines = [];
  for (let y = 0; y < height; y++) {
    scanlines.push(0); // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      scanlines.push(pixelData[idx], pixelData[idx + 1], pixelData[idx + 2], pixelData[idx + 3]);
    }
  }

  const rawData = Buffer.from(scanlines);
  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Simple CRC32 for PNG chunks
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crc ^ buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

// Generate pixel character (16x16 pixel art, scaled up to 64x64)
const malePalettes = [
  ['#2c3e50', '#3498db', '#ecf0f1', '#e74c3c'],
  ['#1b4f72', '#5dade2', '#fdedec', '#f39c12'],
  ['#145a32', '#52be80', '#e8f8f5', '#9b59b6'],
  ['#641e16', '#e74c3c', '#fbeee6', '#1abc9c'],
  ['#4a235a', '#bb8fce', '#f4ecf7', '#f1c40f'],
  ['#1c2833', '#85929e', '#eaeded', '#e67e22'],
  ['#7d6608', '#f1c40f', '#fef9e7', '#2980b9'],
  ['#212f3d', '#2e4053', '#d5dbdb', '#27ae60']
];

const femalePalettes = [
  ['#78281f', '#e74c3c', '#fadbd8', '#9b59b6'],
  ['#512e5f', '#af7ac5', '#ebdef0', '#f39c12'],
  ['#154360', '#5499c7', '#d4e6f1', '#e91e63'],
  ['#0e6251', '#48c9b0', '#d1f2eb', '#ff5722'],
  ['#7b7d7d', '#bdc3c7', '#f2f3f4', '#e91e63'],
  ['#6e2c00', '#dc7633', '#edbb99', '#3498db'],
  ['#1b2631', '#f39c12', '#fef5e7', '#e74c3c'],
  ['#4d5656', '#e91e63', '#fce4ec', '#00bcd4']
];

function hexToRgba(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 255];
}

function drawSprite(width, height, isFemale, index) {
  const buf = Buffer.alloc(width * height * 4, 0); // Transparent RGBA
  const palettes = isFemale ? femalePalettes : malePalettes;
  const pal = palettes[index % palettes.length];
  const hairColor = hexToRgba(pal[0]);
  const clothesColor = hexToRgba(pal[1]);
  const skinColor = hexToRgba('#ffdbac');
  const accentColor = hexToRgba(pal[3]);
  const eyeColor = hexToRgba('#222222');

  function setPixel(x, y, color) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const base = (y * width + x) * 4;
    buf[base] = color[0];
    buf[base + 1] = color[1];
    buf[base + 2] = color[2];
    buf[base + 3] = color[3];
  }

  // Draw 16x16 grid scaled to width x height
  const scale = width / 16;
  function p(gx, gy, color) {
    for (let sy = 0; sy < scale; sy++) {
      for (let sx = 0; sx < scale; sx++) {
        setPixel(gx * scale + sx, gy * scale + sy, color);
      }
    }
  }

  // Hair
  for (let x = 4; x <= 11; x++) p(x, 2, hairColor);
  for (let x = 3; x <= 12; x++) p(x, 3, hairColor);
  p(3, 4, hairColor); p(12, 4, hairColor);
  if (isFemale) {
    // Long hair sides
    p(2, 5, hairColor); p(2, 6, hairColor); p(2, 7, hairColor); p(2, 8, hairColor);
    p(13, 5, hairColor); p(13, 6, hairColor); p(13, 7, hairColor); p(13, 8, hairColor);
  }

  // Face
  for (let y = 4; y <= 8; y++) {
    for (let x = 4; x <= 11; x++) {
      p(x, y, skinColor);
    }
  }
  // Eyes
  p(5, 5, eyeColor);
  p(10, 5, eyeColor);
  // Mouth / smile
  p(7, 7, [220, 100, 100, 255]);
  p(8, 7, [220, 100, 100, 255]);

  // Body / Clothes
  for (let y = 9; y <= 13; y++) {
    for (let x = 4; x <= 11; x++) {
      p(x, y, clothesColor);
    }
  }
  // Accent badge / belt
  p(7, 10, accentColor);
  p(8, 10, accentColor);
  for (let x = 4; x <= 11; x++) p(x, 12, accentColor);

  // Legs / Boots
  for (let y = 14; y <= 15; y++) {
    p(5, y, [50, 50, 50, 255]);
    p(6, y, [50, 50, 50, 255]);
    p(9, y, [50, 50, 50, 255]);
    p(10, y, [50, 50, 50, 255]);
  }

  return buf;
}

// Generate 20 male and 20 female placeholder sprites
for (let i = 1; i <= 20; i++) {
  const maleData = drawSprite(64, 64, false, i);
  const malePng = createPNG(64, 64, maleData);
  fs.writeFileSync(path.join(maleDir, `male_${i}.png`), malePng);

  const femaleData = drawSprite(64, 64, true, i);
  const femalePng = createPNG(64, 64, femaleData);
  fs.writeFileSync(path.join(femaleDir, `female_${i}.png`), femalePng);
}

console.log('✅ Generated 20 male and 20 female character placeholder PNGs!');
