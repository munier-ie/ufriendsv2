import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Tag, ChevronRight } from 'lucide-react';
import PageMeta from '../../components/seo/PageMeta';
import LandingNavbar from '../../components/landing/LandingNavbar';
import LandingFooter from '../../components/landing/LandingFooter';

// ─── Blog post catalogue ─────────────────────────────────────────────────────
// Slug → metadata. Add new articles here to auto-publish them.
export const BLOG_POSTS = [
    {
        slug: 'how-to-print-nin-slip-online-nigeria',
        title: 'How to Print Your NIN Slip Online in Nigeria (2025 Guide)',
        excerpt: 'Step-by-step guide to printing your NIN slip online in Nigeria using Ufriends IT — Regular, Standard, Premium and VNIN formats explained.',
        category: 'Government Services',
        readMin: 4,
        publishedAt: '2026-04-19',
        keywords: ['NIN slip', 'print NIN slip Nigeria', 'NIMC slip'],
    },
    {
        slug: 'how-to-modify-bvn-nigeria',
        title: 'How to Modify Your BVN in Nigeria — Complete 2025 Guide',
        excerpt: 'Need to correct your BVN name, date of birth, or phone number? This guide covers every method available in Nigeria, including the fastest online option.',
        category: 'Banking Identity',
        readMin: 5,
        publishedAt: '2026-04-19',
        keywords: ['BVN modification Nigeria', 'change BVN phone number', 'BVN correction'],
    },
    {
        slug: 'cheapest-data-plans-nigeria-2025',
        title: 'Cheapest Data Plans in Nigeria 2025 — MTN, Airtel, Glo & 9mobile Compared',
        excerpt: 'A comprehensive breakdown of the cheapest data plans available across all four Nigerian networks in 2025, including SME data, Corporate Gifting, and more.',
        category: 'Data & Airtime',
        readMin: 6,
        publishedAt: '2026-04-19',
        keywords: ['cheapest data Nigeria 2025', 'MTN SME data', 'cheap data plans Nigeria'],
    },
    {
        slug: 'how-to-retrieve-bvn-with-phone-number-nigeria',
        title: 'How to Retrieve Your BVN With Your Phone Number in Nigeria',
        excerpt: "Lost your Bank Verification Number? Here's how to retrieve your BVN using your registered phone number in Nigeria — official methods explained.",
        category: 'Banking Identity',
        readMin: 4,
        publishedAt: '2026-04-19',
        keywords: ['BVN retrieval phone number', 'how to check BVN Nigeria', 'retrieve BVN Nigeria'],
    },
    {
        slug: 'how-to-pay-dstv-subscription-online-nigeria',
        title: 'How to Pay Your DStv Subscription Online in Nigeria in 2025',
        excerpt: 'The easiest ways to subscribe or renew your DStv package online in Nigeria — including how to change your plan and avoid common payment errors.',
        category: 'Cable TV',
        readMin: 3,
        publishedAt: '2026-04-19',
        keywords: ['pay DStv online Nigeria', 'DStv subscription Nigeria', 'subscribe DStv online'],
    },
    {
        slug: 'how-to-pay-electricity-bill-online-nigeria',
        title: 'How to Pay Electricity Bill Online in Nigeria for All DISCOs',
        excerpt: 'Full guide to paying your electricity bills online in Nigeria for Ikeja, Eko, Abuja, Kano, Port Harcourt, Jos, Ibadan and Kaduna DISCOs.',
        category: 'Utility Bills',
        readMin: 5,
        publishedAt: '2026-04-19',
        keywords: ['pay electricity bill online Nigeria', 'DISCO online payment', 'IKEDC payment online'],
    },
    {
        slug: 'how-to-buy-waec-pin-online-nigeria',
        title: 'How to Buy WAEC Result Checker PIN Online in Nigeria 2025',
        excerpt: 'Get your WAEC result checker PIN delivered instantly online. This guide covers the fastest and safest methods to buy WAEC pins without visiting a bank.',
        category: 'Education',
        readMin: 3,
        publishedAt: '2026-04-19',
        keywords: ['buy WAEC pin online Nigeria', 'WAEC result checker PIN', 'WAEC pin 2025'],
    },
    {
        slug: 'how-to-register-business-cac-online-nigeria',
        title: 'How to Register a Business with CAC Online in Nigeria 2025',
        excerpt: 'Complete step-by-step guide to registering a Business Name, LTD, or NGO with the Corporate Affairs Commission (CAC) online in Nigeria in 2025.',
        category: 'Business Registration',
        readMin: 7,
        publishedAt: '2026-04-19',
        keywords: ['CAC registration online Nigeria', 'register business name Nigeria', 'CAC 2025'],
    },
    {
        slug: 'nin-vs-bvn-difference-nigeria',
        title: 'NIN vs BVN in Nigeria — What Is the Difference?',
        excerpt: 'Many Nigerians confuse NIN and BVN. This article explains the difference between your National Identification Number and Bank Verification Number, how they are used, and why both matter.',
        category: 'Government Services',
        readMin: 4,
        publishedAt: '2026-04-19',
        keywords: ['NIN vs BVN Nigeria', 'difference between NIN and BVN', 'NIN BVN Nigeria'],
    },
    {
        slug: 'best-vtu-website-nigeria-2025',
        title: 'Best VTU Websites in Nigeria 2025 — Honest Comparison',
        excerpt: "Looking for the best VTU platform in Nigeria? We compare the top 5 VTU websites on price, speed, services, reliability, and government service features — including ones others don't offer.",
        category: 'VTU Guides',
        readMin: 8,
        publishedAt: '2026-04-19',
        keywords: ['best VTU website Nigeria 2025', 'cheapest VTU platform Nigeria', 'VTU comparison Nigeria'],
    },
    {
        slug: 'how-to-get-pos-terminal-nigeria',
        title: 'How to Get a POS Terminal in Nigeria — Complete Guide',
        excerpt: 'Want to start a POS business or need one for your shop? Learn how to request and get a POS machine easily from Ufriends and other providers in Nigeria.',
        category: 'VTU Guides',
        readMin: 6,
        publishedAt: '2026-04-19',
        keywords: ['POS terminal Nigeria', 'how to get POS machine', 'start POS business'],
    },
    {
        slug: 'how-to-convert-airtime-to-cash-nigeria',
        title: 'How to Convert Airtime to Cash in Nigeria (MTN, Airtel, Glo)',
        excerpt: 'Over-recharged your phone? Here is a simple guide on how to convert excess airtime back to cash directly into your bank account securely in Nigeria.',
        category: 'Data & Airtime',
        readMin: 4,
        publishedAt: '2026-04-19',
        keywords: ['convert airtime to cash Nigeria', 'sell airtime online', 'airtime to money'],
    },
    {
        slug: 'how-to-start-vtu-business-nigeria',
        title: 'How to Start a VTU Business in Nigeria (Beginner\'s Guide)',
        excerpt: 'A comprehensive step-by-step guide on how to start a profitable VTU business in Nigeria in 2025 without a large capital. Earn daily with data and airtime sales.',
        category: 'VTU Guides',
        readMin: 8,
        publishedAt: '2026-04-19',
        keywords: ['start VTU business Nigeria', 'VTU business guide', 'how to sell data'],
    },
    {
        slug: 'how-to-subscribe-gotv-online-nigeria',
        title: 'How to Subscribe GOtv Online in Nigeria — Add or Change Package',
        excerpt: 'Easily renew, upgrade, or downgrade your GOtv subscription online from anywhere in Nigeria. Learn the steps and USSD codes to fix frozen GOtv decoders.',
        category: 'Cable TV',
        readMin: 4,
        publishedAt: '2026-04-19',
        keywords: ['GOtv subscription Nigeria', 'subscribe GOtv online', 'GOtv packages'],
    },
    {
        slug: 'mtn-sme-data-nigeria',
        title: 'MTN SME Data in Nigeria — What Is It and How to Buy',
        excerpt: 'What exactly is MTN SME data, and why is it so cheap? Find out how you can buy and resell MTN SME data bundles for massive discounts.',
        category: 'Data & Airtime',
        readMin: 5,
        publishedAt: '2026-04-19',
        keywords: ['MTN SME data Nigeria', 'what is SME data', 'buy MTN SME'],
    },
    {
        slug: 'how-to-link-nin-to-bank-account-nigeria',
        title: 'How to Link Your NIN to Your Bank Account in Nigeria',
        excerpt: 'Avoid account restriction. Here are the official methods to link your National Identification Number (NIN) to your Nigerian bank accounts (Tier 1, 2, and 3).',
        category: 'Banking Identity',
        readMin: 4,
        publishedAt: '2026-04-19',
        keywords: ['link NIN to bank account', 'connect NIN to bank', 'NIN linkage'],
    },
    {
        slug: 'buy-cheap-airtel-data-online-nigeria',
        title: 'How to Buy Cheap Airtel Data Online Without Bank Charges',
        excerpt: 'Stop paying bank fees on data purchases. Discover the cheapest ways to buy Airtel data bundles and Corporate Gifting plans online instantly in Nigeria.',
        category: 'Data & Airtime',
        readMin: 4,
        publishedAt: '2026-04-19',
        keywords: ['buy Airtel data Nigeria', 'cheap Airtel plan', 'Airtel internet'],
    },
    {
        slug: 'nin-modification-portal-nigeria',
        title: 'NIN Modification Portal Nigeria — How to Correct Your NIN Online',
        excerpt: 'Did you make a mistake during NIN enrolment? Here is how to use the NIMC modification portal and platforms like Ufriends to correct your details fast.',
        category: 'Government Services',
        readMin: 5,
        publishedAt: '2026-04-19',
        keywords: ['NIN correction Nigeria', 'NIMC modification portal', 'change NIN dob'],
    },
    {
        slug: 'e-wallet-vs-virtual-account-nigeria',
        title: 'E-Wallet vs Virtual Account — Which is Better for Nigerians?',
        excerpt: 'Understanding the difference between standard E-Wallets and dedicated Virtual Bank Accounts for funding your VTU platform or online wallet.',
        category: 'Banking Identity',
        readMin: 5,
        publishedAt: '2026-04-19',
        keywords: ['virtual account Nigeria', 'e-wallet vs virtual account', 'Monnify virtual account'],
    },
    {
        slug: 'buy-cheap-glo-data-plans-nigeria-2025',
        title: 'How to Buy Cheap Glo Data Plans in Nigeria 2025',
        excerpt: 'Glo is the Grandmasters of Data. Learn about their cheapest monthly, weekly, and mega data plans in 2025 and how to buy them online with discounts.',
        category: 'Data & Airtime',
        readMin: 4,
        publishedAt: '2026-04-19',
        keywords: ['buy Glo data Nigeria', 'Glo cheap plans', 'Glo internet 2025'],
    }
];

// ─── Category colour mapping (brand palette: navy + blue only) ───────────────
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

// ─── Blog card ───────────────────────────────────────────────────────────────
function BlogCard({ post }) {
    const catStyle = CATEGORY_STYLES[post.category] || 'bg-gray-100 text-gray-600';

    return (
        <article className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-secondary/20 transition-[box-shadow,border-color] duration-200 overflow-hidden group">
            {/* Thin accent top bar */}
            <div className="h-0.5 w-full bg-gradient-to-r from-primary to-secondary" aria-hidden="true" />

            <div className="p-6">
                {/* Category & read time */}
                <div className="flex items-center gap-3 mb-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${catStyle}`}>
                        <Tag size={10} aria-hidden="true" />
                        {post.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} aria-hidden="true" />
                        {post.readMin} min read
                    </span>
                </div>

                {/* Title */}
                <h2 className="font-bold text-gray-900 text-base md:text-lg mb-3 leading-snug" style={{ textWrap: 'balance' }}>
                    <Link
                        to={`/blog/${post.slug}`}
                        className="hover:text-primary transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        {post.title}
                    </Link>
                </h2>

                {/* Excerpt */}
                <p className="text-sm text-gray-500 leading-relaxed mb-5 line-clamp-3 min-w-0">
                    {post.excerpt}
                </p>

                {/* CTA link */}
                <Link
                    to={`/blog/${post.slug}`}
                    aria-label={`Read article: ${post.title}`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:text-primary transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary group-hover:gap-2.5 transition-[gap] duration-200"
                >
                    Read Article
                    <ArrowRight size={14} aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
}

// ─── Blog Index page ─────────────────────────────────────────────────────────
const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Ufriends IT Blog',
    url: 'https://ufriends.com.ng/blog',
    description: 'Guides, tips and tutorials on VTU services, NIN/BVN, data plans, electricity bills, cable TV subscriptions, and government services in Nigeria.',
    publisher: {
        '@type': 'Organization',
        '@id': 'https://ufriends.com.ng/#organization',
        name: 'Ufriends IT',
    },
};

export default function BlogIndex() {
    return (
        <>
            <PageMeta
                title="Blog — VTU, NIN, BVN & Government Services Guides for Nigerians"
                description="Ufriends IT Blog: step-by-step guides on buying cheap data, printing NIN/BVN slips, NIN/BVN modification, cable TV subscriptions, electricity bills, and government services in Nigeria."
                canonical="https://ufriends.com.ng/blog"
                schema={blogSchema}
            />

            <div className="min-h-screen bg-[#f3fcfd] overflow-x-hidden">
                <LandingNavbar />

                {/* ─── Page Header ─────────────────────────────────────── */}
                <section
                    aria-labelledby="blog-heading"
                    className="bg-white border-b border-gray-100"
                >
                    <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-primary" aria-hidden="true" />
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-24 md:pb-20">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-5 tracking-wide uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" aria-hidden="true" />
                            Ufriends IT Blog
                        </div>
                        <h1
                            id="blog-heading"
                            className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight"
                            style={{ textWrap: 'balance' }}
                        >
                            Guides & Tips for Nigerians
                        </h1>
                        <p className="text-base md:text-lg text-gray-500 max-w-2xl leading-relaxed" style={{ textWrap: 'pretty' }}>
                            Learn how to buy cheap data, print NIN/BVN slips, modify your identity records, pay bills, and get the most out of digital services in Nigeria.
                        </p>
                    </div>
                </section>

                {/* ─── Article Grid ─────────────────────────────────────── */}
                <main id="main-content" className="py-16 md:py-20 px-4">
                    <div className="max-w-5xl mx-auto">
                        {/* Breadcrumb */}
                        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-400 mb-10">
                            <Link to="/" className="hover:text-primary transition-colors duration-150">Home</Link>
                            <ChevronRight size={12} aria-hidden="true" />
                            <span className="text-gray-600 font-medium">Blog</span>
                        </nav>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {BLOG_POSTS.map((post) => (
                                <BlogCard key={post.slug} post={post} />
                            ))}
                        </div>
                    </div>
                </main>

                {/* ─── Bottom CTA ───────────────────────────────────────── */}
                <section
                    aria-labelledby="blog-cta"
                    className="py-16 px-4 bg-gradient-to-br from-primary to-[#003570] text-white text-center"
                >
                    <h2 id="blog-cta" className="text-2xl md:text-3xl font-bold mb-3" style={{ textWrap: 'balance' }}>
                        Ready to Use Ufriends IT?
                    </h2>
                    <p className="text-white/70 mb-7 text-sm md:text-base">
                        All services described in this blog are available on your free Ufriends IT account.
                    </p>
                    <Link
                        to="/register"
                        className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-3.5 rounded-xl text-sm md:text-base hover:bg-gray-50 transition-colors duration-200 shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        Create Free Account
                        <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                </section>

                <LandingFooter />
            </div>
        </>
    );
}
