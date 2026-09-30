import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'qr-codes');

const DOMAIN = process.env.SITE_DOMAIN || 'apply.hopefoundinc.com';
const TAG_PATTERN = /^test$|^(dc|md|va)-[a-z0-9]+(-[a-z0-9]+)*$/;

const tag = process.argv[2];

if (!tag) {
  console.error('Usage: node scripts/generate-qr.mjs <src-tag>');
  console.error('Examples: dc-gracechurch, md-hopebaptist, va-stmarys, test');
  console.error('Naming convention: dc-[church-slug] / md-[church-slug] / va-[church-slug]');
  process.exit(1);
}

if (!TAG_PATTERN.test(tag)) {
  console.error(`"${tag}" doesn't match the naming convention.`);
  console.error('Use dc-, md-, or va- followed by a lowercase, hyphenated church slug (e.g. dc-gracechurch), or "test".');
  process.exit(1);
}

const url = `https://${DOMAIN}/?src=${tag}`;
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${tag}.png`);

await QRCode.toFile(outPath, url, { width: 600, margin: 2 });

console.log(`URL:      ${url}`);
console.log(`QR code:  ${outPath}`);
