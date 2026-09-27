// Generates the PNG app icons from public/icons/favicon.svg
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync('public/icons/favicon.svg');
const maskable = Buffer.from(
  svg.toString().replace('rx="112"', 'rx="0"').replace('r="150"', 'r="118"').replace('M322 190 L284 284 L190 322 L228 228 Z', 'M308 204 L278 278 L204 308 L234 234 Z')
);

const out = [
  [svg, 192, 'icon-192.png'],
  [svg, 512, 'icon-512.png'],
  [maskable, 512, 'icon-maskable-512.png'],
  [maskable, 180, 'apple-touch-icon.png']
];
for (const [src, size, name] of out) {
  await sharp(src).resize(size, size).png().toFile(`public/icons/${name}`);
  console.log('wrote', name);
}
