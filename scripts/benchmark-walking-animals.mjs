import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

// Run against the exported /timer/ site; not a Next runtime server.
const browser = await chromium.launch();
const results = [];
try {
  for (const id of ['dog', 'cat']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('http://127.0.0.1:17832/timer/');
    await page.getByRole('button', { name: '친구', exact: true }).click();
    await page.getByRole('button', { name: id === 'dog' ? '강아지' : '고양이', exact: true }).click();
    await page.getByRole('button', { name: '출발!', exact: true }).click();
    await page.locator('.traveler-body [data-animal-walk-sprite]').waitFor({ state: 'visible' });
    await page.waitForTimeout(1200);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Performance.enable');
    const before = await cdp.send('Performance.getMetrics');
    const samples = await page.evaluate(() => new Promise(resolve => {
      const intervals = []; let previous = 0; const start = performance.now();
      function frame(now) { if (previous) intervals.push(now - previous); previous = now;
        if (now - start < 6000) requestAnimationFrame(frame); else resolve(intervals); }
      requestAnimationFrame(frame);
    }));
    const after = await cdp.send('Performance.getMetrics');
    const value = (r, key) => r.metrics.find(m => m.name === key).value;
    const sorted = samples.toSorted((a,b) => a-b);
    results.push({ id, frames: samples.length, averageMs: samples.reduce((a,b)=>a+b)/samples.length,
      p95Ms: sorted[Math.floor(sorted.length*.95)], over33ms: samples.filter(x=>x>33.4).length,
      taskSeconds: value(after,'TaskDuration')-value(before,'TaskDuration'),
      scriptSeconds: value(after,'ScriptDuration')-value(before,'ScriptDuration') });
    await page.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify(results, null, 2));
if (process.argv[2]) await fs.writeFile(process.argv[2], JSON.stringify(results,null,2)+'\n');
