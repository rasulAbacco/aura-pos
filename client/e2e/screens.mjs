// Visual smoke run: landing page (mid-animation and settled), then the demo owner's key screens.
// Usage: OUT=<dir> node e2e/screens.mjs   (needs the server and client running and the demo seed loaded)
import { chromium } from 'playwright-core';
const OUT = process.env.OUT ?? '.';
const BASE = process.env.BASE ?? 'http://localhost:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/google/chrome/chrome', args: ['--no-sandbox'] });
const errors = [];
const watch = (p, tag) => {
  p.on('pageerror', (e) => errors.push(`${tag}: ${e}`));
  p.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400 && !r.url().includes('/auth/refresh')) errors.push(`${tag}: ${r.status()} ${r.url()}`); });
};

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(page, 'desktop');
await page.goto(`${BASE}/`); await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/home-printing.png` });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/home-settled.png` });
await page.screenshot({ path: `${OUT}/home-full.png`, fullPage: true });
await page.getByRole('tab', { name: 'Profit & loss' }).click(); await page.waitForTimeout(500);
await page.locator('#feature-panel').screenshot({ path: `${OUT}/home-tab.png` });

await page.goto(`${BASE}/login`);
await page.getByLabel('Email').fill('owner@auraluxe.demo');
await page.getByLabel('Password').fill('DemoOwner-2026!');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('**/app'); await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/app-dashboard.png` });
await page.goto(`${BASE}/app/pos`); await page.waitForTimeout(1200);
await page.getByLabel('Client').selectOption({ label: 'Pooja Sharma · +919886012345' });
await page.getByRole('button', { name: /Moroccanoil Deep Spa Therapy/ }).click();
await page.getByLabel('Stylist').first().selectOption({ label: 'Vikram Mehta' });
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/app-pos.png` });
await page.getByRole('button', { name: /^Charge/ }).click(); await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/app-receipt.png` });
await page.keyboard.press('Escape');
for (const p of ['pnl', 'appointments', 'clients', 'catalog', 'inventory', 'staff', 'invoices', 'expenses', 'reports', 'settings', 'subscription', 'memberships']) {
  await page.goto(`${BASE}/app/${p}`); await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/app-${p}.png` });
}

const a = await browser.newPage({ viewport: { width: 1280, height: 800 } });
watch(a, 'platform');
await a.goto(`${BASE}/platform`); await a.waitForTimeout(800);
await a.getByLabel('Email').fill(process.env.ADMIN_EMAIL ?? 'admin@aura.local');
await a.getByLabel('Password').fill(process.env.ADMIN_PASSWORD ?? 'ChangeMe-Admin-2026!');
await a.getByRole('button', { name: 'Sign in' }).click(); await a.waitForTimeout(1200);
for (const t of ['Overview', 'Salons', 'Plans', 'Payments', 'Webhooks', 'Enquiries']) {
  await a.getByRole('tab', { name: t }).click(); await a.waitForTimeout(700);
  await a.screenshot({ path: `${OUT}/platform-${t.toLowerCase()}.png` });
}

const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
watch(m, 'mobile');
await m.goto(`${BASE}/`); await m.waitForTimeout(4500);
await m.screenshot({ path: `${OUT}/mobile-home.png` });
console.log(JSON.stringify({ errors }, null, 1));
await browser.close();
