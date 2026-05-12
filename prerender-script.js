const puppeteer = require('puppeteer');
const express = require('express');
const fs = require('fs');
const path = require('path');

const PUBLIC_ROUTES = [
    '/',
    '/about',
    '/contact',
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
    '/cac-registration-nigeria',
    '/blog'
];

// Dynamically read all blog JSON files
const blogContentDir = path.join(__dirname, 'src/pages/blog/content');
if (fs.existsSync(blogContentDir)) {
    const files = fs.readdirSync(blogContentDir);
    for (const file of files) {
        if (file.endsWith('.json')) {
            const slug = file.replace('.json', '');
            PUBLIC_ROUTES.push(`/blog/${slug}`);
        }
    }
}

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
