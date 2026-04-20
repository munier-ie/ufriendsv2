const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const svgFile = path.join(__dirname, 'public/favicon.svg');
const outputDir = path.join(__dirname, 'mobile/assets');

async function renderSVG(width, height, outputPath, paddingPercent = 0) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const svgContent = fs.readFileSync(svgFile, 'utf8');
    
    const scale = (100 - paddingPercent) / 100;

    await page.setViewport({ width, height });
    await page.setContent(`
        <style>
            body, html { 
                margin: 0; 
                padding: 0; 
                background: transparent; 
                overflow: hidden; 
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                width: 100vw;
            }
            .container {
                width: ${scale * 100}%;
                height: ${scale * 100}%;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            svg { width: 100%; height: 100%; }
        </style>
        <div class="container">${svgContent}</div>
    `);

    await page.screenshot({ path: outputPath, omitBackground: true });
    await browser.close();
    console.log(`Rendered: ${outputPath} with ${paddingPercent}% padding`);
}

(async () => {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // Icon: 15% padding for standard icons
    await renderSVG(1024, 1024, path.join(outputDir, 'icon.png'), 15);
    // Adaptive Icon: 35% padding for Android safe zone
    await renderSVG(1024, 1024, path.join(outputDir, 'adaptive-icon.png'), 35);
    // Splash Icon: 25% padding
    await renderSVG(1024, 1024, path.join(outputDir, 'splash-icon.png'), 25);
    // Favicon: 5% padding
    await renderSVG(48, 48, path.join(outputDir, 'favicon.png'), 5);

    process.exit(0);
})();
