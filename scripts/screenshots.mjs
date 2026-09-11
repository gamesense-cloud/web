#!/usr/bin/env node
/**
 * Screenshots every screen, as both accounts, at several widths.
 *
 *   npm run build && npm start          # in one terminal
 *   npm run shots                       # in another
 *
 * Output lands in shots/ (gitignored). It also reports horizontal overflow and
 * any console or page error, which is how layout regressions get caught
 * without opening a browser by hand.
 *
 * Playwright's own chromium download is blocked on some networks, so this
 * drives an installed Chrome by default. Point CHROME_PATH somewhere else, or
 * set CHROME_PATH=bundled to use playwright's copy if you have it.
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE ?? 'http://localhost:4000';
const PASSWORD = process.env.SHOT_PASSWORD ?? 'demo-password';
const CHROME = process.env.CHROME_PATH
  ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const MEMBER_PAGES = [
  ['overview', '/'],
  ['builds', '/builds'],
  ['hwid', '/hwid'],
  ['tickets', '/tickets'],
  ['activity', '/activity'],
  ['settings', '/settings'],
];
const ADMIN_PAGES = [
  ['overview', '/'],
  ['builds', '/builds'],
  ['members', '/members'],
  ['resets', '/resets'],
  ['tickets', '/tickets'],
  ['activity', '/activity'],
];

fs.mkdirSync('shots', { recursive: true });

const launch = CHROME === 'bundled' ? {} : { executablePath: CHROME };
const browser = await chromium.launch(launch);

let problems = 0;

async function run(who, pages, width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: new RegExp(`^${who}`) }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });

  for (const [name, path] of pages) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const file = `shots/${who}-${width}-${name}.png`;
    await page.screenshot({ path: file, fullPage: true });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    const flag = overflow > 1 ? `  OVERFLOW ${overflow}px` : '';
    if (overflow > 1) problems += 1;
    console.log(`  ${file.padEnd(38)}${flag}`);
  }

  if (errors.length) {
    problems += errors.length;
    console.log(`  errors as ${who}:\n    ${[...new Set(errors)].join('\n    ')}`);
  }
  await page.close();
}

console.log(`shooting ${BASE}`);
await run('member', MEMBER_PAGES);
await run('admin', ADMIN_PAGES);
for (const width of [1024, 768, 400]) await run('admin', [['overview', '/']], width);

await browser.close();
console.log(problems ? `\n${problems} problem(s) found` : '\nno overflow, no errors');
process.exit(problems ? 1 : 0);
