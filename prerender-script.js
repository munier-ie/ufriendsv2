const puppeteer = require('puppeteer');
const express = require('express');
const fs = require('fs');
const path = require('path');

const PUBLIC_ROUTES = [
    '/',
    '/privacy',
    '/terms',
    '/print-nin-slip-nigeria',
    '/print-bvn-slip-nigeria',
    '/nin-modification-nigeria',
    '/bvn-modification-nigeria',
    '/buy-data-nigeria',
    '/buy-airtime-nigeria',
    '/pay-electricity-bill-nigeria',
    '/subscribe-cable-tv-nigeria',
    '/buy-exam-pins-nigeria',
    '/cac-registration-nigeria',
    '/blog',
    '/blog/how-to-print-nin-slip-online-nigeria',
    '/blog/how-to-modify-bvn-nigeria',
    '/blog/cheapest-data-plans-nigeria-2025',
    '/blog/how-to-retrieve-bvn-with-phone-number-nigeria',
    '/blog/how-to-pay-dstv-subscription-online-nigeria',
    '/blog/how-to-pay-electricity-bill-online-nigeria',
    '/blog/how-to-buy-waec-pin-online-nigeria',
    '/blog/how-to-register-business-cac-online-nigeria',
    '/blog/nin-vs-bvn-difference-nigeria',
    '/blog/best-vtu-website-nigeria-2025',
    '/blog/how-to-get-pos-terminal-nigeria',
    '/blog/how-to-convert-airtime-to-cash-nigeria',
    '/blog/how-to-start-vtu-business-nigeria',
    '/blog/how-to-subscribe-gotv-online-nigeria',
    '/blog/mtn-sme-data-nigeria',
    '/blog/how-to-link-nin-to-bank-account-nigeria',
    '/blog/buy-cheap-airtel-data-online-nigeria',
    '/blog/nin-modification-portal-nigeria',
    '/blog/e-wallet-vs-virtual-account-nigeria',
    '/blog/buy-cheap-glo-data-plans-nigeria-2025'
];

async function prerender() {
    console.log('Starting prerender script...');
    const distDir = path.join(__dirname, 'dist');
    
    // Start static server
    const app = express();
    app.use(express.static(distDir));
    // SPA fallback
    app.get('*', (req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
    });
    
    const server = app.listen(0, async () => {
        const port = server.address().port;
        console.log(`Static server listening on port ${port}`);
        
        try {
            const browser = await puppeteer.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'] 
            });
            const page = await browser.newPage();
            
            for (const route of PUBLIC_ROUTES) {
                console.log(`Prerendering ${route}...`);
                await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
                
                // Wait for the dynamic title/meta to be injected by helmet
                await page.waitForFunction(() => {
                    const title = document.title;
                    return title && title.length > 0;
                }, { timeout: 5000 }).catch(() => {});
                
                // Extract HTML
                let html = await page.content();
                
                // Strip scripts to prevent double execution or hydration issues if not strictly needed
                // Instead of stripping, just let it hydrate normally (it's a React SPA). Vercel does this.
                
                // Determine save path
                let savePath;
                if (route === '/') {
                    savePath = path.join(distDir, 'index.html');
                } else {
                    const routeDir = path.join(distDir, route.substring(1));
                    if (!fs.existsSync(routeDir)) {
                        fs.mkdirSync(routeDir, { recursive: true });
                    }
                    savePath = path.join(routeDir, 'index.html');
                }
                
                fs.writeFileSync(savePath, html);
                console.log(`Saved ${savePath}`);
            }
            
            await browser.close();
            console.log('Prerendering complete!');
        } catch (error) {
            console.error('Prerender error:', error);
        } finally {
            server.close();
        }
    });
}

prerender();
