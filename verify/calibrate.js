// calibrate.js - Run this against a known-good URL and a known-404 URL
// to see their page metrics, then set thresholds in config.js accordingly.
//
// Usage:
//   node calibrate.js /                    # known-good page
//   node calibrate.js /this-does-not-exist # 404 page
//   node calibrate.js / /missing /login    # multiple URLs

import { chromium } from 'playwright';
import { CONFIG } from './config.js';

async function inspectUrl(browser, urlPath) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    await page.goto(CONFIG.BASE_URL + urlPath, {
      waitUntil: CONFIG.NAV_WAIT,
      timeout: CONFIG.PAGE_TIMEOUT,
    });
    await page.waitForTimeout(1500); // extra time, calibration runs are slow on purpose

    const metrics = await page.evaluate(() => {
      const body = document.body;
      const text = (body.innerText || '').trim();
      return {
        text_length: text.length,
        text_preview: text.slice(0, 100),
        element_count: body.querySelectorAll('*').length,
        body_html_length: body.innerHTML.length,
        has_header: !!document.querySelector('header, [role="banner"], nav'),
        has_footer: !!document.querySelector('footer, [role="contentinfo"]'),
        has_main: !!document.querySelector('main, [role="main"]'),
        root_children: document.querySelector('#root')?.children.length ?? 0,
        title: document.title,
      };
    });

    console.log(`\n📊 ${urlPath}`);
    console.log(`   final URL:       ${page.url()}`);
    console.log(`   title:           ${metrics.title}`);
    console.log(`   text length:     ${metrics.text_length}`);
    console.log(`   elements:        ${metrics.element_count}`);
    console.log(`   body HTML size:  ${metrics.body_html_length}`);
    console.log(`   <header>:        ${metrics.has_header ? '✓' : '✗'}`);
    console.log(`   <footer>:        ${metrics.has_footer ? '✓' : '✗'}`);
    console.log(`   <main>:          ${metrics.has_main ? '✓' : '✗'}`);
    console.log(`   #root children:  ${metrics.root_children}`);
    if (metrics.text_preview) {
      console.log(`   text preview:    "${metrics.text_preview}${metrics.text_length > 100 ? '…' : ''}"`);
    }
  } catch (err) {
    console.log(`\n💥 ${urlPath} — error: ${err.message.split('\n')[0]}`);
  } finally {
    await context.close();
  }
}

async function main() {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.log('Usage: node calibrate.js <path> [<path> ...]');
    console.log('Example: node calibrate.js / /this-route-does-not-exist /login');
    process.exit(1);
  }

  console.log(`Calibrating against ${CONFIG.BASE_URL}`);

  const browser = await chromium.launch({ headless: true });
  for (const url of urls) {
    await inspectUrl(browser, url);
  }
  await browser.close();

  console.log('\n💡 Tip: set BLANK_PAGE_TEXT_THRESHOLD and BLANK_PAGE_ELEMENT_THRESHOLD');
  console.log('   in config.js to values BETWEEN the 404 metrics and the real page metrics.\n');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
