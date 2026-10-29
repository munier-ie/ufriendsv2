import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, Tag, ArrowRight, ChevronRight, X, ShieldCheck, Zap } from 'lucide-react';
import PageMeta from '../../components/seo/PageMeta';
import LandingNavbar from '../../components/landing/LandingNavbar';
import LandingFooter from '../../components/landing/LandingFooter';
import { BLOG_POSTS } from './BlogIndex';

import allBlogPosts from './content/all-posts.json';

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

        // 1. Synchronous lookup from bundled all-posts.json
        const article = allBlogPosts[slug] || Object.entries(allBlogPosts).find(([k]) => k.toLowerCase() === slug.toLowerCase())?.[1];

        if (article) {
            setData(article);
            setLoading(false);
            return;
        }

        // 2. Fallback: HTTP fetch from /blog-posts.json
        fetch('/blog-posts.json')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch public blog database');
                return res.json();
            })
            .then((db) => {
                const fetched = db[slug] || Object.entries(db).find(([k]) => k.toLowerCase() === slug.toLowerCase())?.[1];
                if (fetched) {
                    setData(fetched);
                } else {
                    setError(true);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load article content:", err);
                setError(true);
                setLoading(false);
            });
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
                        if (sec.type === 'table') {
                            return (
                                <div key={i} className="my-8 overflow-hidden rounded-2xl border border-gray-200 shadow-sm bg-white">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-sm">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-[#003570] to-[#004687] text-white">
                                                    {sec.headers.map((h, hIdx) => (
                                                        <th key={hIdx} className="px-5 py-3.5 font-bold tracking-wide uppercase text-xs border-r border-white/10 last:border-r-0">
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                                {sec.rows.map((row, rIdx) => (
                                                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white hover:bg-blue-50/40 transition-colors' : 'bg-gray-50/70 hover:bg-blue-50/40 transition-colors'}>
                                                        {row.map((cell, cIdx) => (
                                                            <td key={cIdx} className="px-5 py-3.5 border-r border-gray-100 last:border-r-0 font-medium">
                                                                {cell}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        }
                        if (sec.type === 'fast-track' || (sec.type === 'callout' && sec.style === 'fast-track')) {
                            return (
                                <div key={i} className="my-7 p-6 rounded-2xl bg-gradient-to-r from-blue-50/95 via-sky-50/80 to-blue-50/95 border border-blue-200/90 shadow-sm relative overflow-hidden">
                                    <div className="flex items-start gap-4">
                                        <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">
                                            ⚡
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200 mb-2">
                                                <span>{sec.badge || 'Fast-Track Solution'}</span>
                                            </div>
                                            {sec.title && (
                                                <h4 className="text-base md:text-lg font-bold text-gray-900 mb-1.5">
                                                    {sec.title}
                                                </h4>
                                            )}
                                            <div className="text-sm md:text-base text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: sec.content }} />
                                            {sec.buttonText && sec.buttonLink && (
                                                <div className="mt-4">
                                                    <a
                                                        href={sec.buttonLink}
                                                        className="inline-flex items-center gap-2 bg-primary hover:bg-[#003570] text-white text-xs md:text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition-colors"
                                                    >
                                                        {sec.buttonText}
                                                        <ArrowRight size={14} />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        if (sec.type === 'callout') {
                            const isWarning = sec.style === 'warning';
                            return (
                                <div key={i} className={`my-6 p-5 rounded-2xl border ${isWarning ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-blue-50/80 border-blue-200 text-blue-900'} leading-relaxed text-base flex items-start gap-3.5 shadow-sm`}>
                                    <span className="flex-shrink-0 text-xl mt-0.5">{isWarning ? '⚠️' : '💡'}</span>
                                    <div dangerouslySetInnerHTML={{ __html: sec.content }} />
                                </div>
                            );
                        }
                        if (sec.type === 'faq') {
                            return (
                                <div key={i} className="my-10 space-y-4">
                                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 border-b pb-3 border-gray-200">Frequently Asked Questions</h2>
                                    <div className="grid gap-4">
                                        {sec.items.map((item, fIdx) => (
                                            <div key={fIdx} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-primary/30 transition-colors">
                                                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-start gap-2.5">
                                                    <span className="text-primary font-bold">Q.</span>
                                                    <span>{item.q || item.question}</span>
                                                </h3>
                                                <p className="text-base text-gray-600 leading-relaxed pl-6" dangerouslySetInnerHTML={{ __html: item.a || item.answer }} />
                                            </div>
                                        ))}
                                    </div>
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

// ─── Contextual CTA Configuration Helper ─────────────────────────────────────
function getContextualCta(post, slug = '') {
    const s = (slug || '').toLowerCase();
    const cat = post?.category || '';

    // 1. BVN Slip retrieval / print
    if (s.includes('bvn-slip') || s.includes('print-your-bvn-slip') || s.includes('recover-check-and-print-your-bvn')) {
        return {
            badge: 'Official BVN Verification Portal',
            badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
            title: 'Need to Retrieve & Print Your BVN Slip Now?',
            description: 'Generate your official NIBSS BVN slip with verified passport photograph in under 60 seconds. Accepted by all Nigerian banks, embassies, and KYC portals.',
            primaryText: 'Print Official BVN Slip',
            primaryUrl: '/print-bvn-slip-nigeria',
            secondaryText: 'BVN Modification Portal',
            secondaryUrl: '/bvn-modification-nigeria',
            stickyShort: 'Print Official BVN Slip in 60s'
        };
    }

    // 2. BVN Modification / Mismatch / Date of Birth / Name Change
    if (cat === 'Banking Identity' || s.includes('bvn') || s.includes('how-to-modify-bvn') || s.includes('can-bvn-number-be-changed')) {
        return {
            badge: 'Online BVN Correction Portal',
            badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
            title: 'Fix Your BVN Demographic Details Online',
            description: 'Avoid banking restrictions, court affidavit stress, and branch queues. Submit your lawful BVN name, date of birth, or phone correction online with fast automated processing.',
            primaryText: 'Correct BVN Details Online',
            primaryUrl: '/bvn-modification-nigeria',
            secondaryText: 'Print BVN Slip',
            secondaryUrl: '/print-bvn-slip-nigeria',
            stickyShort: 'Fix BVN Online Without Bank Queues'
        };
    }

    // 3. NIN Slip Print
    if (s.includes('print-nin-slip') || s.includes('nin-slip')) {
        return {
            badge: 'Official NIN Self-Service',
            badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
            title: 'Retrieve & Print Your Verified NIN Slip',
            description: 'Instant download and printing of official Standard, Premium, and Regular NIN slips with secure cryptographic QR verification codes.',
            primaryText: 'Print NIN Slip Online',
            primaryUrl: '/print-nin-slip-nigeria',
            secondaryText: 'NIN Modification Portal',
            secondaryUrl: '/nin-modification-nigeria',
            stickyShort: 'Print Verified NIN Slip in 60s'
        };
    }

    // 4. NIN Modification / Government Services
    if (cat === 'Government Services' || s.includes('nin')) {
        return {
            badge: 'NIMC Demographic Correction',
            badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
            title: 'Correct Your NIN Details Lawfully Online',
            description: 'Submit official National Identification Number demographic corrections for name spelling, date of birth, and phone number with live tracking.',
            primaryText: 'Start NIN Modification',
            primaryUrl: '/nin-modification-nigeria',
            secondaryText: 'Print NIN Slip',
            secondaryUrl: '/print-nin-slip-nigeria',
            stickyShort: 'Fix NIN Demographics Online'
        };
    }

    // 5. Airtime to cash
    if (s.includes('airtime-to-cash') || s.includes('convert-airtime')) {
        return {
            badge: 'Instant Bank Cash Settlement',
            badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
            title: 'Convert Excess Airtime to Cash in 3 Minutes',
            description: 'Turn your MTN, Airtel, Glo, or 9mobile balance into direct bank deposits with automated verification and competitive payout rates.',
            primaryText: 'Convert Airtime to Cash',
            primaryUrl: '/dashboard/airtime2cash',
            secondaryText: 'Check Live Rates',
            secondaryUrl: '/buy-data-nigeria',
            stickyShort: 'Convert Airtime to Bank Cash'
        };
    }

    // 6. Data & Airtime
    if (cat === 'Data & Airtime' || s.includes('data') || s.includes('airtime')) {
        return {
            badge: 'Wholesale SME Telecom Rates',
            badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
            title: 'Save Up to 40% on MTN, Airtel & Glo Data',
            description: 'Instant automated delivery on wholesale SME, gifting, and corporate data bundles starting from ₦220/GB. Active 24/7 with instant wallet funding.',
            primaryText: 'Buy Cheap Data Now',
            primaryUrl: '/buy-data-nigeria',
            secondaryText: 'Join Reseller Program',
            secondaryUrl: '/reseller',
            stickyShort: 'Get Cheap 1GB Data from ₦220'
        };
    }

    // 7. Business Registration (CAC)
    if (cat === 'Business Registration' || s.includes('cac')) {
        return {
            badge: 'CAC Accredited Registration',
            badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
            title: 'Register Your Business Name with CAC Online',
            description: 'Get your approved Business Name registration, BN number, and official CAC status report without physical paperwork or expensive agents.',
            primaryText: 'Start CAC Registration',
            primaryUrl: '/cac-registration-nigeria',
            secondaryText: 'Open Business Account',
            secondaryUrl: '/register',
            stickyShort: 'Register Business with CAC Online'
        };
    }

    // 8. Education / Exam PINs
    if (cat === 'Education' || s.includes('waec') || s.includes('neco') || s.includes('jamb')) {
        return {
            badge: 'Direct Examination Token Vending',
            badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
            title: 'Buy WAEC, NECO & JAMB Result PINs Instantly',
            description: 'Instant digital token generation for exam result checking and admission clearance. Serial keys displayed on-screen and emailed in seconds.',
            primaryText: 'Buy Exam Result PINs',
            primaryUrl: '/buy-exam-pins-nigeria',
            secondaryText: 'Create Student Account',
            secondaryUrl: '/register',
            stickyShort: 'Instant WAEC & NECO Result PINs'
        };
    }

    // 9. Cable TV
    if (cat === 'Cable TV' || s.includes('dstv') || s.includes('gotv') || s.includes('startimes')) {
        return {
            badge: '0% Convenience Fee Cable Vending',
            badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
            title: 'Renew DStv, GOtv & Startimes Signal Instantly',
            description: 'Automated decoder reconnection within 60 seconds with zero service fees. Clear error codes (E16) automatically on recharge.',
            primaryText: 'Subscribe Cable TV Now',
            primaryUrl: '/subscribe-cable-tv-nigeria',
            secondaryText: 'Pay Electricity Bills',
            secondaryUrl: '/pay-electricity-bill-nigeria',
            stickyShort: 'Pay DStv / GOtv with 0% Fee'
        };
    }

    // 10. Utility Bills
    if (cat === 'Utility Bills' || s.includes('electricity') || s.includes('meter')) {
        return {
            badge: 'Instant Prepaid Meter Vending',
            badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
            title: 'Buy Prepaid Electricity Tokens in Seconds',
            description: '24/7 token generation for IKEDC, EKEDC, AEDC, IBEDC, and all Disco providers with instant token SMS and on-screen receipt.',
            primaryText: 'Pay Electricity Bill',
            primaryUrl: '/pay-electricity-bill-nigeria',
            secondaryText: 'Buy Cheap Data',
            secondaryUrl: '/buy-data-nigeria',
            stickyShort: 'Buy Prepaid Meter Tokens Online'
        };
    }

    // 11. VTU Guides / Competitor comparison / Default
    return {
        badge: 'Top-Rated VTU & Telecom Hub',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
        title: 'Start Your Profitable VTU Business on Ufriends',
        description: 'Earn daily income selling data, airtime, bill payments, and identity services. Direct API access, wholesale margins, and 24/7 automated delivery.',
        primaryText: 'Join Reseller Program',
        primaryUrl: '/reseller',
        secondaryText: 'Create Free Account',
        secondaryUrl: '/register',
        stickyShort: 'Start VTU Reselling Today'
    };
}

// ─── BlogPost page ────────────────────────────────────────────────────────────
export default function BlogPost() {
    const { slug } = useParams();
    const post = BLOG_POSTS.find((p) => p.slug === slug);

    const [showMobileSticky, setShowMobileSticky] = useState(false);
    const [dismissedSticky, setDismissedSticky] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (dismissedSticky) return;
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (totalHeight <= 0) return;
            const scrollPct = window.scrollY / totalHeight;
            if (scrollPct > 0.18) {
                setShowMobileSticky(true);
            } else {
                setShowMobileSticky(false);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [dismissedSticky]);

    if (!post) return <Navigate to="/blog" replace />;

    const ctaConfig = getContextualCta(post, slug);

    const postData = allBlogPosts[slug] || post;
    const publishedDate = new Intl.DateTimeFormat('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(post.publishedAt));
    const updatedDate = postData?.updatedAt ? new Intl.DateTimeFormat('en-NG', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(postData.updatedAt)) : null;

    const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt,
        datePublished: post.publishedAt,
        dateModified: postData?.updatedAt || post.publishedAt,
        author: {
            '@type': 'Person',
            name: 'Engr. Munier & Ufriends Fintech Research Group',
            jobTitle: 'Lead Telecom Systems & Identity Specialist',
            url: 'https://www.ufriends.com.ng/about',
        },
        publisher: {
            '@type': 'Organization',
            '@id': 'https://www.ufriends.com.ng/#organization',
            name: 'Ufriends IT',
            logo: { '@type': 'ImageObject', url: 'https://www.ufriends.com.ng/favicon.svg' },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': `https://www.ufriends.com.ng/blog/${slug}` },
        keywords: post.keywords.join(', '),
    };

    // Extract FAQ and Review schema if available in post content
    const faqSection = postData?.sections?.find(s => s.type === 'faq');
    const graph = [articleSchema];

    if (postData?.reviewTarget) {
        graph.push({
            '@type': 'Review',
            name: `${postData.reviewTarget.name} Review 2026`,
            reviewBody: post.excerpt,
            itemReviewed: {
                '@type': 'SoftwareApplication',
                name: postData.reviewTarget.name,
                operatingSystem: postData.reviewTarget.os || 'Android, Web',
                applicationCategory: 'BusinessApplication',
                url: postData.reviewTarget.url,
            },
            reviewRating: {
                '@type': 'Rating',
                ratingValue: postData.reviewTarget.rating || '4.2',
                bestRating: '5',
            },
            author: {
                '@type': 'Organization',
                name: 'Ufriends IT Research Team',
            },
        });
    }

    if (faqSection && Array.isArray(faqSection.items) && faqSection.items.length > 0) {
        graph.push({
            '@type': 'FAQPage',
            mainEntity: faqSection.items.map(item => ({
                '@type': 'Question',
                name: item.q || item.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.a || item.answer
                }
            }))
        });
    }

    const pageSchema = graph.length > 1 ? {
        '@context': 'https://schema.org',
        '@graph': graph
    } : articleSchema;

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
                canonical={`https://www.ufriends.com.ng/blog/${slug}`}
                schema={pageSchema}
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
                            {updatedDate && (
                                <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full font-semibold border border-blue-100">
                                    Updated {updatedDate}
                                </span>
                            )}
                            <span className="text-xs text-gray-500 font-medium">By Engr. Munier &amp; Ufriends Research Team</span>
                            <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                <Clock size={11} aria-hidden="true" />
                                <time dateTime={`PT${post.readMin}M`}>{post.readMin} min read</time>
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

                        {/* Context-Aware Dynamic Conversion CTA */}
                        <div className="mt-14 bg-gradient-to-br from-primary via-[#003570] to-[#002244] rounded-2xl p-8 md:p-11 text-white shadow-xl relative overflow-hidden border border-white/10">
                            <div className="relative z-10 max-w-2xl mx-auto text-center">
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border ${ctaConfig.badgeColor}`}>
                                    <ShieldCheck size={13} aria-hidden="true" />
                                    <span>{ctaConfig.badge}</span>
                                </div>
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-3 text-white" style={{ textWrap: 'balance' }}>
                                    {ctaConfig.title}
                                </h2>
                                <p className="text-white/80 mb-8 text-sm md:text-base leading-relaxed" style={{ textWrap: 'pretty' }}>
                                    {ctaConfig.description}
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
                                    <Link
                                        to={ctaConfig.primaryUrl}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-primary font-bold px-7 py-3.5 rounded-xl text-sm hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                    >
                                        {ctaConfig.primaryText}
                                        <ArrowRight size={15} aria-hidden="true" />
                                    </Link>
                                    {ctaConfig.secondaryText && ctaConfig.secondaryUrl && (
                                        <Link
                                            to={ctaConfig.secondaryUrl}
                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3.5 rounded-xl text-sm border border-white/20 transition-all duration-200"
                                        >
                                            {ctaConfig.secondaryText}
                                        </Link>
                                    )}
                                </div>
                            </div>
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

                {/* Mobile Sticky Bottom Conversion Bar */}
                {showMobileSticky && !dismissedSticky && (
                    <div className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-[#001d3d]/95 backdrop-blur-md border-t border-white/15 px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                            <p className="text-xs font-semibold text-white truncate">
                                {ctaConfig.stickyShort}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Link
                                to={ctaConfig.primaryUrl}
                                className="bg-primary hover:bg-[#003570] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md transition-colors whitespace-nowrap"
                            >
                                Start →
                            </Link>
                            <button
                                type="button"
                                onClick={() => setDismissedSticky(true)}
                                className="text-white/60 hover:text-white p-1"
                                aria-label="Dismiss sticky conversion bar"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>
                )}

                <LandingFooter />
            </div>
        </>
    );
}
