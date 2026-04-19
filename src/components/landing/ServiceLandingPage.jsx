import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LogIn, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import PageMeta from '../seo/PageMeta';
import LandingNavbar from './LandingNavbar';
import LandingFooter from './LandingFooter';

// ─── Skip-to-main link for accessibility ────────────────────────────────────
function SkipLink() {
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
        >
            Skip to main content
        </a>
    );
}

// ─── Collapsible FAQ item ────────────────────────────────────────────────────
function FaqItem({ q, a }) {
    const [open, setOpen] = React.useState(false);
    const id = React.useId();

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
                type="button"
                aria-expanded={open}
                aria-controls={`faq-answer-${id}`}
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors hover:bg-gray-50"
            >
                <span className="font-semibold text-gray-900 text-sm md:text-base">{q}</span>
                {open
                    ? <ChevronUp size={18} className="shrink-0 text-primary" aria-hidden="true" />
                    : <ChevronDown size={18} className="shrink-0 text-gray-400" aria-hidden="true" />
                }
            </button>
            <div
                id={`faq-answer-${id}`}
                role="region"
                hidden={!open}
                className="px-6 pb-5 text-gray-600 text-sm leading-relaxed"
            >
                {a}
            </div>
        </div>
    );
}

// ─── Steps (How It Works) ────────────────────────────────────────────────────
const HOW_STEPS = [
    { n: 1, title: 'Create Free Account', body: 'Sign up in under 60 seconds — no hidden fees or commitments.' },
    { n: 2, title: 'Fund Your Wallet', body: 'Add money via bank transfer to your dedicated virtual account instantly.' },
    { n: 3, title: 'Access Any Service', body: 'All services are available from your dashboard — choose and proceed.' },
];

/**
 * ServiceLandingPage — Universal SEO service page template.
 *
 * Design principles applied:
 * - Brand colors only: primary (#004687 navy), secondary (#1E90FF blue)
 * - Lucide icons only — no emoji
 * - Accessible: skip link, aria-expanded FAQs, aria-hidden decorative icons, focus-visible rings
 * - Headings hierarchy: h1 → h2 → h3
 * - text-wrap: balance on headings
 * - Explicit hover/focus states on all interactive elements
 * - Each page is code-split via React.lazy at the App.jsx level
 *
 * @param {string}   metaTitle       - Page <title> (brand suffix auto-appended)
 * @param {string}   metaDescription - Meta description (150–160 chars)
 * @param {string}   canonical       - Full canonical URL
 * @param {object}   schema          - FAQPage or Service JSON-LD
 * @param {string}   h1              - Primary heading
 * @param {string}   subtitle        - Lead paragraph under h1
 * @param {string}   badge           - Small badge text above h1
 * @param {string}   ctaText         - Primary CTA label
 * @param {string}   ctaLink         - Primary CTA href
 * @param {Array}    benefits        - [{Icon (Lucide), title, body}]
 * @param {Array}    faqs            - [{q, a}]
 */
export default function ServiceLandingPage({
    metaTitle,
    metaDescription,
    canonical,
    schema,
    h1,
    subtitle,
    badge,
    ctaText = 'Get Started Free',
    ctaLink = '/register',
    benefits = [],
    faqs = [],
}) {
    return (
        <>
            <SkipLink />
            <PageMeta
                title={metaTitle}
                description={metaDescription}
                canonical={canonical}
                schema={schema}
            />

            <div className="min-h-screen bg-[#f3fcfd] overflow-x-hidden">
                <LandingNavbar />

                {/* ═══ HERO ════════════════════════════════════════════════ */}
                <section
                    id="main-content"
                    aria-labelledby="hero-heading"
                    className="relative bg-white overflow-hidden"
                >
                    {/* Subtle background blobs — decorative */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0"
                    >
                        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-secondary/8 blur-3xl" />
                        <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
                    </div>

                    {/* Thin top accent line using brand blue */}
                    <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-primary" aria-hidden="true" />

                    <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 md:pt-28 md:pb-32 text-center">
                        {/* Badge */}
                        {badge && (
                            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
                                <span
                                    className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"
                                    aria-hidden="true"
                                />
                                {badge}
                            </div>
                        )}

                        {/* H1 — balanced text wrap for clean breaks */}
                        <h1
                            id="hero-heading"
                            className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-gray-900 leading-tight mb-5"
                            style={{ textWrap: 'balance' }}
                        >
                            {h1}
                        </h1>

                        {/* Subtitle */}
                        <p
                            className="text-base md:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10"
                            style={{ textWrap: 'pretty' }}
                        >
                            {subtitle}
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to={ctaLink}
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-secondary to-primary text-white font-semibold px-8 py-3.5 rounded-xl text-sm md:text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                {ctaText}
                                <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 border border-primary/30 text-primary font-semibold px-8 py-3.5 rounded-xl text-sm md:text-base hover:bg-primary/5 hover:border-primary transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                <LogIn size={16} aria-hidden="true" />
                                Log In to Dashboard
                            </Link>
                        </div>

                        {/* Trust strip */}
                        <p className="mt-8 text-xs text-gray-400 font-medium tracking-wide">
                            Trusted by thousands of Nigerians — instant delivery, no hidden fees
                        </p>
                    </div>
                </section>

                {/* ═══ BENEFITS ════════════════════════════════════════════ */}
                {benefits.length > 0 && (
                    <section
                        aria-labelledby="benefits-heading"
                        className="py-20 md:py-24 px-4 bg-[#f3fcfd]"
                    >
                        <div className="max-w-5xl mx-auto">
                            <h2
                                id="benefits-heading"
                                className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-3"
                                style={{ textWrap: 'balance' }}
                            >
                                Why Choose Ufriends IT?
                            </h2>
                            <p className="text-sm text-gray-500 text-center mb-12 max-w-lg mx-auto">
                                Nigeria's most complete digital services platform — built for speed, security, and simplicity.
                            </p>

                            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
                                {benefits.map((b, i) => {
                                    const Icon = b.Icon;
                                    return (
                                        <div
                                            key={i}
                                            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-secondary/20 transition-[box-shadow,border-color] duration-200"
                                        >
                                            <div
                                                className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center mb-4"
                                                aria-hidden="true"
                                            >
                                                {Icon && <Icon size={22} className="text-primary" aria-hidden="true" />}
                                            </div>
                                            <h3 className="font-bold text-gray-900 mb-2 text-sm md:text-base">
                                                {b.title}
                                            </h3>
                                            <p className="text-gray-500 text-sm leading-relaxed">
                                                {b.body}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* ═══ HOW IT WORKS ════════════════════════════════════════ */}
                <section
                    aria-labelledby="how-heading"
                    className="py-20 md:py-24 px-4 bg-white border-y border-gray-100"
                >
                    <div className="max-w-4xl mx-auto">
                        <h2
                            id="how-heading"
                            className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-12"
                            style={{ textWrap: 'balance' }}
                        >
                            Get Started in 3 Simple Steps
                        </h2>

                        <ol className="grid md:grid-cols-3 gap-8" role="list">
                            {HOW_STEPS.map((s) => (
                                <li
                                    key={s.n}
                                    className="flex flex-col items-center text-center"
                                >
                                    <div
                                        className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-bold text-lg mb-4 shadow-lg shadow-primary/20"
                                        aria-hidden="true"
                                    >
                                        {s.n}
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-1.5 text-sm md:text-base">
                                        {s.title}
                                    </h3>
                                    <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                                        {s.body}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* ═══ FAQ ═════════════════════════════════════════════════ */}
                {faqs.length > 0 && (
                    <section
                        aria-labelledby="faq-heading"
                        className="py-20 md:py-24 px-4 bg-[#f3fcfd]"
                        id="faq"
                    >
                        <div className="max-w-3xl mx-auto">
                            <h2
                                id="faq-heading"
                                className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-3"
                                style={{ textWrap: 'balance' }}
                            >
                                Frequently Asked Questions
                            </h2>
                            <p className="text-sm text-gray-500 text-center mb-10">
                                Still have questions?{' '}
                                <Link
                                    to="/register"
                                    className="text-secondary font-semibold underline underline-offset-2 hover:text-primary transition-colors duration-150"
                                >
                                    Create an account
                                </Link>{' '}
                                and our support team will help.
                            </p>

                            <div className="space-y-3">
                                {faqs.map((faq, i) => (
                                    <FaqItem key={i} q={faq.q} a={faq.a} />
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* ═══ BOTTOM CTA ══════════════════════════════════════════ */}
                <section
                    aria-labelledby="cta-heading"
                    className="py-20 md:py-24 px-4 bg-gradient-to-br from-primary to-[#003570] text-white"
                >
                    <div className="max-w-2xl mx-auto text-center">
                        <div
                            className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase backdrop-blur-sm"
                        >
                            <CheckCircle2 size={12} aria-hidden="true" />
                            Free to get started
                        </div>

                        <h2
                            id="cta-heading"
                            className="text-2xl md:text-4xl font-bold mb-4 leading-tight"
                            style={{ textWrap: 'balance' }}
                        >
                            Ready to Get Started?
                        </h2>
                        <p className="text-white/70 mb-8 text-base leading-relaxed">
                            Join thousands of Nigerians using Ufriends IT every day for data, government services, bills, and more.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to={ctaLink}
                                className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-3.5 rounded-xl text-sm md:text-base hover:bg-gray-50 hover:-translate-y-0.5 transition-[transform,background-color] duration-200 shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                {ctaText}
                                <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl text-sm md:text-base hover:bg-white/10 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                <LogIn size={16} aria-hidden="true" />
                                Log In
                            </Link>
                        </div>
                    </div>
                </section>

                <LandingFooter />
            </div>
        </>
    );
}
