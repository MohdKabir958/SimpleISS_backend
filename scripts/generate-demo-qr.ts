/**
 * Generates a PNG QR code for the seeded "demo" restaurant customer flow.
 *
 * Usage:
 *   DEMO_QR_BASE_URL=https://your-app.web.app npm run qr:demo
 *   npm run qr:demo
 *
 * Default URL targets local Flutter web (port 8080) + seed table UUID.
 */
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

// Run from `backend/` (npm run qr:demo)
const backendRoot = path.join(process.cwd());

/** Matches prisma/seed.ts DEMO_TABLE_ID */
const DEMO_TABLE_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_SLUG = 'demo';

function buildCustomerUrl(base: string): string {
  const u = base.replace(/\/$/, '');
  return `${u}/r/${DEMO_SLUG}/t/${DEMO_TABLE_ID}`;
}

async function main(): Promise<void> {
  const base =
    process.env.DEMO_QR_BASE_URL ||
    process.env.QR_BASE_URL ||
    'http://localhost:8080';
  const url = buildCustomerUrl(base);

  const outDir = path.join(backendRoot, 'docs');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outFile = path.join(outDir, 'demo-customer-qr.png');

  await QRCode.toFile(outFile, url, {
    type: 'png',
    width: 512,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  console.log('✅ QR saved:', outFile);
  console.log('   Encodes URL:', url);
  console.log('');
  console.log('   Open this URL in a browser (Flutter web) or scan the PNG to test the customer flow.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
