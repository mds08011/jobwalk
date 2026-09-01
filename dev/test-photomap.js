const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await page.waitForTimeout(400);

  const files = ['IMG_0001.jpg', 'IMG_0002.jpg', 'IMG_0003.jpg', 'IMG_NOGPS.jpg']
    .map(f => path.resolve(__dirname, 'testphotos', f));
  await page.setInputFiles('#file-input', files);
  await page.waitForFunction(() => document.querySelectorAll('#plist .row').length === 4, { timeout: 20000 });

  console.log('STATUS:', (await page.textContent('#status')).trim());
  console.log('PREVIEW MARKERS:', await page.locator('#map .leaflet-marker-icon').count());
  console.log('LIST ROWS:', await page.locator('#plist .row').count());
  console.log('NO-GPS BADGES:', await page.locator('#plist .nog').count());

  // type a caption on photo 2
  await page.locator('#plist input.cap').nth(1).fill('Existing 12-inch DIP at sta 4+50');
  await page.fill('#title-input', 'Test Job Walk 2026-08-30');

  // --- map export ---
  let [dl] = await Promise.all([page.waitForEvent('download'), page.click('#dl-btn')]);
  const mapPath = path.resolve(__dirname, 'out_map.html');
  await dl.saveAs(mapPath);
  console.log('MAP DL:', dl.suggestedFilename(), (fs.statSync(mapPath).size / 1e6).toFixed(2) + ' MB');

  // --- photo log export ---
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#log-btn')]);
  const logPath = path.resolve(__dirname, 'out_log.html');
  await dl.saveAs(logPath);
  console.log('LOG DL:', dl.suggestedFilename(), (fs.statSync(logPath).size / 1e6).toFixed(2) + ' MB');

  // --- KMZ export ---
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('#kmz-btn')]);
  const kmzPath = path.resolve(__dirname, 'out.kmz');
  await dl.saveAs(kmzPath);
  console.log('KMZ DL:', dl.suggestedFilename(), (fs.statSync(kmzPath).size / 1e6).toFixed(2) + ' MB');

  // --- measure tool smoke test on the generator preview ---
  await page.click('.pm-measure-ctl a:first-child');
  const box = await page.locator('#map').boundingBox();
  await page.mouse.click(box.x + box.width / 2 - 100, box.y + box.height / 2);
  await page.mouse.click(box.x + box.width / 2 + 100, box.y + box.height / 2);
  await page.mouse.click(box.x + box.width / 2 + 100, box.y + box.height / 2 - 120);
  await page.waitForTimeout(300);
  const mtip = await page.locator('.pm-mtip').first().textContent();
  console.log('MEASURE READOUT:', mtip.trim().replace(/\n/g, ' | '));

  // --- open exported map ---
  const page2 = await browser.newPage();
  page2.on('pageerror', e => errors.push('map pageerror: ' + e.message));
  await page2.goto('file://' + mapPath);
  await page2.waitForTimeout(1000);
  console.log('EXPORTED MAP MARKERS:', await page2.locator('.leaflet-marker-icon').count());
  const nums = await page2.locator('.leaflet-marker-icon div').allTextContents();
  console.log('MARKER NUMBERS:', nums.join(','));
  await page2.locator('.leaflet-marker-icon').nth(1).click();
  await page2.waitForSelector('.pm-pop', { timeout: 5000 });
  console.log('POPUP CAPTION:', (await page2.textContent('.pm-pop .cap')).trim());
  const ucap = await page2.locator('.pm-pop .usercap').count()
    ? (await page2.textContent('.pm-pop .usercap')).trim() : '(none)';
  console.log('POPUP USER CAPTION:', ucap);
  console.log('MAP HAS MEASURE BTN:', await page2.locator('.pm-measure-ctl').count() === 1);
  console.log('MAP HEADER:', (await page2.textContent('.pm-hdr')).trim());

  // --- open exported photo log ---
  const page3 = await browser.newPage();
  page3.on('pageerror', e => errors.push('log pageerror: ' + e.message));
  await page3.goto('file://' + logPath);
  await page3.waitForTimeout(400);
  console.log('LOG ENTRIES:', await page3.locator('.entry').count());
  console.log('LOG IMGS:', await page3.locator('.entry img').count());
  console.log('LOG TEXT SAMPLE:', (await page3.locator('.entry').nth(1).textContent()).trim().replace(/\s+/g, ' '));
  console.log('LOG NO-GPS ENTRY:', (await page3.locator('.entry').nth(3).textContent()).includes('no GPS tag'));
  console.log('LOG CAPTION EDITABLE:', await page3.locator('.entry .capline[contenteditable=true]').count() === 4);
  console.log('LOG H1:', (await page3.textContent('h1')).trim());

  const realErrors = errors.filter(e => !/tile|arcgisonline|openstreetmap|net::|ERR_/i.test(e));
  console.log('ERRORS:', realErrors.length ? realErrors : 'none');
  await browser.close();
})();
