const fs = require('fs');
const path = require('path');

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ─── 1. Load Data Sources ───────────────────────────────────────────────────
const seoPagesPath = path.join(__dirname, 'src/pages/seo/content/seo-pages.json');
let seoPagesDb = {};
if (fs.existsSync(seoPagesPath)) {
    try {
        seoPagesDb = JSON.parse(fs.readFileSync(seoPagesPath, 'utf8'));
    } catch (e) {
        console.error('Error loading seo-pages.json:', e);
    }
}

const allPostsPath = path.join(__dirname, 'src/pages/blog/content/all-posts.json');
let blogDb = {};
if (fs.existsSync(allPostsPath)) {
    try {
        blogDb = JSON.parse(fs.readFileSync(allPostsPath, 'utf8'));
    } catch (e) {
        console.error('Error loading all-posts.json:', e);
    }
}

// Read any individual blog post files to ensure 100% coverage
const blogContentDir = path.join(__dirname, 'src/pages/blog/content');
if (fs.existsSync(blogContentDir)) {
    const files = fs.readdirSync(blogContentDir);
    for (const file of files) {
        if (file.endsWith('.json') && file !== 'all-posts.json' && file !== 'seo-pages.json') {
            const slug = file.replace('.json', '');
            if (!blogDb[slug]) {
                try {
                    blogDb[slug] = JSON.parse(fs.readFileSync(path.join(blogContentDir, file), 'utf8'));
                } catch (e) {}
            }
        }
    }
}

// ─── 2. Build Route Catalogue ───────────────────────────────────────────────
const STATIC_PAGES = {
    '/': {
        title: "Ufriends IT — Buy Data, Airtime, Print NIN & BVN Slip Online Nigeria",
        description: "Ufriends IT is Nigeria's all-in-one VTU platform. Buy cheap data, airtime, print NIN slip, BVN slip, NIN/BVN modification, cable TV, electricity bills, exam pins and CAC registration. Start for free.",
        canonical: "https://www.ufriends.com.ng/",
        h1: "Nigeria's All-In-One VTU & Government Services Platform",
        subtitle: "Buy cheap data, airtime, print NIN & BVN slips, pay electricity bills, and register your business with CAC online.",
        schema: {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "Organization",
                    "@id": "https://www.ufriends.com.ng/#organization",
                    "name": "Ufriends IT",
                    "url": "https://www.ufriends.com.ng",
                    "logo": {
                        "@type": "ImageObject",
                        "url": "https://www.ufriends.com.ng/favicon.svg"
                    }
                },
                {
                    "@type": "WebSite",
                    "@id": "https://www.ufriends.com.ng/#website",
                    "url": "https://www.ufriends.com.ng",
                    "name": "Ufriends IT"
                }
            ]
        }
    },
    '/about': {
        title: "About Ufriends IT — Nigeria's All-In-One Digital Services Platform | Ufriends IT Nigeria",
        description: "Ufriends IT is Nigeria's leading VTU and digital services platform. Buy data, airtime, print NIN/BVN slips, pay bills, register a business with CAC, and more — from your phone in minutes.",
        canonical: "https://www.ufriends.com.ng/about",
        h1: "About Ufriends IT — Nigeria's All-In-One Digital Services Platform",
        subtitle: "We make buying airtime, data, NIN slips, BVN slips, electricity bills, cable TV, exam pins and CAC registration simple, fast and affordable.",
        schema: {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "name": "About Ufriends IT",
            "url": "https://www.ufriends.com.ng/about"
        }
    },
    '/contact': {
        title: "Contact Us | Ufriends IT Support | Ufriends IT Nigeria",
        description: "Need help? Contact Ufriends IT via email, WhatsApp or our contact form. We respond within 24 hours for all inquiries including transactions, NIN/BVN, and account issues.",
        canonical: "https://www.ufriends.com.ng/contact",
        h1: "Contact Ufriends IT Support",
        subtitle: "We respond to all inquiries within 24 hours. WhatsApp support is available for instant assistance.",
        schema: {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            "name": "Contact Ufriends IT",
            "url": "https://www.ufriends.com.ng/contact"
        }
    },
    '/reseller': {
        title: "Buy VTU Website & App - Build Your IT Agency | Ufriends IT Nigeria",
        description: "Launch your own VTU website and mobile application agency in Nigeria. Professional white-label software for VTU, Data, and Bill Payment business. Secure, fast, and reliable.",
        canonical: "https://www.ufriends.com.ng/reseller",
        h1: "Build Your Own VTU Website & Mobile App Agency in Nigeria",
        subtitle: "Launch a turnkey VTU and identity portal with automated API connections, payment gateways, and reseller management.",
        schema: {
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "VTU Website and Mobile App Reseller Agency Software",
            "url": "https://www.ufriends.com.ng/reseller"
        }
    },
    '/privacy': {
        title: "Privacy Policy | Ufriends IT Nigeria",
        description: "Privacy Policy for Ufriends IT Nigeria — Data protection and privacy practices compliant with NDPR and Nigeria Data Protection Act 2023.",
        canonical: "https://www.ufriends.com.ng/privacy",
        h1: "Privacy Policy — Ufriends IT"
    },
    '/terms': {
        title: "Terms of Service | Ufriends IT Nigeria",
        description: "Terms of Service for Ufriends IT Nigeria — Operating terms and conditions for VTU, identity, and bill payment services.",
        canonical: "https://www.ufriends.com.ng/terms",
        h1: "Terms of Service — Ufriends IT"
    },
    '/blog': {
        title: "Blog — VTU, NIN, BVN & Government Services Guides for Nigerians | Ufriends IT Nigeria",
        description: "Ufriends IT Blog: step-by-step guides on buying cheap data, printing NIN/BVN slips, NIN/BVN modification, cable TV subscriptions, electricity bills, and government services in Nigeria.",
        canonical: "https://www.ufriends.com.ng/blog",
        h1: "Ufriends IT Blog & Telecom Guides",
        subtitle: "In-depth guides on buying cheap data, resolving NIN and BVN errors, printing slips online, and building a profitable VTU business in Nigeria.",
        schema: {
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "Ufriends IT Blog",
            "url": "https://www.ufriends.com.ng/blog"
        }
    },
    '/login': {
        title: "Log In to Your Account | Ufriends IT",
        description: "Log into your Ufriends IT account to buy cheap data, airtime, print NIN/BVN slips, and manage your wallet.",
        canonical: "https://www.ufriends.com.ng/login",
        noIndex: true
    },
    '/register': {
        title: "Create Free Account | Ufriends IT",
        description: "Sign up for a free Ufriends IT account in seconds. Buy cheap data, airtime, print NIN and BVN slips online.",
        canonical: "https://www.ufriends.com.ng/register",
        noIndex: true
    },
    '/forgot-password': {
        title: "Reset Password | Ufriends IT",
        description: "Reset your Ufriends IT password.",
        canonical: "https://www.ufriends.com.ng/forgot-password",
        noIndex: true
    },
    '/reset-password': {
        title: "Set New Password | Ufriends IT",
        description: "Set a new password for your Ufriends IT account.",
        canonical: "https://www.ufriends.com.ng/reset-password",
        noIndex: true
    }
};

const PUBLIC_ROUTES = [
    '/',
    '/about',
    '/contact',
    '/reseller',
    '/privacy',
    '/terms',
    '/blog',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password'
];

// Add service landing pages
Object.keys(seoPagesDb).forEach(slug => {
    PUBLIC_ROUTES.push(`/${slug}`);
});

// Add blog posts
Object.keys(blogDb).forEach(slug => {
    PUBLIC_ROUTES.push(`/blog/${slug}`);
});

// ─── 3. Content Generators ──────────────────────────────────────────────────
function getRouteMetadata(route) {
    if (STATIC_PAGES[route]) {
        return STATIC_PAGES[route];
    }

    if (route.startsWith('/blog/')) {
        const slug = route.replace('/blog/', '');
        const post = blogDb[slug];
        if (post) {
            return {
                title: `${post.title} | Ufriends IT Nigeria`,
                description: post.excerpt || '',
                canonical: `https://www.ufriends.com.ng/blog/${slug}`,
                schema: {
                    "@context": "https://schema.org",
                    "@type": "Article",
                    "headline": post.title,
                    "description": post.excerpt,
                    "datePublished": post.publishedAt,
                    "dateModified": post.publishedAt,
                    "author": {
                        "@type": "Organization",
                        "name": "Ufriends IT",
                        "url": "https://www.ufriends.com.ng"
                    },
                    "publisher": {
                        "@type": "Organization",
                        "@id": "https://www.ufriends.com.ng/#organization",
                        "name": "Ufriends IT",
                        "logo": {
                            "@type": "ImageObject",
                            "url": "https://www.ufriends.com.ng/favicon.svg"
                        }
                    },
                    "mainEntityOfPage": {
                        "@type": "WebPage",
                        "@id": `https://www.ufriends.com.ng/blog/${slug}`
                    }
                }
            };
        }
    }

    const serviceSlug = route.replace('/', '');
    const service = seoPagesDb[serviceSlug];
    if (service) {
        return {
            title: service.metaTitle ? `${service.metaTitle} | Ufriends IT Nigeria` : `${service.h1} | Ufriends IT Nigeria`,
            description: service.metaDescription || '',
            canonical: `https://www.ufriends.com.ng/${serviceSlug}`,
            schema: service.schema || null
        };
    }

    return {
        title: "Ufriends IT — Nigeria's All-In-One VTU & Digital Services",
        description: "Buy cheap data, airtime, print NIN/BVN slips, and pay utility bills in Nigeria.",
        canonical: `https://www.ufriends.com.ng${route}`
    };
}

function getRouteBodyHtml(route) {
    // 1. Service Landing Pages
    const serviceSlug = route.replace('/', '');
    const service = seoPagesDb[serviceSlug];
    if (service) {
        const benefits = service.benefits || [];
        let faqs = [];
        if (Array.isArray(service.schema)) {
            const faqSchema = service.schema.find(s => s['@type'] === 'FAQPage');
            if (faqSchema && Array.isArray(faqSchema.mainEntity)) {
                faqs = faqSchema.mainEntity.map(q => ({
                    q: q.name,
                    a: q.acceptedAnswer ? q.acceptedAnswer.text : ''
                }));
            }
        }

        return `
            <div class="pre-rendered-page service-page" style="max-width:1200px;margin:0 auto;padding:48px 20px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;">
                <header style="text-align:center;margin-bottom:48px;">
                    ${service.badge ? `<span style="display:inline-block;padding:6px 16px;background:#e0f2fe;color:#0284c7;border-radius:9999px;font-size:14px;font-weight:700;margin-bottom:16px;">${escapeHtml(service.badge)}</span>` : ''}
                    <h1 style="font-size:36px;font-weight:800;color:#004687;line-height:1.25;margin-bottom:16px;">${escapeHtml(service.h1)}</h1>
                    <p style="font-size:18px;color:#475569;max-width:800px;margin:0 auto 24px;line-height:1.6;">${escapeHtml(service.subtitle)}</p>
                    <div style="margin-top:24px;">
                        <a href="/register" style="display:inline-block;padding:14px 32px;background:#004687;color:#fff;font-weight:700;border-radius:12px;text-decoration:none;margin-right:12px;">${escapeHtml(service.ctaText || 'Get Started Now')}</a>
                        <a href="/login" style="display:inline-block;padding:14px 28px;border:1px solid #cbd5e1;color:#334155;font-weight:600;border-radius:12px;text-decoration:none;">Log In</a>
                    </div>
                </header>

                ${benefits.length > 0 ? `
                    <section style="margin-bottom:56px;">
                        <h2 style="font-size:26px;font-weight:700;color:#0f172a;margin-bottom:24px;border-bottom:2px solid #e2e8f0;padding-bottom:12px;">Why Choose Ufriends IT</h2>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;">
                            ${benefits.map(b => `
                                <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                                    <h3 style="font-size:18px;font-weight:700;color:#004687;margin-bottom:8px;">${escapeHtml(b.title)}</h3>
                                    <p style="color:#64748b;line-height:1.6;font-size:15px;margin:0;">${escapeHtml(b.body)}</p>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                ` : ''}

                ${faqs.length > 0 ? `
                    <section style="margin-bottom:56px;">
                        <h2 style="font-size:26px;font-weight:700;color:#0f172a;margin-bottom:24px;border-bottom:2px solid #e2e8f0;padding-bottom:12px;">Frequently Asked Questions</h2>
                        <div style="display:grid;gap:16px;">
                            ${faqs.map(f => `
                                <div style="background:#f8fafc;padding:20px;border-radius:12px;border:1px solid #e2e8f0;">
                                    <h3 style="font-size:17px;font-weight:700;color:#1e293b;margin-bottom:8px;">${escapeHtml(f.q)}</h3>
                                    <p style="color:#475569;line-height:1.6;font-size:15px;margin:0;">${escapeHtml(f.a)}</p>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                ` : ''}

                <footer style="border-top:1px solid #e2e8f0;padding-top:32px;margin-top:40px;color:#64748b;font-size:14px;text-align:center;">
                    <p>© 2026 Ufriends IT. Nigeria's trusted digital & VTU services platform.</p>
                </footer>
            </div>
        `;
    }

    // 2. Blog Posts
    if (route.startsWith('/blog/')) {
        const slug = route.replace('/blog/', '');
        const post = blogDb[slug];
        if (post) {
            let sectionsHtml = '';
            if (Array.isArray(post.sections)) {
                sectionsHtml = post.sections.map(sec => {
                    if (sec.type === 'paragraph') {
                        return `<p style="margin-bottom:20px;line-height:1.8;font-size:17px;color:#334155;">${sec.content}</p>`;
                    }
                    if (sec.type === 'heading') {
                        return `<h2 id="${escapeHtml(sec.id || '')}" style="font-size:26px;font-weight:700;color:#0f172a;margin-top:40px;margin-bottom:18px;border-bottom:1px solid #e2e8f0;padding-bottom:10px;">${escapeHtml(sec.content)}</h2>`;
                    }
                    if (sec.type === 'list' && Array.isArray(sec.items)) {
                        return `<ul style="margin-bottom:24px;padding-left:24px;line-height:1.8;font-size:16px;color:#334155;">${sec.items.map(i => `<li style="margin-bottom:8px;">${i}</li>`).join('')}</ul>`;
                    }
                    if (sec.type === 'stepper' && Array.isArray(sec.steps)) {
                        return `<ol style="margin-bottom:28px;padding-left:24px;line-height:1.8;font-size:16px;color:#334155;">${sec.steps.map(s => `<li style="margin-bottom:16px;"><strong style="color:#0f172a;">${escapeHtml(s.title)}:</strong> ${s.content}</li>`).join('')}</ol>`;
                    }
                    if (sec.type === 'faq' && Array.isArray(sec.items)) {
                        return `
                            <section style="margin-top:40px;margin-bottom:28px;">
                                <h2 style="font-size:24px;font-weight:700;color:#0f172a;margin-bottom:18px;">Frequently Asked Questions</h2>
                                ${sec.items.map(f => `
                                    <div style="margin-bottom:16px;background:#f8fafc;padding:18px;border-radius:12px;border:1px solid #e2e8f0;">
                                        <h3 style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:6px;">${escapeHtml(f.question || f.q)}</h3>
                                        <p style="color:#475569;margin:0;line-height:1.6;">${f.answer || f.a}</p>
                                    </div>
                                `).join('')}
                            </section>
                        `;
                    }
                    return '';
                }).join('\n');
            }

            return `
                <div class="pre-rendered-page blog-post" style="max-width:900px;margin:0 auto;padding:48px 20px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;">
                    <header style="margin-bottom:36px;">
                        <div style="font-size:13px;color:#0284c7;font-weight:700;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(post.category)} • ${escapeHtml(post.readMin)} MIN READ</div>
                        <h1 style="font-size:36px;font-weight:800;color:#0f172a;line-height:1.25;margin-bottom:16px;">${escapeHtml(post.title)}</h1>
                        <p style="font-size:18px;color:#64748b;line-height:1.6;margin-bottom:16px;">${escapeHtml(post.excerpt)}</p>
                        <div style="font-size:13px;color:#94a3b8;">Published on ${escapeHtml(post.publishedAt)} by Ufriends IT</div>
                    </header>
                    <main style="line-height:1.8;font-size:17px;color:#334155;">
                        ${sectionsHtml}
                    </main>
                    <footer style="margin-top:56px;padding-top:36px;border-top:1px solid #e2e8f0;">
                        <div style="background:#004687;color:#fff;padding:36px;border-radius:16px;text-align:center;">
                            <h2 style="font-size:24px;font-weight:700;margin-bottom:12px;color:#fff;">Try It on Ufriends IT Today</h2>
                            <p style="color:#e2e8f0;margin-bottom:20px;font-size:16px;max-width:600px;margin-left:auto;margin-right:auto;">Everything covered in this guide is available on Ufriends IT. Create a free account in seconds.</p>
                            <a href="/register" style="display:inline-block;padding:12px 32px;background:#fff;color:#004687;font-weight:700;border-radius:10px;text-decoration:none;">Create Free Account</a>
                        </div>
                    </footer>
                </div>
            `;
        }
    }

    // 3. Blog Index
    if (route === '/blog') {
        const postsList = Object.entries(blogDb);
        return `
            <div class="pre-rendered-page blog-index" style="max-width:1100px;margin:0 auto;padding:48px 20px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;">
                <header style="text-align:center;margin-bottom:48px;">
                    <h1 style="font-size:38px;font-weight:800;color:#004687;margin-bottom:16px;">Ufriends IT Blog & Identity Guides</h1>
                    <p style="font-size:18px;color:#64748b;max-width:750px;margin:0 auto;line-height:1.6;">In-depth guides, comparisons, and step-by-step tutorials on data bundles, NIN/BVN slips, and telecom reselling in Nigeria.</p>
                </header>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px;">
                    ${postsList.map(([slug, post]) => `
                        <article style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                            <div>
                                <span style="font-size:12px;color:#0284c7;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(post.category || 'Guide')}</span>
                                <h2 style="font-size:20px;font-weight:700;margin:10px 0;line-height:1.35;">
                                    <a href="/blog/${slug}" style="color:#0f172a;text-decoration:none;">${escapeHtml(post.title)}</a>
                                </h2>
                                <p style="color:#64748b;font-size:14px;line-height:1.6;margin-bottom:16px;">${escapeHtml(post.excerpt || '')}</p>
                            </div>
                            <div style="border-top:1px solid #f1f5f9;padding-top:12px;display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-size:12px;color:#94a3b8;">${escapeHtml(post.publishedAt || '2026')}</span>
                                <a href="/blog/${slug}" style="color:#004687;font-weight:700;font-size:13px;text-decoration:none;">Read Article →</a>
                            </div>
                        </article>
                    `).join('\n')}
                </div>
            </div>
        `;
    }

    // 4. Home Page
    if (route === '/') {
        return `
            <div class="pre-rendered-page" style="max-width:1100px;margin:0 auto;padding:48px 20px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;">
                <header style="text-align:center;margin-bottom:48px;">
                    <span style="display:inline-block;padding:6px 16px;background:#e0f2fe;color:#0284c7;border-radius:9999px;font-size:14px;font-weight:700;margin-bottom:16px;">Nigeria's #1 VTU & Identity Platform</span>
                    <h1 style="font-size:36px;font-weight:800;color:#004687;line-height:1.25;margin-bottom:16px;">Buy Cheap Data, Airtime & Government Identity Services Online</h1>
                    <p style="font-size:18px;color:#475569;max-width:800px;margin:0 auto 24px;line-height:1.6;">Nigeria's most trusted platform for cheap data bundles, lawful BVN and NIN modifications, instant slip retrieval, bill payments, and developer APIs.</p>
                    <div style="margin-top:24px;">
                        <a href="/register" style="display:inline-block;padding:14px 32px;background:#004687;color:#fff;font-weight:700;border-radius:12px;text-decoration:none;margin-right:12px;">Get Started Free</a>
                        <a href="/login" style="display:inline-block;padding:14px 28px;border:1px solid #cbd5e1;color:#334155;font-weight:600;border-radius:12px;text-decoration:none;">Log In</a>
                    </div>
                </header>
                <section style="margin-bottom:48px;">
                    <h2 style="font-size:24px;font-weight:700;color:#0f172a;margin-bottom:20px;border-bottom:2px solid #e2e8f0;padding-bottom:10px;">Our Core Services</h2>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;">
                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                            <h3 style="font-size:18px;font-weight:700;color:#004687;margin-bottom:8px;"><a href="/buy-data-nigeria" style="color:inherit;text-decoration:none;">1. Cheap Data Bundles</a></h3>
                            <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">Wholesale and SME data for MTN, Airtel, Glo, and 9mobile at rock-bottom prices with instant automated delivery.</p>
                        </div>
                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                            <h3 style="font-size:18px;font-weight:700;color:#004687;margin-bottom:8px;"><a href="/bvn-modification-nigeria" style="color:inherit;text-decoration:none;">2. BVN Modification</a></h3>
                            <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">Lawful online assistance for correcting BVN registration errors including name order, date of birth, and phone number update.</p>
                        </div>
                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                            <h3 style="font-size:18px;font-weight:700;color:#004687;margin-bottom:8px;"><a href="/nin-modification-nigeria" style="color:inherit;text-decoration:none;">3. NIN Modification</a></h3>
                            <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">Official and lawful NIN demographic detail corrections (name correction, date of birth, phone number adjustment).</p>
                        </div>
                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                            <h3 style="font-size:18px;font-weight:700;color:#004687;margin-bottom:8px;"><a href="/print-nin-slip-nigeria" style="color:inherit;text-decoration:none;">4. NIN & BVN Slips</a></h3>
                            <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">Instant retrieval and printing of official Standard, Premium, and Regular NIN slips, VNIN validation, and official BVN slips.</p>
                        </div>
                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                            <h3 style="font-size:18px;font-weight:700;color:#004687;margin-bottom:8px;">5. Other Digital Services</h3>
                            <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">BVN retrieval by phone, CAC business registration, WAEC, NECO & JAMB exam PINs, electricity bill payments, cable TV subscriptions, and airtime to cash.</p>
                        </div>
                        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                            <h3 style="font-size:18px;font-weight:700;color:#004687;margin-bottom:8px;"><a href="/reseller" style="color:inherit;text-decoration:none;">6. Developer API Access</a></h3>
                            <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">Developer API v1, sandbox testing environment, Node.js and PHP SDKs, and automated webhooks for seamless VTU integration.</p>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }

    // 5. Auth Pages (Loader shell for fast hydration without broken markup)
    if (['/login', '/register', '/forgot-password', '/reset-password'].includes(route)) {
        return `
    <div class="initial-loader-wrapper">
      <div class="spinner"></div>
      <div class="loading-phrases">
        <div class="phrase">Connecting to UFriends IT...</div>
        <div class="phrase">Fetching best data deals...</div>
        <div class="phrase">Loading BVN & NIN services...</div>
        <div class="phrase">Preparing NIN & BVN slips...</div>
        <div class="phrase">Setting up bill payments & business registration...</div>
        <div class="phrase">Loading WAEC, NECO & JAMB PINs...</div>
        <div class="phrase">Almost ready...</div>
        <div class="phrase">Welcome to UFriends IT!</div>
      </div>
    </div>`;
    }

    // 6. Other Static Pages
    if (STATIC_PAGES[route]) {
        const p = STATIC_PAGES[route];
        if (p.bodyContent) return p.bodyContent;
        return `
            <div class="pre-rendered-page" style="max-width:900px;margin:0 auto;padding:48px 20px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;">
                <h1 style="font-size:32px;font-weight:800;color:#004687;margin-bottom:16px;">${escapeHtml(p.h1 || p.title)}</h1>
                ${p.subtitle ? `<p style="font-size:18px;color:#475569;line-height:1.6;margin-bottom:24px;">${escapeHtml(p.subtitle)}</p>` : ''}
                <div style="margin-top:24px;">
                    <a href="/register" style="display:inline-block;padding:12px 28px;background:#004687;color:#fff;font-weight:700;border-radius:10px;text-decoration:none;margin-right:12px;">Get Started</a>
                    <a href="/login" style="display:inline-block;padding:12px 24px;border:1px solid #cbd5e1;color:#334155;font-weight:600;border-radius:10px;text-decoration:none;">Log In</a>
                </div>
            </div>
        `;
    }

    return `
        <div class="pre-rendered-page" style="max-width:900px;margin:0 auto;padding:48px 20px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;">
            <h1 style="font-size:32px;font-weight:800;color:#004687;margin-bottom:16px;">Ufriends IT</h1>
            <p style="font-size:16px;color:#475569;line-height:1.6;">Nigeria's all-in-one VTU & government identity services platform.</p>
        </div>
    `;
}

// ─── 4. Main Prerender Generator ────────────────────────────────────────────
function generateStaticRoutes(distDir) {
    const baseIndexPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(baseIndexPath)) {
        console.error('Error: dist/index.html does not exist. Run vite build first.');
        return;
    }

    const templateHtml = fs.readFileSync(baseIndexPath, 'utf8');
    console.log(`Starting SSG route generation for ${PUBLIC_ROUTES.length} routes...`);

    let generatedCount = 0;

    for (const route of PUBLIC_ROUTES) {
        const meta = getRouteMetadata(route);
        const bodyContent = getRouteBodyHtml(route);

        let html = templateHtml;

        // Clean out any existing tags to avoid duplicates
        html = html.replace(/<link rel="canonical"[^>]*>/gi, '');
        html = html.replace(/<title>[\s\S]*?<\/title>/gi, '');
        html = html.replace(/<meta name="description"[^>]*>/gi, '');
        html = html.replace(/<meta name="robots"[^>]*>/gi, '');
        html = html.replace(/<meta property="og:title"[^>]*>/gi, '');
        html = html.replace(/<meta property="og:description"[^>]*>/gi, '');
        html = html.replace(/<meta property="og:url"[^>]*>/gi, '');
        html = html.replace(/<meta name="twitter:title"[^>]*>/gi, '');
        html = html.replace(/<meta name="twitter:description"[^>]*>/gi, '');
        html = html.replace(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '');

        // Construct clean SEO head tags
        const headTags = [
            `  <title>${escapeHtml(meta.title)}</title>`,
            `  <meta name="description" content="${escapeHtml(meta.description)}" />`,
            meta.noIndex 
                ? `  <meta name="robots" content="noindex, nofollow" />`
                : `  <meta name="robots" content="index, follow" />`,
            `  <link rel="canonical" href="${meta.canonical}" />`,
            `  <meta property="og:title" content="${escapeHtml(meta.title)}" />`,
            `  <meta property="og:description" content="${escapeHtml(meta.description)}" />`,
            `  <meta property="og:url" content="${meta.canonical}" />`,
            `  <meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
            `  <meta name="twitter:description" content="${escapeHtml(meta.description)}" />`
        ];

        if (meta.schema) {
            headTags.push(`  <script type="application/ld+json">${JSON.stringify(meta.schema, null, 2)}</script>`);
        }

        // Insert new head tags right after <head>
        html = html.replace(/<head>/i, `<head>\n${headTags.join('\n')}`);

        // Inject semantic pre-rendered body into <div id="app">...</div>
        // CAUTION: Preserve <script> tags inside <body> so client-side React can mount!
        const appStart = html.indexOf('<div id="app">');
        const scriptStart = html.indexOf('<script', appStart);
        if (appStart !== -1 && scriptStart !== -1) {
            html = html.substring(0, appStart) +
                   `<div id="app">\n${bodyContent}\n  </div>\n  ` +
                   html.substring(scriptStart);
        } else {
            const bodyIdx = html.indexOf('<body');
            const endBodyIdx = html.indexOf('</body>');
            if (bodyIdx !== -1 && endBodyIdx !== -1) {
                const headPart = html.substring(0, bodyIdx);
                const afterBodyPart = html.substring(endBodyIdx);
                html = `${headPart}<body>\n  <div id="app">\n${bodyContent}\n  </div>\n${afterBodyPart}`;
            }
        }

        // Determine destination paths
        if (route === '/') {
            fs.writeFileSync(path.join(distDir, 'index.html'), html);
        } else {
            const cleanRoute = route.startsWith('/') ? route.substring(1) : route;
            const routeDir = path.join(distDir, cleanRoute);
            if (!fs.existsSync(routeDir)) {
                fs.mkdirSync(routeDir, { recursive: true });
            }

            // Write directory index.html
            fs.writeFileSync(path.join(routeDir, 'index.html'), html);
            
            // Also write direct .html file for single-level routes (e.g. dist/login.html)
            if (!cleanRoute.includes('/')) {
                fs.writeFileSync(path.join(distDir, `${cleanRoute}.html`), html);
            }
        }

        generatedCount++;
    }

    console.log(`Successfully generated ${generatedCount} static routes with pre-rendered semantic HTML!`);
}

function prerender() {
    const distDir = path.join(__dirname, 'dist');
    generateStaticRoutes(distDir);
}

prerender();
