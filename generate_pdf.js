const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const PAGE_W = 816;
    // Escala x3 para alta resolución
    const SCALE = 3;
    await page.setViewport({ width: PAGE_W, height: 1000, deviceScaleFactor: SCALE });

    const filePath = path.resolve(__dirname, 'propuesta_scoreboard.html');
    await page.goto('file:///' + filePath.replace(/\\/g, '/'), {
        waitUntil: 'networkidle0',
        timeout: 30000
    });

    await page.addStyleTag({
        content: `
            .cover { height: auto !important; min-height: auto !important; }
            .page  { min-height: auto !important; height: auto !important; }
        `
    });

    await page.evaluate(() => {
        document.querySelectorAll('*').forEach(el => {
            const cs = getComputedStyle(el);
            if (cs.position === 'fixed' || cs.position === 'sticky') {
                el.style.setProperty('position', 'relative', 'important');
            }
        });
        document.querySelectorAll('.page').forEach(p => {
            p.style.boxShadow = 'none';
            p.style.maxWidth = '100%';
        });
    });

    // Altura del contenido en pixeles CSS
    const totalHeightCSS = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log('Altura total del documento en px:', totalHeightCSS);

    const pdfDoc = await PDFDocument.create();

    // 1px CSS a 96dpi = 0.75 points en PDF (72dpi)
    const pxToPt = 0.75;
    const pdfW = PAGE_W * pxToPt;
    const pdfH = totalHeightCSS * pxToPt;

    // Crear la hoja unica
    const pg = pdfDoc.addPage([pdfW, pdfH]);

    // Recorrer la hoja tomando screenshots y montando (evita limites de hardware de texturas gigantes)
    const chunkHeightCSS = 2000;
    let currentY = 0;

    console.log('Iniciando captura de texturas...');

    while (currentY < totalHeightCSS) {
        let drawHeightCSS = chunkHeightCSS;
        if (currentY + chunkHeightCSS > totalHeightCSS) {
            drawHeightCSS = totalHeightCSS - currentY;
        }

        const imgBuffer = await page.screenshot({
            type: 'png',
            clip: {
                x: 0,
                y: currentY,
                width: PAGE_W,
                height: drawHeightCSS
            }
        });

        const pdfImage = await pdfDoc.embedPng(imgBuffer);

        // Coordenada Y en PDF inicia en 0 (abajo) y sube, así que restamos desde pdfH
        const drawY = pdfH - (currentY * pxToPt) - (drawHeightCSS * pxToPt);

        pg.drawImage(pdfImage, {
            x: 0,
            y: drawY,
            width: PAGE_W * pxToPt,
            height: drawHeightCSS * pxToPt
        });

        currentY += drawHeightCSS;
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(path.resolve(__dirname, 'Propuesta_Scoreboard_Digital.pdf'), pdfBytes);
    console.log('PDF generado exitosamente en ULTRA CALIDAD.');
    await browser.close();
})();
