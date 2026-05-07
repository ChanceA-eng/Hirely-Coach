const fs = require('fs');
const path = require('path');

// Parse audioMap to get all filenames
const mapText = fs.readFileSync('app/data/audioMap.ts', 'utf8');
const files = [];
const re = /m\d+_[\w]+:\s*"([^"]+\.mp3)"/g;
let match;
while ((match = re.exec(mapText))) {
  files.push(match[1]);
}

console.log('📋 Generating', files.length, 'audio files...');

// Create /public/audio/ if needed
const dir = 'public/audio';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
  console.log('✅ Created', dir);
}

// Minimal valid MP3 header (silent placeholder)
const minMp3 = Buffer.from([
  0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x1f, 0x76,
  0xff, 0xfb, 0x90, 0x00, 
  ...Array(100).fill(0)
]);

// Write all files
for (const f of files) {
  const fullPath = path.join(dir, f);
  fs.writeFileSync(fullPath, minMp3);
}

console.log('✅ Created', files.length, 'placeholder MP3 files in', dir);
