const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('file://' + path.resolve(__dirname, '..', 'pinmap.html'));
  await page.waitForTimeout(400);
  console.log('pdfjsLib:', await page.evaluate(() => typeof pdfjsLib));

  // load the 2-page PDF sheet
  await page.setInputFiles('#sheet-input', path.resolve(__dirname, 'testsheet.pdf'));
  await page.waitForFunction(() => window.SHEET && SHEET.w > 0, { timeout: 60000 });
  console.log('SHEET:', await page.evaluate(() => SHEET.w + 'x' + SHEET.h + ', ' + Math.round(SHEET.dataUrl.length/1024) + ' KB'));
  console.log('PAGE SELECTOR SHOWN:', await page.isVisible('#pagesel-row'));

  // add photos
  const files = ['IMG_0001.jpg', 'IMG_0002.jpg', 'IMG_0003.jpg']
    .map(f => path.resolve(__dirname, 'testphotos', f));
  await page.setInputFiles('#photo-input', files);
  await page.waitForFunction(() => document.querySelectorAll('#tray .trow').length === 3, { timeout: 20000 });
  console.log('TRAY ROWS:', await page.locator('#tray .trow').count());
  console.log('BANNER:', (await page.textContent('#armed-banner')).trim());

  // caption on photo 1 (armed photo)
  await page.locator('#tray input.cap').nth(0).fill('Influent channel, west wall');

  // click sheet 3 times -> pins 1,2,3 (auto-advance)
  const box = await page.locator('#map').boundingBox();
  await page.mouse.click(box.x + box.width/2 - 150, box.y + box.height/2 - 80);
  await page.waitForTimeout(200);
  await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
  await page.waitForTimeout(200);
  await page.mouse.click(box.x + box.width/2 + 150, box.y + box.height/2 + 80);
  await page.waitForTimeout(300);
  console.log('STATUS:', (await page.textContent('#status')).trim());
  console.log('PINS ON MAP:', await page.locator('#map .leaflet-marker-icon').count());

  // unpin photo 2, re-place it
  await page.locator('a.unpin').nth(1).click();
  await page.waitForTimeout(200);
  console.log('AFTER UNPIN STATUS:', (await page.textContent('#status')).trim());
  await page.mouse.click(box.x + box.width/2 + 40, box.y + box.height/2 - 120);
  await page.waitForTimeout(200);
  console.log('AFTER REPIN:', (await page.textContent('#status')).trim());

  // export
  await page.fill('#title-input', 'Headworks Walk');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl-btn')]);
  const outPath = path.resolve(__dirname, 'out_pinmap.html');
  await dl.saveAs(outPath);
  console.log('EXPORT:', dl.suggestedFilename(), (fs.statSync(outPath).size/1e6).toFixed(2) + ' MB');

  // open export standalone
  const page2 = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  page2.on('pageerror', e => errors.push('viewer pageerror: ' + e.message));
  await page2.goto('file://' + outPath);
  await page2.waitForTimeout(800);
  console.log('VIEWER PINS:', await page2.locator('.leaflet-marker-icon').count());
  const nums = await page2.locator('.leaflet-marker-icon div').allTextContents();
  console.log('VIEWER PIN NUMBERS:', nums.join(','));
  console.log('VIEWER HAS SHEET OVERLAY:', await page2.locator('img.leaflet-image-layer').count() === 1);
  await page2.locator('.leaflet-marker-icon').first().click();
  await page2.waitForSelector('.pm-pop', { timeout: 5000 });
  console.log('VIEWER POPUP CAP:', (await page2.textContent('.pm-pop .cap')).trim());
  const uc = await page2.locator('.pm-pop .usercap').count()
    ? (await page2.textContent('.pm-pop .usercap')).trim() : '(none)';
  console.log('VIEWER USER CAPTION:', uc);
  await page2.click('.pm-pop img');
  console.log('VIEWER LIGHTBOX:', await page2.isVisible('#pm-lightbox'));
  await page2.screenshot({ path: 'pinmap_viewer.png' });

  // page 2 of PDF (accept confirm about clearing pins)
  page.on('dialog', d => d.accept());
  await page.selectOption('#page-sel', '2');
  await page.waitForTimeout(2500);
  console.log('PAGE2 SHEET:', await page.evaluate(() => SHEET.w + 'x' + SHEET.h));
  console.log('PAGE2 PINS CLEARED:', await page.locator('#map .leaflet-marker-icon').count() === 0);

  await page.screenshot({ path: 'pinmap_gen.png' });
  const realErrors = errors.filter(e => !/net::|ERR_/i.test(e));
  console.log('ERRORS:', realErrors.length ? realErrors : 'none');
  await browser.close();
})();
