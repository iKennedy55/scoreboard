const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const filePath = path.resolve(__dirname, 'propuesta_scoreboard.html');

    await page.setViewport({ width: 816, height: 800, deviceScaleFactor: 2 });
    await page.goto('file:///' + filePath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

    const layout = await page.evaluate(() => {
        const cover = document.querySelector('.cover').getBoundingClientRect();
        const pages = Array.from(document.querySelectorAll('.page')).map(p => p.getBoundingClientRect());
        const body = document.body.getBoundingClientRect();
        const html = document.documentElement.getBoundingClientRect();

        return {
            cover: { top: cover.top, bottom: cover.bottom, height: cover.height },
            pages: pages.map((p, i) => ({ i, top: p.top, bottom: p.bottom, height: p.height })),
            body: { top: body.top, bottom: body.bottom, height: body.height },
            html: { top: html.top, bottom: html.bottom, height: html.height }
        };
    });

    console.log(JSON.stringify(layout, null, 2));
    await browser.close();
})();
