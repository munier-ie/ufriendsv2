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
            "name": "Contact Ufriends IT Support",
            "url": "https://www.ufriends.com.ng/contact",
            "publisher": {
                "@type": "Organization",
                "name": "Ufriends IT",
                "url": "https://www.ufriends.com.ng",
                "logo": "https://www.ufriends.com.ng/favicon.svg"
            },
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+2347026417709",
                "contactType": "customer support",
                "availableLanguage": ["English", "Hausa"],
                "contactOption": "TollFree"
            }
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

function formatSeoTitle(title, brandSuffix = ' | Ufriends IT') {
    if (!title) return 'Ufriends IT — Nigeria Telecom & Identity Portal';
    // If the title with suffix fits in 58 chars, append suffix
    if (title.length + brandSuffix.length <= 58) {
        return `${title}${brandSuffix}`;
    }
    // If title alone is under 58 chars, keep title
    if (title.length <= 58) {
        return title;
    }
    // If title exceeds 58 chars, trim cleanly at word boundary
    const trimmed = title.substring(0, 54);
    const lastSpace = trimmed.lastIndexOf(' ');
    return `${lastSpace > 30 ? trimmed.substring(0, lastSpace) : trimmed}...`;
}

// ─── 3. Content Generators ──────────────────────────────────────────────────
function getRouteMetadata(route) {
    if (STATIC_PAGES[route]) {
        return STATIC_PAGES[route];
    }

    if (route.startsWith('/blog/')) {
        const slug = route.replace('/blog/', '');
        const post = blogDb[slug];
        if (post) {
            const articleSchema = {
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": post.title,
                "description": post.excerpt,
                "datePublished": post.publishedAt,
                "dateModified": post.updatedAt || post.publishedAt,
                "articleSection": post.category || "Fintech & Identity",
                "inLanguage": "en-NG",
                "author": {
                    "@type": "Person",
                    "name": "Engr. Munier & Ufriends Fintech Research Group",
                    "jobTitle": "Lead Telecom Systems & Identity Specialist",
                    "url": "https://www.ufriends.com.ng/about"
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
            };

            const faqSection = Array.isArray(post.sections) ? post.sections.find(s => s.type === 'faq') : null;
            const graph = [articleSchema];

            if (post.reviewTarget) {
                graph.push({
                    "@type": "Review",
                    "name": `${post.reviewTarget.name} Review 2026`,
                    "reviewBody": post.excerpt,
                    "itemReviewed": {
                        "@type": "SoftwareApplication",
                        "name": post.reviewTarget.name,
                        "operatingSystem": post.reviewTarget.os || "Android, Web",
                        "applicationCategory": "BusinessApplication",
                        "url": post.reviewTarget.url
                    },
                    "reviewRating": {
                        "@type": "Rating",
                        "ratingValue": post.reviewTarget.rating || "4.2",
                        "bestRating": "5"
                    },
                    "author": {
                        "@type": "Person",
                        "name": "Engr. Munier & Ufriends Fintech Research Group",
                        "url": "https://www.ufriends.com.ng/about"
                    }
                });
            }

            if (faqSection && Array.isArray(faqSection.items) && faqSection.items.length > 0) {
                graph.push({
                    "@type": "FAQPage",
                    "mainEntity": faqSection.items.map(item => ({
                        "@type": "Question",
                        "name": item.q || item.question,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": item.a || item.answer
                        }
                    }))
                });
            }

            const finalSchema = graph.length > 1 ? {
                "@context": "https://schema.org",
                "@graph": graph
            } : articleSchema;

            return {
                title: formatSeoTitle(post.title),
                description: post.excerpt || '',
                canonical: `https://www.ufriends.com.ng/blog/${slug}`,
                schema: finalSchema,
                isArticle: true,
                publishedAt: post.publishedAt,
                updatedAt: post.updatedAt,
                category: post.category
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

const LOADER_HTML = `
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

function getRouteBodyHtml(route) {
    // 1. Service Landing Pages (Only the 10 specific SEO pages)
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
                    if (sec.type === 'table' && Array.isArray(sec.headers) && Array.isArray(sec.rows)) {
                        return `
                            <div style="margin:28px 0;overflow-x:auto;">
                                <table style="width:100%;border-collapse:collapse;font-size:15px;border:1px solid #e2e8f0;background:#fff;border-radius:12px;">
                                    <thead>
                                        <tr style="background:#003570;color:#fff;">
                                            ${sec.headers.map(h => `<th style="padding:12px 16px;text-align:left;font-weight:700;border:1px solid #e2e8f0;">${escapeHtml(h)}</th>`).join('')}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${sec.rows.map((row, rIdx) => `
                                            <tr style="background:${rIdx % 2 === 0 ? '#fff' : '#f8fafc'};">
                                                ${row.map(cell => `<td style="padding:12px 16px;border:1px solid #e2e8f0;color:#334155;">${escapeHtml(cell)}</td>`).join('')}
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `;
                    }
                    if (sec.type === 'callout') {
                        return `
                            <div style="margin:24px 0;padding:20px;background:#f0f9ff;border-left:4px solid #0284c7;border-radius:8px;color:#0369a1;font-size:16px;line-height:1.6;">
                                ${sec.content}
                            </div>
                        `;
                    }
                    return '';
                }).join('\n');
            }

            return `
                <article class="pre-rendered-page blog-post-page" style="max-width:850px;margin:0 auto;padding:48px 20px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;">
                    <header style="margin-bottom:32px;border-bottom:1px solid #e2e8f0;padding-bottom:24px;">
                        <a href="/blog" style="color:#004687;font-weight:600;text-decoration:none;font-size:14px;">← Back to Blog</a>
                        <h1 style="font-size:36px;font-weight:800;color:#0f172a;line-height:1.25;margin-top:16px;margin-bottom:12px;">${escapeHtml(post.title)}</h1>
                        <div style="font-size:14px;color:#64748b;display:flex;gap:16px;flex-wrap:wrap;">
                            <span>Published: ${escapeHtml(post.publishedAt || '2026')}</span>
                            ${post.updatedAt ? `<span style="color:#0284c7;font-weight:600;">Updated: ${escapeHtml(post.updatedAt)}</span>` : ''}
                            <span>By Engr. Munier &amp; Ufriends Research Team</span>
                        </div>
                    </header>
                    <div class="blog-body" style="font-size:17px;line-height:1.8;color:#334155;">
                        ${sectionsHtml}
                    </div>
                    <footer style="border-top:1px solid #e2e8f0;padding-top:32px;margin-top:48px;text-align:center;">
                        <p style="font-weight:600;color:#004687;margin-bottom:16px;">Ready to get started with Ufriends IT?</p>
                        <a href="/register" style="display:inline-block;padding:12px 28px;background:#004687;color:#fff;font-weight:700;border-radius:10px;text-decoration:none;">Create Free Account</a>
                    </footer>
                </article>
            `;
        }
    }

    // 3. Blog Index
    if (route === '/blog') {
        const postsList = Object.entries(blogDb);
        return `
            <div class="pre-rendered-page blog-index-page" style="max-width:1100px;margin:0 auto;padding:48px 20px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;">
                <header style="text-align:center;margin-bottom:48px;">
                    <h1 style="font-size:36px;font-weight:800;color:#004687;margin-bottom:12px;">Ufriends IT Blog & Guides</h1>
                    <p style="font-size:18px;color:#475569;max-width:700px;margin:0 auto;">Learn how to buy cheap data, resolve NIN/BVN errors, print official slips online, and build your digital services agency.</p>
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

    // 4. Contact Us Page
    if (route === '/contact') {
        return `
            <div class="pre-rendered-page contact-page" style="max-width:1000px;margin:0 auto;padding:48px 20px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;">
                <header style="text-align:center;margin-bottom:48px;">
                    <span style="font-size:13px;color:#004687;font-weight:700;text-transform:uppercase;letter-spacing:1px;">We're Here to Help</span>
                    <h1 style="font-size:36px;font-weight:800;color:#0f172a;margin-top:8px;margin-bottom:12px;">Contact Ufriends IT Support</h1>
                    <p style="font-size:17px;color:#475569;max-width:650px;margin:0 auto;line-height:1.6;">Whether you have a transaction issue, a billing question, or need assistance with NIN/BVN services, our dedicated support team is ready to assist you.</p>
                </header>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-bottom:48px;">
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:8px;">WhatsApp Support</h3>
                        <p style="font-size:14px;color:#64748b;line-height:1.6;margin-bottom:16px;">Chat directly with our support team on WhatsApp for fast, real-time responses to all account questions.</p>
                        <a href="https://wa.me/2347026417709" target="_blank" rel="noopener noreferrer" style="color:#004687;font-weight:700;font-size:14px;text-decoration:none;">Chat on WhatsApp →</a>
                    </div>
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:8px;">Email Inquiries</h3>
                        <p style="font-size:14px;color:#64748b;line-height:1.6;margin-bottom:16px;">Send us an email for formal requests, partnership inquiries, API integration support, and business registration.</p>
                        <a href="mailto:support@ufriends.com.ng" style="color:#004687;font-weight:700;font-size:14px;text-decoration:none;">support@ufriends.com.ng →</a>
                    </div>
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:8px;">Fast Resolution</h3>
                        <p style="font-size:14px;color:#64748b;line-height:1.6;margin-bottom:16px;">Automated wallet debits and transaction refunds are monitored 24/7. Manual requests resolved within 24 hours.</p>
                        <span style="font-size:14px;color:#059669;font-weight:700;">24/7 Automated Monitoring</span>
                    </div>
                </div>

                <section style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:32px;margin-bottom:48px;">
                    <h2 style="font-size:24px;font-weight:700;color:#0f172a;margin-bottom:20px;text-align:center;">Frequently Asked Support Questions</h2>
                    <div style="display:grid;gap:16px;">
                        <div style="background:#fff;padding:20px;border-radius:12px;border:1px solid #e2e8f0;">
                            <h4 style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:6px;">How fast do you respond to inquiries?</h4>
                            <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;">We respond to WhatsApp messages within 15–30 minutes during standard business hours and emails within 24 hours.</p>
                        </div>
                        <div style="background:#fff;padding:20px;border-radius:12px;border:1px solid #e2e8f0;">
                            <h4 style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:6px;">What if my data or airtime transaction is pending?</h4>
                            <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;">Most transactions complete instantly. If network delays occur, our system auto-reconciles or refunds failed debits automatically.</p>
                        </div>
                        <div style="background:#fff;padding:20px;border-radius:12px;border:1px solid #e2e8f0;">
                            <h4 style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:6px;">Where can I get support for NIN or BVN modification?</h4>
                            <p style="color:#475569;font-size:14px;line-height:1.6;margin:0;">You can message us directly on WhatsApp with your transaction reference or track the status from your Ufriends IT user dashboard.</p>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }

    // 5. About Page
    if (route === '/about') {
        return `
            <div class="pre-rendered-page about-page" style="max-width:1000px;margin:0 auto;padding:48px 20px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;">
                <header style="text-align:center;margin-bottom:48px;">
                    <span style="font-size:13px;color:#004687;font-weight:700;text-transform:uppercase;letter-spacing:1px;">About Ufriends IT</span>
                    <h1 style="font-size:36px;font-weight:800;color:#0f172a;margin-top:8px;margin-bottom:12px;">Nigeria's Leading VTU & Identity Platform</h1>
                    <p style="font-size:17px;color:#475569;max-width:700px;margin:0 auto;line-height:1.6;">Ufriends IT combines wholesale telecom services with verified government identity solutions, enabling thousands of individuals, resellers, and businesses to transact seamlessly.</p>
                </header>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-bottom:48px;">
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:8px;">Wholesale VTU Telecommunication</h3>
                        <p style="font-size:14px;color:#64748b;line-height:1.6;">Direct access to MTN SME/Gifting, Airtel, Glo, and 9mobile data plans, instant airtime, cable TV, and electricity tokens.</p>
                    </div>
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:8px;">Identity & Document Retrieval</h3>
                        <p style="font-size:14px;color:#64748b;line-height:1.6;">Official NIN slip retrieval in 4 formats, BVN verification and slips, demographic corrections, and CAC business registrations.</p>
                    </div>
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <h3 style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:8px;">Developer API & Reseller Tools</h3>
                        <p style="font-size:14px;color:#64748b;line-height:1.6;">Developer API v1 with Node.js and PHP SDKs, webhooks, and white-label portals for entrepreneurs to build their own vending apps.</p>
                    </div>
                </div>
            </div>
        `;
    }

    // All other routes (home, auth, reseller, privacy, terms):
    // Retain the branded animated loader spinner so no unwanted text ever flashes
    return LOADER_HTML;
}

// ─── 4. Main Prerender Generator ────────────────────────────────────────────
function generateStaticRoutes(distDir) {
    const baseIndexPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(baseIndexPath)) {
        console.error('Error: dist/index.html does not exist. Run vite build first.');
        return;
    }

    let templateHtml = fs.readFileSync(baseIndexPath, 'utf8');
    // Ensure dist/index.html (homepage) explicitly has its self-referencing canonical
    if (!templateHtml.includes('rel="canonical"')) {
        templateHtml = templateHtml.replace(/<head>/i, '<head>\n  <link rel="canonical" href="https://www.ufriends.com.ng/" />');
        fs.writeFileSync(baseIndexPath, templateHtml, 'utf8');
    }

    console.log(`Starting SSG route generation for ${PUBLIC_ROUTES.length} routes...`);

    // Clean up any legacy flat .html files in distDir (e.g. dist/about.html, dist/contact.html)
    // so they never conflict with directory index.html files or cause duplicate canonical errors.
    const rootFiles = fs.readdirSync(distDir);
    for (const f of rootFiles) {
        if (f.endsWith('.html') && f !== 'index.html') {
            try {
                fs.unlinkSync(path.join(distDir, f));
            } catch (e) {}
        }
    }

    let generatedCount = 0;

    for (const route of PUBLIC_ROUTES) {
        if (route === '/') continue; // dist/index.html is the homepage

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
        html = html.replace(/<meta property="og:type"[^>]*>/gi, '');
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
            meta.isArticle
                ? `  <meta property="og:type" content="article" />\n  <meta property="article:published_time" content="${escapeHtml(meta.publishedAt || '2026-05-11')}" />\n  <meta property="article:author" content="Ufriends IT" />${meta.category ? `\n  <meta property="article:section" content="${escapeHtml(meta.category)}" />` : ''}`
                : `  <meta property="og:type" content="website" />`,
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
        const cleanRoute = route.startsWith('/') ? route.substring(1) : route;
        const routeDir = path.join(distDir, cleanRoute);
        if (!fs.existsSync(routeDir)) {
            fs.mkdirSync(routeDir, { recursive: true });
        }

        // Write directory index.html
        fs.writeFileSync(path.join(routeDir, 'index.html'), html);

        generatedCount++;
    }

    console.log(`Successfully generated ${generatedCount} static routes with pre-rendered semantic HTML!`);
}

function prerender() {
    const distDir = path.join(__dirname, 'dist');
    generateStaticRoutes(distDir);
}

prerender();
