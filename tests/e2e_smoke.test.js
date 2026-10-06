const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

test('Playwright Smoke Tests - Desktop (1280x800) & Mobile (390x844)', async (t) => {
    let playwright;
    try {
        playwright = require('playwright');
    } catch (e) {
        assert.fail('Playwright module not found. Please install playwright.');
    }

    const { chromium } = playwright;
    const htmlPath = 'file://' + path.join(process.cwd(), 'game', 'index.html');
    const artifactsDir = path.join(process.cwd(), 'artifacts');
    if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
    }

    const browser = await chromium.launch({ headless: true });

    try {
        // Desktop test
        {
            const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
            const errors = [];
            page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
            page.on('pageerror', err => errors.push(err.message));

            await page.goto(htmlPath);
            await page.fill('#player-name', '桌機玩家');
            await page.click('#start-btn');
            await page.waitForSelector('#game-screen:not(.hidden)');

            await page.keyboard.press('ArrowRight');
            await page.waitForTimeout(150);
            await page.keyboard.press('ArrowRight');
            await page.waitForTimeout(150);
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(150);
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(150);
            await page.keyboard.press('ArrowRight');
            await page.waitForTimeout(150);

            const timerText = await page.textContent('#timer');
            assert.notStrictEqual(timerText, '00:00');
            assert.strictEqual(errors.length, 0, `Desktop console errors found: ${errors.join(', ')}`);

            const desktopScreenshot = path.join(artifactsDir, 'desktop_smoke.png');
            await page.screenshot({ path: desktopScreenshot });
            assert.strictEqual(fs.existsSync(desktopScreenshot), true);
            await page.close();
        }

        // Mobile test
        {
            const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
            const errors = [];
            page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
            page.on('pageerror', err => errors.push(err.message));

            await page.goto(htmlPath);
            await page.fill('#player-name', '手機玩家');
            await page.click('#start-btn');
            await page.waitForSelector('#game-screen:not(.hidden)');

            const btnRight = page.locator('#btn-right');
            const btnDown = page.locator('#btn-down');

            await btnRight.click();
            await page.waitForTimeout(150);
            await btnRight.click();
            await page.waitForTimeout(150);
            await btnDown.click();
            await page.waitForTimeout(150);
            await btnDown.click();
            await page.waitForTimeout(150);
            await btnRight.click();
            await page.waitForTimeout(150);

            const timerText = await page.textContent('#timer');
            assert.notStrictEqual(timerText, '00:00');
            assert.strictEqual(errors.length, 0, `Mobile console errors found: ${errors.join(', ')}`);

            const mobileScreenshot = path.join(artifactsDir, 'mobile_smoke.png');
            await page.screenshot({ path: mobileScreenshot });
            assert.strictEqual(fs.existsSync(mobileScreenshot), true);
            await page.close();
        }
    } finally {
        await browser.close();
    }
});
