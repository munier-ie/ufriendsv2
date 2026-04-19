import React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, Tag, ArrowRight, ChevronRight } from 'lucide-react';
import PageMeta from '../../components/seo/PageMeta';
import LandingNavbar from '../../components/landing/LandingNavbar';
import LandingFooter from '../../components/landing/LandingFooter';
import { BLOG_POSTS } from './BlogIndex';

// ─── Lazy-load each article's content ────────────────────────────────────────
// Each article body is a separate chunk so the blog index stays tiny.
const ARTICLE_MODULES = {
    'how-to-print-nin-slip-online-nigeria':      React.lazy(() => import('./articles/HowToPrintNinSlip')),
    'how-to-modify-bvn-nigeria':                 React.lazy(() => import('./articles/HowToModifyBvn')),
    'cheapest-data-plans-nigeria-2026':          React.lazy(() => import('./articles/CheapestDataPlans')),
    'how-to-retrieve-bvn-with-phone-number-nigeria': React.lazy(() => import('./articles/HowToRetrieveBvn')),
    'how-to-pay-dstv-subscription-online-nigeria':   React.lazy(() => import('./articles/HowToPayDstv')),
    'how-to-pay-electricity-bill-online-nigeria':    React.lazy(() => import('./articles/HowToPayElectricity')),
    'how-to-buy-waec-pin-online-nigeria':            React.lazy(() => import('./articles/HowToBuyWaecPin')),
    'how-to-register-business-cac-online-nigeria':   React.lazy(() => import('./articles/HowToRegisterCAC')),
    'nin-vs-bvn-difference-nigeria':                 React.lazy(() => import('./articles/NinVsBvn')),
    'best-vtu-website-nigeria-2026':                 React.lazy(() => import('./articles/BestVtuWebsite')),
    'how-to-get-pos-terminal-nigeria':               React.lazy(() => import('./articles/HowToGetPosTerminal')),
    'how-to-convert-airtime-to-cash-nigeria':        React.lazy(() => import('./articles/HowToConvertAirtimeToCash')),
    'how-to-start-vtu-business-nigeria':             React.lazy(() => import('./articles/HowToStartVtuBusiness')),
    'how-to-subscribe-gotv-online-nigeria':          React.lazy(() => import('./articles/HowToSubscribeGotv')),
    'mtn-sme-data-nigeria':                          React.lazy(() => import('./articles/MtnSmeData')),
    'how-to-link-nin-to-bank-account-nigeria':       React.lazy(() => import('./articles/HowToLinkNin')),
    'buy-cheap-airtel-data-online-nigeria':          React.lazy(() => import('./articles/BuyCheapAirtelData')),
    'nin-modification-portal-nigeria':               React.lazy(() => import('./articles/NinModificationPortal')),
    'e-wallet-vs-virtual-account-nigeria':           React.lazy(() => import('./articles/EWalletVsVirtualAccount')),
    'buy-cheap-glo-data-plans-nigeria-2026':         React.lazy(() => import('./articles/BuyCheapGloData')),
};

// ─── Article prose wrapper ────────────────────────────────────────────────────
function Prose({ children }) {
    return (
        <div className="
            prose prose-gray max-w-none
            prose-headings:font-bold prose-headings:text-gray-900 prose-headings:scroll-mt-24
            prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-gray-600 prose-p:leading-relaxed prose-p:text-sm md:prose-p:text-base
            prose-a:text-secondary prose-a:no-underline hover:prose-a:text-primary hover:prose-a:underline
            prose-strong:text-gray-900
            prose-ul:text-gray-600 prose-ul:text-sm prose-ol:text-gray-600 prose-ol:text-sm
            prose-li:my-1.5
            prose-blockquote:border-l-4 prose-blockquote:border-secondary prose-blockquote:bg-secondary/5 prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:not-italic
        ">
            {children}
        </div>
    );
}

// ─── BlogPost page ────────────────────────────────────────────────────────────
export default function BlogPost() {
    const { slug } = useParams();
    const post = BLOG_POSTS.find((p) => p.slug === slug);

    // 404 if post not in catalogue
    if (!post) return <Navigate to="/blog" replace />;

    const ArticleContent = ARTICLE_MODULES[slug];
    const publishedDate = new Intl.DateTimeFormat('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(post.publishedAt));

    // Structured data for the article
    const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt,
        datePublished: post.publishedAt,
        dateModified: post.publishedAt,
        author: {
            '@type': 'Organization',
            name: 'Ufriends IT',
            url: 'https://ufriends.com.ng',
        },
        publisher: {
            '@type': 'Organization',
            '@id': 'https://ufriends.com.ng/#organization',
            name: 'Ufriends IT',
            logo: { '@type': 'ImageObject', url: 'https://ufriends.com.ng/favicon.svg' },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `https://ufriends.com.ng/blog/${slug}` },
        keywords: post.keywords.join(', '),
    };

    const CATEGORY_STYLES = {
        'Government Services': 'bg-primary/10 text-primary',
        'Banking Identity': 'bg-secondary/10 text-secondary',
        'Data & Airtime': 'bg-primary/10 text-primary',
        'Cable TV': 'bg-secondary/10 text-secondary',
        'Utility Bills': 'bg-primary/10 text-primary',
        'Education': 'bg-secondary/10 text-secondary',
        'Business Registration': 'bg-primary/10 text-primary',
        'VTU Guides': 'bg-secondary/10 text-secondary',
    };

    const catStyle = CATEGORY_STYLES[post.category] || 'bg-gray-100 text-gray-600';

    // Related posts — same category, excluding current
    const related = BLOG_POSTS.filter((p) => p.slug !== slug && p.category === post.category).slice(0, 2);

    return (
        <>
            <PageMeta
                title={post.title}
                description={post.excerpt}
                canonical={`https://ufriends.com.ng/blog/${slug}`}
                schema={articleSchema}
            />

            <div className="min-h-screen bg-[#f3fcfd] overflow-x-hidden">
                <LandingNavbar />

                {/* Article header */}
                <header className="bg-white border-b border-gray-100">
                    <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-primary" aria-hidden="true" />
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-12 md:pt-20 md:pb-16">
                        {/* Breadcrumb */}
                        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                            <Link to="/" className="hover:text-primary transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Home</Link>
                            <ChevronRight size={12} aria-hidden="true" />
                            <Link to="/blog" className="hover:text-primary transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Blog</Link>
                            <ChevronRight size={12} aria-hidden="true" />
                            <span className="text-gray-600 font-medium truncate max-w-[180px]">{post.category}</span>
                        </nav>

                        {/* Category & meta */}
                        <div className="flex flex-wrap items-center gap-3 mb-5">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${catStyle}`}>
                                <Tag size={10} aria-hidden="true" />
                                {post.category}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                <Calendar size={11} aria-hidden="true" />
                                <time dateTime={post.publishedAt}>{publishedDate}</time>
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                <Clock size={11} aria-hidden="true" />
                                {post.readMin} min read
                            </span>
                        </div>

                        {/* Title */}
                        <h1
                            className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-5"
                            style={{ textWrap: 'balance' }}
                        >
                            {post.title}
                        </h1>

                        {/* Lead paragraph */}
                        <p className="text-base md:text-lg text-gray-500 leading-relaxed" style={{ textWrap: 'pretty' }}>
                            {post.excerpt}
                        </p>
                    </div>
                </header>

                {/* Article body */}
                <main id="main-content" className="py-12 md:py-16 px-4">
                    <div className="max-w-3xl mx-auto">
                        {/* Back link */}
                        <Link
                            to="/blog"
                            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary transition-colors duration-150 mb-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            <ArrowLeft size={14} aria-hidden="true" />
                            Back to Blog
                        </Link>

                        {/* Article content */}
                        <React.Suspense fallback={
                            <div className="space-y-4" aria-busy="true" aria-label="Loading article…">
                                {[1,2,3,4,5].map((i) => (
                                    <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
                                ))}
                            </div>
                        }>
                            <Prose>
                                {ArticleContent ? <ArticleContent /> : (
                                    <p>Article content is being prepared. Check back soon.</p>
                                )}
                            </Prose>
                        </React.Suspense>

                        {/* In-line CTA */}
                        <div className="mt-12 bg-gradient-to-br from-primary to-[#003570] rounded-2xl p-8 text-white text-center">
                            <h2 className="text-xl md:text-2xl font-bold mb-3" style={{ textWrap: 'balance' }}>
                                Ready to Try It on Ufriends IT?
                            </h2>
                            <p className="text-white/70 mb-6 text-sm leading-relaxed">
                                Everything described in this guide is available on your free Ufriends IT account — start in seconds.
                            </p>
                            <Link
                                to="/register"
                                className="inline-flex items-center gap-2 bg-white text-primary font-bold px-7 py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors duration-200 shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                Create Free Account
                                <ArrowRight size={14} aria-hidden="true" />
                            </Link>
                        </div>

                        {/* Related posts */}
                        {related.length > 0 && (
                            <section aria-labelledby="related-heading" className="mt-14">
                                <h2 id="related-heading" className="text-lg font-bold text-gray-900 mb-5">Related Articles</h2>
                                <div className="grid sm:grid-cols-2 gap-5">
                                    {related.map((p) => (
                                        <Link
                                            key={p.slug}
                                            to={`/blog/${p.slug}`}
                                            className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-secondary/20 transition-[box-shadow,border-color] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary block"
                                        >
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-3 ${CATEGORY_STYLES[p.category] || 'bg-gray-100 text-gray-600'}`}>
                                                <Tag size={9} aria-hidden="true" />
                                                {p.category}
                                            </span>
                                            <h3 className="font-semibold text-gray-900 text-sm mb-1.5 leading-snug" style={{ textWrap: 'balance' }}>
                                                {p.title}
                                            </h3>
                                            <span className="text-xs text-secondary font-semibold inline-flex items-center gap-1">
                                                Read Article <ArrowRight size={11} aria-hidden="true" />
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </main>

                <LandingFooter />
            </div>
        </>
    );
}
