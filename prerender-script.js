const fs = require('fs');
const path = require('path');

let puppeteer, express;
try {
    puppeteer = require('puppeteer');
    express = require('express');
} catch (e) {
    // Dependencies unavailable in build container
}

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
    
    if (!puppeteer || !express) {
        console.warn('Puppeteer or Express not available in environment. Running static route fallback generator...');
        fallbackStaticPrerender(distDir, PUBLIC_ROUTES);
        return;
    }
    
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
            const { getChromePath } = require('./api/utils/chrome');
            const chromePath = getChromePath();

            const launchOptions = {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            };
            if (chromePath) {
                launchOptions.executablePath = chromePath;
            }

            const browser = await puppeteer.launch(launchOptions);
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
            console.log('Puppeteer prerendering complete!');
        } catch (error) {
            console.warn('Puppeteer launch failed or unavailable in build environment. Falling back to static route generator...');
            fallbackStaticPrerender(distDir, PUBLIC_ROUTES);
        } finally {
            server.close();
        }
    });
}

function fallbackStaticPrerender(distDir, routes) {
    const baseIndexPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(baseIndexPath)) {
        console.error('base index.html does not exist in dist/');
        return;
    }
    const templateHtml = fs.readFileSync(baseIndexPath, 'utf8');

    for (const route of routes) {
        if (route === '/') continue;
        const routeDir = path.join(distDir, route.substring(1));
        if (!fs.existsSync(routeDir)) {
            fs.mkdirSync(routeDir, { recursive: true });
        }
        const savePath = path.join(routeDir, 'index.html');
        if (!fs.existsSync(savePath)) {
            fs.writeFileSync(savePath, templateHtml);
            console.log(`Fallback static route created: ${savePath}`);
        }
    }
    console.log('Static route fallback complete!');
}

prerender();
