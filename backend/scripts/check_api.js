// scripts/check_api.js
// Lightweight API smoke check: /health and optional basic endpoints.
// Usage: node scripts/check_api.js [baseURL]
// baseURL defaults to http://localhost:${PORT||3001}

import http from 'node:http';
import https from 'node:https';

const base = process.argv[2] || process.env.API_BASE || `http://localhost:${process.env.PORT || 3001}`;

const endpoints = [
  { path: '/health', expectOk: true, critical: true },
  // Uncomment to extend checks that hit DB-protected endpoints:
  // { path: '/api/clients', expectOk: true, critical: false },
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const json = JSON.parse(data || '{}');
          resolve({ status: res.statusCode, json });
        } catch (e) {
          reject(new Error(`Invalid JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log(`Base URL: ${base}`);
  let failed = 0;

  for (const ep of endpoints) {
    const url = `${base}${ep.path}`;
    try {
      const { status, json } = await fetchJson(url);
      const okStatus = status >= 200 && status < 300;
      const okFlag = ep.expectOk ? json?.ok === true : true;
      if (okStatus && okFlag) {
        console.log(`OK   ${ep.path} (status ${status})`);
      } else {
        failed++;
        console.error(`FAIL ${ep.path} (status ${status}, body: ${JSON.stringify(json)})`);
      }
    } catch (e) {
      failed++;
      console.error(`ERR  ${ep.path}: ${e.message}`);
    }
  }

  if (failed) {
    console.error(`\nSmoke check failed: ${failed} endpoint(s).`);
    process.exit(1);
  } else {
    console.log('\nSmoke check passed.');
  }
}

main().catch((e) => {
  console.error('Smoke check crashed:', e.message);
  process.exit(1);
});
