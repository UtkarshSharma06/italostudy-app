import fs from 'fs';

const buf = fs.readFileSync('public/pwa-logo.png');
// PNG dimensions are at offset 16 (width) and 20 (height), 4 bytes each big-endian
const width = buf.readInt32BE(16);
const height = buf.readInt32BE(20);

console.log(`Dimensions: ${width}x${height}`);
if (width !== height) {
    console.log('WARNING: Image is NOT square!');
}
