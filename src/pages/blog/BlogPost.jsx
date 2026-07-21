import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, Tag, ArrowRight, ChevronRight } from 'lucide-react';
import PageMeta from '../../components/seo/PageMeta';
import LandingNavbar from '../../components/landing/LandingNavbar';
import LandingFooter from '../../components/landing/LandingFooter';
import { BLOG_POSTS } from './BlogIndex';

// ─── Dynamic Article Renderer ──────────────────────────────────────────────────
const blogModules = import.meta.glob('./content/*.json');

function DynamicArticle({ slug }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const contentRef = useRef(null);
    const [tocStyle, setTocStyle] = useState({ position: 'absolute', top: 0 });
    const [tocLeft, setTocLeft] = useState(0);
    const [tocWidth, setTocWidth] = useState(288);

    useEffect(() => {
        setLoading(true);
        setError(false);

        const targetKey = `./content/${slug}.json`;
        const entry = blogModules[targetKey] || Object.entries(blogModules).find(([k]) => k.toLowerCase() === targetKey.toLowerCase())?.[1];

        if (entry) {
            entry()
                .then((module) => {
                    setData(module.default || module);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error("Failed to load article content:", err);
                    setError(true);
                    setLoading(false);
                });
        } else {
            console.error("Article content module not found for slug:", slug);
            setError(true);
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        if (!data) return;
        const THRESHOLD_FROM_TOP = 150;
        const tocOriginalEl = document.getElementById('toc-placeholder');

        function updateTocLeft() {
            if (tocOriginalEl) {
                const rect = tocOriginalEl.getBoundingClientRect();
                setTocLeft(rect.left);
                setTocWidth(rect.width);
            }
        }

        function handleScroll() {
            if (!contentRef.current || !tocOriginalEl) return;
            
            const contentRect = contentRef.current.getBoundingClientRect();
            const placeholderRect = tocOriginalEl.getBoundingClientRect();

            updateTocLeft();

            const startFollowing = placeholderRect.top <= THRESHOLD_FROM_TOP;
            
            // Use the absolute bottom of the content container to know when to stop tracking
            const tocEl = document.getElementById('toc-panel');
            const tocHeight = tocEl ? tocEl.offsetHeight : 500;
            const stopFollowing = contentRect.bottom <= (THRESHOLD_FROM_TOP + tocHeight + 20);

            if (stopFollowing) {
                const contentHeight = contentRef.current.offsetHeight;
                setTocStyle({ position: 'absolute', top: contentHeight - tocHeight });
            } else if (startFollowing) {
                setTocStyle({ position: 'fixed', top: THRESHOLD_FROM_TOP });
            } else {
                setTocStyle({ position: 'absolute', top: 0 });
            }
        }

        // Delay initial calculation slightly to ensure content is fully rendered
        setTimeout(() => {
            updateTocLeft();
            handleScroll();
        }, 100);

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', () => {
            updateTocLeft();
            handleScroll();
        });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', updateTocLeft);
        };
    }, [data]);

    const scrollToSection = (e, id) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            const offset = 110;
            const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    };

    if (loading) return (
        <div className="space-y-4" aria-busy="true" aria-label="Loading article…">
            {[1,2,3,4,5].map((i) => (
                <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
            ))}
        </div>
    );

    if (error || !data) return <p>Article content could not be loaded.</p>;

    const fixedStyles = tocStyle.position === 'fixed'
        ? { position: 'fixed', top: tocStyle.top, left: tocLeft, width: tocWidth, zIndex: 40 }
        : { position: 'absolute', top: tocStyle.top, right: 0, width: tocWidth, zIndex: 40 };

    const tocSection = data.sections.find(s => s.type === 'toc');

    return (
        <div className="w-full pb-16 max-w-[1200px] mx-auto">
            <div ref={contentRef} className="flex flex-col lg:flex-row gap-12 text-left items-start relative">
                <div className="flex-1 w-full min-w-0 space-y-10">
                    {data.sections.map((sec, i) => {
                        if (sec.type === 'paragraph') {
                            return <p key={i} className="text-lg text-gray-700 leading-relaxed mb-3" dangerouslySetInnerHTML={{__html: sec.content}} />;
                        }
                        if (sec.type === 'heading') {
                            return (
                                <section key={i} id={sec.id}>
                                    <h2 className="scroll-mt-32 text-2xl md:text-3xl font-bold text-gray-800 mb-5 border-b pb-3 border-gray-200">{sec.content}</h2>
                                </section>
                            );
                        }
                        if (sec.type === 'list') {
                            return (
                                <ul key={i} className="space-y-3">
                                    {sec.items.map((item, j) => (
                                        <li key={j} className="flex items-start gap-3">
                                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                            <span className="text-base text-gray-700" dangerouslySetInnerHTML={{__html: item}} />
                                        </li>
                                    ))}
                                </ul>
                            );
                        }
                        if (sec.type === 'stepper') {
                            return (
                                <div key={i} className="bg-white shadow-sm border border-gray-100 rounded-2xl p-7 md:p-9">
                                    <ol className="space-y-8">
                                        {sec.steps.map((step, j) => (
                                            <li key={j} className="flex items-start gap-4 md:gap-6 relative">
                                                {j < sec.steps.length - 1 && (
                                                    <div className="absolute left-[1.15rem] top-12 bottom-[-2rem] w-px bg-gray-200" aria-hidden="true"></div>
                                                )}
                                                <span className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg mt-0.5 shadow-md ring-4 ring-white">{j + 1}</span>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                                                    <p className="text-base text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{__html: step.content}} />
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>

                {/* Sidebar TOC */}
                {tocSection && (
                    <>
                        <aside id="toc-placeholder" className="hidden lg:block w-72 flex-shrink-0 self-start" style={{ minHeight: 1 }}></aside>
                        <div id="toc-panel" className="hidden lg:block w-72" style={fixedStyles}>
                            <div className="bg-[#fcfdfe] rounded-2xl shadow-md border border-gray-100 p-6 overflow-y-auto max-h-[calc(100vh-180px)]">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest">On This Page</h4>
                                </div>
                                <nav className="flex flex-col space-y-3 relative before:absolute before:inset-y-0 before:left-1.5 before:w-px before:bg-gray-100 pl-4">
                                    {tocSection.items.map((item, j) => (
                                        <a key={j} href={`#${item.id}`} onClick={(e) => scrollToSection(e, item.id)} className="relative text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors py-0.5 pl-4 group">
                                            <span className="absolute -left-1.5 top-1/2 -mt-1 h-2 w-2 rounded-full bg-white border border-gray-300 group-hover:border-blue-600 group-hover:bg-blue-600 transition-all duration-200"></span>
                                            {item.title}
                                        </a>
                                    ))}
                                </nav>
                                <div className="mt-7 pt-5 border-t border-gray-100">
                                    <p className="text-xs text-gray-500 mb-3 font-medium">Need help? Chat with us!</p>
                                    <a href="https://chat.whatsapp.com/G4dSBWV7Pp5BLBoOtborg2?mode=gi_t" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-green-500 text-white text-sm font-bold rounded-xl hover:bg-green-600 transition-colors text-center shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-2"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.562 4.14 1.541 5.874L.057 23.514a.75.75 0 00.918.943l5.84-1.525A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22.5A10.46 10.46 0 016.56 21.02l-.41-.245-4.25 1.11 1.13-4.12-.268-.424A10.447 10.447 0 011.5 12C1.5 6.21 6.21 1.5 12 1.5S22.5 6.21 22.5 12 17.79 22.5 12 22.5z"/></svg>
                                        Chat Support
                                    </a>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── BlogPost page ────────────────────────────────────────────────────────────
export default function BlogPost() {
    const { slug } = useParams();
    const post = BLOG_POSTS.find((p) => p.slug === slug);

    if (!post) return <Navigate to="/blog" replace />;

    const publishedDate = new Intl.DateTimeFormat('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(post.publishedAt));

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
    const related = BLOG_POSTS.filter((p) => p.slug !== slug && p.category === post.category).slice(0, 2);

    return (
        <>
            <PageMeta
                title={post.title}
                description={post.excerpt}
                canonical={`https://ufriends.com.ng/blog/${slug}`}
                schema={articleSchema}
            />

            <div className="min-h-screen bg-[#f3fcfd]">
                <LandingNavbar />

                <header className="bg-white border-b border-gray-100">
                    <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-primary" aria-hidden="true" />
                    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-16 pb-12 md:pt-20 md:pb-16">
                        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
                            <Link to="/" className="hover:text-primary transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Home</Link>
                            <ChevronRight size={12} aria-hidden="true" />
                            <Link to="/blog" className="hover:text-primary transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Blog</Link>
                            <ChevronRight size={12} aria-hidden="true" />
                            <span className="text-gray-600 font-medium truncate max-w-[180px]">{post.category}</span>
                        </nav>

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

                        <h1
                            className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-5"
                            style={{ textWrap: 'balance' }}
                        >
                            {post.title}
                        </h1>

                        <p className="text-base md:text-lg text-gray-500 leading-relaxed" style={{ textWrap: 'pretty' }}>
                            {post.excerpt}
                        </p>
                    </div>
                </header>

                <main id="main-content" className="py-12 md:py-16 px-4">
                    <div className="max-w-[1200px] mx-auto">
                        <Link
                            to="/blog"
                            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-primary transition-colors duration-150 mb-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            <ArrowLeft size={14} aria-hidden="true" />
                            Back to Blog
                        </Link>

                        <DynamicArticle slug={slug} />

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
