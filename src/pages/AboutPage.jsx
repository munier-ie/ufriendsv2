import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import PageMeta from '../components/seo/PageMeta';

// ─── About Page JSON-LD Schema ──────────────────────────────────────────────
const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Ufriends IT',
    description: "Ufriends IT is Nigeria's all-in-one digital services platform. We make buying airtime, data, NIN slips, BVN slips, electricity bills, cable TV, exam pins and CAC registration simple, fast and affordable.",
    url: 'https://ufriends.com.ng/about',
    mainEntity: {
        '@type': 'Organization',
        '@id': 'https://ufriends.com.ng/#organization',
    }
};

const SERVICES = [
    {
        number: '01',
        title: 'Buy Airtime & Data',
        description: "We work with all four major networks — MTN, Airtel, Glo, and 9mobile — to give you the cheapest airtime and data rates in Nigeria. No hidden charges, no failed transactions. You top up instantly, straight to any number in Nigeria. If you're a reseller or run an agent business, our SME data and bulk airtime options are built exactly for you.",
        bullets: ['MTN, Airtel, Glo & 9mobile', 'SME Data at unbeatable rates', 'Instant delivery — no delays', 'Bulk purchase for resellers'],
    },
    {
        number: '02',
        title: 'Pay Electricity & Cable TV Bills',
        description: "Forget the long queue at the utility office. On Ufriends IT, you can pay your NEPA/PHCN electricity bill and get a token delivered to your email or screen in under 60 seconds — any disco, any time. Same goes for DStv, GOtv, and Startimes subscriptions. No third-party cashback delay. Just fast, reliable payment that keeps your lights on and your TV running.",
        bullets: ['All DISCO providers covered', 'DStv, GOtv & Startimes', 'Instant token delivery', '24/7 — even on weekends and holidays'],
    },
    {
        number: '03',
        title: 'Print Your NIN Slip Online',
        description: "You no longer need to travel to a NIMC office or spend money at a cybercafe. With Ufriends IT, you can print your NIN slip from your phone or laptop in minutes. We offer Regular, Standard, Premium, and VNIN formats — all officially processed and ready to download. Thousands of Nigerians have used this service to get their ID documents without leaving home.",
        bullets: ['Regular, Standard & Premium formats', 'VNIN generation supported', 'No NIMC office visit required', 'Downloadable PDF, ready to print'],
    },
    {
        number: '04',
        title: 'BVN Modification & Slip Printing',
        description: "Errors on your BVN — a wrong name, wrong date of birth, wrong phone number — can lock you out of your bank account and government services. Ufriends IT helps you fix those errors quickly through our BVN modification service. We also let you print your BVN slip for verification or institutional submission, saving you a bank visit and hours of waiting.",
        bullets: ['Name, DOB & phone number correction', 'BVN slip printing for verification', 'Fast turnaround on all requests', 'Secure and privacy-compliant'],
    },
    {
        number: '05',
        title: 'CAC Business Registration',
        description: "Starting a business in Nigeria used to mean trips to the CAC office, paperwork, and weeks of waiting. We've simplified that. Whether you're registering a sole proprietorship, a business name, or a private limited company, our platform walks you through the entire process digitally. We handle the filings, the fee submissions, and keep you updated every step of the way.",
        bullets: ['Sole proprietorship & business name', 'Private limited company (Ltd)', 'Fully digital — no CAC office visit', 'End-to-end document processing'],
    },
    {
        number: '06',
        title: 'Exam Pins, Agency Banking & More',
        description: "Beyond the core services, Ufriends IT also helps you purchase WAEC, NECO, and JAMB result checker pins; apply for a POS terminal to become an agent and earn daily commissions; verify identities and documents; and access our professional training programs in fintech and digital skills. Everything you need to thrive in Nigeria's digital economy, in one platform.",
        bullets: ['WAEC, NECO, JAMB & NABTEB pins', 'POS terminal application', 'Identity & document verification', 'Digital skills & fintech training'],
    }
];

const STATS = [
    { value: '10K+', label: 'Nigerians served' },
    { value: '₦500k+', label: 'Transactions processed' },
    { value: '97.3%', label: 'Platform uptime' },
    { value: '2025', label: 'Year we started' },
];

const PROMISES = [
    { title: 'No hidden fees, ever', description: 'What you see is what you pay. Every price on our platform is final — no surprise charges at checkout.' },
    { title: 'Instant delivery or a refund', description: "If your transaction doesn't go through within our promised time, we make it right. No arguments, no delays." },
    { title: 'Your data stays private', description: "We do not sell, share, or expose your personal information to anyone. Your identity and financial data are yours alone." },
    { title: 'Support that actually responds', description: "Real people handle your issues. We're reachable via chat and WhatsApp — not a bot that loops you around a FAQ page." },
];

const fadeUp = {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.55 },
};

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white overflow-x-hidden">
            {/* ─── SEO Meta Tags + JSON-LD Schema ─── */}
            <PageMeta
                title="About Ufriends IT — Nigeria's All-In-One Digital Services Platform"
                description="Ufriends IT is Nigeria's leading VTU and digital services platform. Buy data, airtime, print NIN/BVN slips, pay bills, register a business with CAC, and more — from your phone in minutes."
                canonical="https://ufriends.com.ng/about"
                schema={aboutSchema}
            />

            <LandingNavbar />

            <main className="pt-24 lg:pt-32">

                {/* ─── HERO ─── */}
                <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
                    {/* Dashed tile overlay — hero only */}
                    <div
                        className="absolute inset-0 z-0 pointer-events-none"
                        style={{
                            backgroundImage: `
                                linear-gradient(to right, #e7e5e4 1px, transparent 1px),
                                linear-gradient(to bottom, #e7e5e4 1px, transparent 1px)
                            `,
                            backgroundSize: '20px 20px',
                            maskImage: `
                                repeating-linear-gradient(to right, black 0px, black 3px, transparent 3px, transparent 8px),
                                repeating-linear-gradient(to bottom, black 0px, black 3px, transparent 3px, transparent 8px),
                                radial-gradient(ellipse 80% 80% at 50% 50%, #000 40%, transparent 80%)
                            `,
                            WebkitMaskImage: `
                                repeating-linear-gradient(to right, black 0px, black 3px, transparent 3px, transparent 8px),
                                repeating-linear-gradient(to bottom, black 0px, black 3px, transparent 3px, transparent 8px),
                                radial-gradient(ellipse 80% 80% at 50% 50%, #000 40%, transparent 80%)
                            `,
                            maskComposite: 'intersect',
                            WebkitMaskComposite: 'source-in',
                        }}
                    />
                    <motion.div {...fadeUp} className="relative z-10">
                        <span className="inline-block text-sm font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-6 tracking-wide">
                            About Ufriends IT
                        </span>
                        <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-gray-900 leading-tight mb-6">
                            We built the platform we <br className="hidden sm:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1e90ff] to-[#004687]">wished existed in Nigeria.</span>
                        </h1>
                        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                            Ufriends IT was created because too many Nigerians were paying too much, waiting too long, and getting too little from digital service providers. We decided to fix that.
                        </p>
                    </motion.div>
                </section>

                {/* ─── STATS BAND ─── */}
                <section className="bg-[#003080] py-12">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
                        {STATS.map((s, i) => (
                            <motion.div
                                key={s.label}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.08 }}
                                className="text-center"
                            >
                                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{s.value}</div>
                                <div className="text-sm text-gray-400">{s.label}</div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ─── OUR STORY ─── */}
                <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
                    <motion.div {...fadeUp} className="mb-10">
                        <span className="text-xs font-bold text-primary uppercase tracking-widest block mb-4">Our Story</span>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 leading-snug">
                            From a simple idea to over<br className="hidden sm:block" /> 50,000 Nigerians trusting us every day.
                        </h2>
                    </motion.div>
                    <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
                        <motion.p {...fadeUp}>
                            The story of Ufriends IT starts with a frustration most Nigerians know intimately: you need to buy data urgently, the network USSD is down, the third-party app charges a ₦50 "convenience fee," and the transaction still fails. You've lost money, time, and patience — all before your day even begins.
                        </motion.p>
                        <motion.p {...fadeUp} transition={{ duration: 0.55, delay: 0.08 }}>
                            We started Ufriends IT in 2025 with one goal: build a platform that actually works for Nigerians. Not a flashy app that's slow on a budget Android. Not a platform that offers competitive prices only to quietly expire in 48 hours. A real, reliable platform where a student in Kano, a trader in Aba, a civil servant in Abuja, and a tech entrepreneur in Lagos can all get the same quality service, at honest prices, without stress.
                        </motion.p>
                        <motion.p {...fadeUp} transition={{ duration: 0.55, delay: 0.14 }}>
                            Today, Ufriends IT — founded in 2025 — is one of Nigeria's fastest-growing digital service platforms, covering everything from VTU services and bill payments, to government identity services like NIN and BVN, to full business registration with the CAC. And we're not done building.
                        </motion.p>
                    </div>
                </section>

                {/* ─── SERVICES DETAIL ─── */}
                <section className="bg-gray-50 py-20 lg:py-28">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div {...fadeUp} className="mb-16 max-w-2xl">
                            <span className="text-xs font-bold text-primary uppercase tracking-widest block mb-4">What We Do</span>
                            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-snug">
                                Everything digital, under one roof.
                            </h2>
                            <p className="mt-4 text-lg text-gray-500">
                                Here is a full breakdown of the services available on Ufriends IT — and why thousands of Nigerians use us over the alternatives.
                            </p>
                        </motion.div>

                        <div className="space-y-8">
                            {SERVICES.map((svc, i) => (
                                <motion.div
                                    key={svc.number}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.05 }}
                                    className="bg-white rounded-2xl p-8 md:p-10 border border-gray-100 hover:border-primary/20 hover:shadow-md transition-all duration-300 grid md:grid-cols-5 gap-8 items-start"
                                >
                                    <div className="md:col-span-3">
                                        <div className="text-5xl font-black text-gray-100 mb-3 select-none leading-none">{svc.number}</div>
                                        <h3 className="text-2xl font-bold text-gray-900 mb-4">{svc.title}</h3>
                                        <p className="text-gray-600 leading-relaxed text-base">{svc.description}</p>
                                    </div>
                                    <ul className="md:col-span-2 space-y-3 self-center">
                                        {svc.bullets.map((b) => (
                                            <li key={b} className="flex items-start gap-3 text-sm text-gray-700">
                                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                                {b}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── OUR PROMISES ─── */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
                    <motion.div {...fadeUp} className="text-center mb-16">
                        <span className="text-xs font-bold text-primary uppercase tracking-widest block mb-4">Our Promises to You</span>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">We say what we mean, and we mean it.</h2>
                        <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
                            These aren't marketing lines. They are commitments we hold ourselves accountable to, every single day.
                        </p>
                    </motion.div>

                    <div className="grid sm:grid-cols-2 gap-6">
                        {PROMISES.map((p, i) => (
                            <motion.div
                                key={p.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.45, delay: i * 0.08 }}
                                className="border border-gray-100 rounded-2xl p-8 hover:border-primary/30 hover:shadow-sm transition-all duration-300"
                            >
                                <h3 className="text-lg font-bold text-gray-900 mb-3">{p.title}</h3>
                                <p className="text-gray-500 leading-relaxed text-sm">{p.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ─── WHO WE SERVE ─── */}
                <section className="bg-[#001F5B] text-white py-20 lg:py-28">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div {...fadeUp}>
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-4">Who We Serve</span>
                            <h2 className="text-3xl sm:text-4xl font-bold leading-snug mb-6">
                                Students, agents, traders, entrepreneurs — this platform is for all of you.
                            </h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-6">
                                Ufriends IT isn't built for a single audience. We've designed our platform to be genuinely useful for any Nigerian who deals with digital transactions — whether you're doing it for personal use or running a business around it.
                            </p>
                            <p className="text-gray-400 text-lg leading-relaxed">
                                Our agent and reseller program has helped hundreds of Nigerians turn Ufriends IT into a daily income stream — selling data, airtime, and services to their local community while earning competitive commissions.
                            </p>
                        </motion.div>
                        <div className="space-y-4">
                            {[
                                { label: 'Students', desc: 'Cheap data, WAEC/JAMB pins, and fast NIN slips without leaving campus.' },
                                { label: 'Traders & Small Business Owners', desc: 'Pay bills, register your CAC business name, and request a POS terminal in minutes.' },
                                { label: 'Agents & Resellers', desc: 'Access our wholesale VTU rates and earn commission on every sale you make.' },
                                { label: 'Civil Servants & Professionals', desc: 'Fix BVN errors, print NIN slips, and handle government service needs from your office.' },
                            ].map((item, i) => (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, x: 24 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.45, delay: i * 0.09 }}
                                    className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors"
                                >
                                    <div className="font-semibold text-white mb-1">{item.label}</div>
                                    <div className="text-gray-400 text-sm leading-relaxed">{item.desc}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── CTA ─── */}
                <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center">
                    <motion.div {...fadeUp}>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                            Ready to stop overpaying and start getting things done?
                        </h2>
                        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10">
                            Create a free account on Ufriends IT today. No subscription fee, no commitment. Just fast, reliable digital services — whenever you need them.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/register"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#1e90ff] to-[#004687] text-white font-bold text-lg rounded-xl hover:from-[#1e90ff]/90 hover:to-[#004687]/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                Create Free Account <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-200 text-gray-700 font-bold text-lg rounded-xl hover:border-primary hover:text-primary transition-colors"
                            >
                                Login
                            </Link>
                        </div>
                    </motion.div>
                </section>

            </main>

            <LandingFooter />
        </div>
    );
}
