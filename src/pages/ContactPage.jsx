import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Mail, Phone, MessageCircle, MapPin,
    Clock, Send, CheckCircle2, AlertCircle,
    ChevronDown
} from 'lucide-react';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';
import PageMeta from '../components/seo/PageMeta';

// ─── JSON-LD Schema ──────────────────────────────────────────────────────────
const contactSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Ufriends IT',
    description: 'Get in touch with Ufriends IT support team via email, WhatsApp, or our contact form.',
    url: 'https://ufriends.com.ng/contact',
    mainEntity: {
        '@type': 'Organization',
        '@id': 'https://ufriends.com.ng/#organization',
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            availableLanguage: 'English',
            areaServed: 'NG',
        },
    },
};

const FAQS = [
    {
        q: 'How long does it take to get a response?',
        a: 'We respond to all messages within 24 hours on business days. For urgent issues, WhatsApp is your fastest option — we typically reply within minutes.',
    },
    {
        q: 'My transaction failed but money was deducted. What do I do?',
        a: 'Please contact us immediately with your transaction reference number. Failed deductions are automatically reversed within 24 hours, but we can expedite it for you.',
    },
    {
        q: 'Can I get a refund on a completed transaction?',
        a: 'Refunds are assessed case by case. Send us your transaction reference, and our team will review and respond within 24 hours.',
    },
    {
        q: 'I can\'t log into my account. How do I get help?',
        a: 'Use the "Forgot Password" link on the login page to reset your credentials. If you\'re still stuck, reach out to us via WhatsApp with your registered phone number.',
    },
    {
        q: 'How do I become a reseller or agent on Ufriends IT?',
        a: 'Log into your dashboard and navigate to the "Upgrade Account" section. You can upgrade to Agent or Vendor tier directly from there. Contact us if you need guidance.',
    },
];

const SUBJECTS = [
    'Transaction Issue',
    'Account Access / Login',
    'Billing & Refunds',
    'NIN / BVN Services',
    'CAC Registration',
    'Agency Banking / POS',
    'Become a Reseller',
    'Partnership / Business',
    'Technical Bug',
    'Other',
];

const fadeUp = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 },
};

export default function ContactPage() {
    const [settings, setSettings] = useState({ contactWhatsapp: '', siteEmail: '', sitePhone: '' });
    const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
    const [status, setStatus] = useState('idle'); // idle | loading | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const [openFaq, setOpenFaq] = useState(null);

    // Fetch public contact settings (WhatsApp, phone, email)
    useEffect(() => {
        fetch('/api/admin/config/public-settings')
            .then(r => r.json())
            .then(data => {
                if (data?.settings) setSettings(s => ({ ...s, ...data.settings }));
            })
            .catch(() => {}); // silently ignore — fallback values used
    }, []);

    const handleChange = useCallback(e => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleSubmit = async e => {
        e.preventDefault();
        setStatus('loading');
        setErrorMsg('');

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Something went wrong.');
            setStatus('success');
            setForm({ name: '', email: '', phone: '', subject: '', message: '' });
        } catch (err) {
            setErrorMsg(err.message);
            setStatus('error');
        }
    };

    const whatsappNumber = String(settings.contactWhatsapp || '').replace(/\D/g, '') || '2347026417709';
    const whatsappHref  = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi Ufriends IT, I need support.')}`;

    const inputClass =
        'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all';

    return (
        <div className="min-h-screen bg-white overflow-x-hidden">
            <PageMeta
                title="Contact Us | Ufriends IT Support"
                description="Need help? Contact Ufriends IT via email, WhatsApp or our contact form. We respond within 24 hours for all inquiries including transactions, NIN/BVN, and account issues."
                canonical="https://ufriends.com.ng/contact"
                schema={contactSchema}
            />

            <LandingNavbar />

            <main className="pt-24 lg:pt-32 pb-20 lg:pb-32">

                {/* ── HERO ─────────────────────────────────────────────── */}
                <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 text-center">
                    {/* Tile overlay — hero only */}
                    <div
                        className="absolute inset-0 z-0 pointer-events-none"
                        style={{
                            backgroundImage: `linear-gradient(to right,#e7e5e4 1px,transparent 1px),linear-gradient(to bottom,#e7e5e4 1px,transparent 1px)`,
                            backgroundSize: '20px 20px',
                            maskImage: `repeating-linear-gradient(to right,black 0,black 3px,transparent 3px,transparent 8px),repeating-linear-gradient(to bottom,black 0,black 3px,transparent 3px,transparent 8px),radial-gradient(ellipse 80% 80% at 50% 50%,#000 40%,transparent 80%)`,
                            WebkitMaskImage: `repeating-linear-gradient(to right,black 0,black 3px,transparent 3px,transparent 8px),repeating-linear-gradient(to bottom,black 0,black 3px,transparent 3px,transparent 8px),radial-gradient(ellipse 80% 80% at 50% 50%,#000 40%,transparent 80%)`,
                            maskComposite: 'intersect',
                            WebkitMaskComposite: 'source-in',
                        }}
                    />
                    <motion.div {...fadeUp} className="relative z-10">
                        <span className="inline-block text-sm font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-6 tracking-wide">
                            Get In Touch
                        </span>
                        <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-gray-900 leading-tight mb-6">
                            We're real people.<br className="hidden sm:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1e90ff] to-[#004687]">
                                And we actually reply.
                            </span>
                        </h1>
                        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                            Whether you have a transaction issue, a billing question, or you just want to say hello — our support team is here and ready to help.
                        </p>
                    </motion.div>
                </section>

                {/* ── CONTACT CHANNELS ─────────────────────────────────── */}
                <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[
                            {
                                icon: MessageCircle,
                                label: 'WhatsApp',
                                value: 'Chat with us',
                                sub: 'Fastest response — usually minutes',
                                href: whatsappHref,
                                color: '#004687',
                                external: true,
                            },
                            {
                                icon: Mail,
                                label: 'Email',
                                value: settings.siteEmail || 'info@ufriends.com.ng',
                                sub: 'Response within 24 hours',
                                href: `mailto:${settings.siteEmail || 'info@ufriends.com.ng'}`,
                                color: '#1e90ff',
                                external: false,
                            },
                            {
                                icon: MapPin,
                                label: 'Location',
                                value: 'Nigeria',
                                sub: 'Serving users nationwide',
                                href: null,
                                color: '#f59e0b',
                                external: false,
                            },
                            {
                                icon: Clock,
                                label: 'Support Hours',
                                value: '24/7 Online',
                                sub: 'Mon – Sun, always available',
                                href: null,
                                color: '#8b5cf6',
                                external: false,
                            },
                        ].map((item, i) => {
                            const Icon = item.icon;
                            const inner = (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.4, delay: i * 0.08 }}
                                    className="group bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-gray-200 transition-all duration-300 flex flex-col gap-3"
                                >
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                                        style={{ backgroundColor: item.color + '18' }}
                                    >
                                        <Icon className="w-5 h-5" style={{ color: item.color }} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{item.label}</div>
                                        <div className="font-semibold text-gray-900 text-sm leading-snug">{item.value}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{item.sub}</div>
                                    </div>
                                </motion.div>
                            );
                            if (item.href) {
                                return (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        target={item.external ? '_blank' : undefined}
                                        rel={item.external ? 'noopener noreferrer' : undefined}
                                    >
                                        {inner}
                                    </a>
                                );
                            }
                            return <div key={item.label}>{inner}</div>;
                        })}
                    </div>
                </section>

                {/* ── FORM + FAQ ────────────────────────────────────────── */}
                <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-16">

                        {/* Contact Form */}
                        <div>
                            <motion.div {...fadeUp} className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Send us a message</h2>
                                <p className="text-gray-500 text-sm mb-8">
                                    Fill in the form below and we'll get back to you within 24 hours. You'll also receive a confirmation email.
                                </p>

                                {status === 'success' ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.97 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center"
                                    >
                                        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle2 className="w-7 h-7 text-primary" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Message sent!</h3>
                                        <p className="text-gray-600 text-sm mb-6">
                                            We've received your message and sent a confirmation to your email. Our team will respond within 24 hours.
                                        </p>
                                        <button
                                            onClick={() => setStatus('idle')}
                                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                                        >
                                            Send another message
                                        </button>
                                    </motion.div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={form.name}
                                                    onChange={handleChange}
                                                    placeholder="e.g. Amaka Johnson"
                                                    required
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={form.email}
                                                    onChange={handleChange}
                                                    placeholder="you@example.com"
                                                    required
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number <span className="text-gray-400 font-normal">(optional)</span></label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={form.phone}
                                                    onChange={handleChange}
                                                    placeholder="+234 800 000 0000"
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject <span className="text-red-500">*</span></label>
                                                <select
                                                    name="subject"
                                                    value={form.subject}
                                                    onChange={handleChange}
                                                    required
                                                    className={inputClass + ' cursor-pointer'}
                                                >
                                                    <option value="">Select a topic…</option>
                                                    {SUBJECTS.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Message <span className="text-red-500">*</span></label>
                                            <textarea
                                                name="message"
                                                value={form.message}
                                                onChange={handleChange}
                                                rows={6}
                                                placeholder="Describe your issue or question in detail. Include transaction references if applicable…"
                                                required
                                                className={inputClass + ' resize-none'}
                                            />
                                            <div className="text-right text-xs text-gray-400 mt-1">{form.message.length} / 1000 chars</div>
                                        </div>

                                        {status === 'error' && (
                                            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-red-700">{errorMsg}</p>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={status === 'loading'}
                                            className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#1e90ff] to-[#004687] text-white font-bold text-base rounded-xl hover:from-[#1e90ff]/90 hover:to-[#004687]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                                        >
                                            {status === 'loading' ? (
                                                <>
                                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                    </svg>
                                                    Sending…
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Send Message
                                                </>
                                            )}
                                        </button>

                                        <p className="text-xs text-gray-400 text-center">
                                            Or reach us faster on{' '}
                                            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">
                                                WhatsApp
                                            </a>
                                        </p>
                                    </form>
                                )}
                            </motion.div>
                        </div>

                        {/* FAQ */}
                        <div>
                            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Common questions</h2>
                                <p className="text-gray-500 text-sm mb-8">
                                    Quick answers before you reach out.
                                </p>

                                <div className="space-y-3">
                                    {FAQS.map((faq, i) => (
                                        <div
                                            key={i}
                                            className="border border-gray-100 rounded-2xl overflow-hidden"
                                        >
                                            <button
                                                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                                className={`w-full flex items-center justify-between gap-3 px-5 py-4 text-left transition-colors duration-200 ${
                                                    openFaq === i ? 'bg-primary/5' : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <span className={`text-sm font-semibold leading-snug transition-colors duration-200 ${
                                                    openFaq === i ? 'text-primary' : 'text-gray-800'
                                                }`}>{faq.q}</span>
                                                <motion.div
                                                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                    className="flex-shrink-0"
                                                >
                                                    <ChevronDown className={`w-4 h-4 transition-colors duration-200 ${
                                                        openFaq === i ? 'text-primary' : 'text-gray-400'
                                                    }`} />
                                                </motion.div>
                                            </button>
                                            <AnimatePresence initial={false}>
                                                {openFaq === i && (
                                                    <motion.div
                                                        key="answer"
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.28, ease: 'easeInOut' }}
                                                        style={{ overflow: 'hidden' }}
                                                    >
                                                        <div className="px-5 pb-5 pt-1">
                                                            <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>

                                {/* WhatsApp CTA */}
                                <div className="mt-12 bg-[#001F5B] rounded-2xl p-8 text-white shadow-lg">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-[#001F5B] rounded-xl flex items-center justify-center flex-shrink-0">
                                            <MessageCircle className="w-6 h-6 text-[#1e90ff]" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg">WhatsApp Support</div>
                                            <div className="text-blue-200 text-sm">Typically replies in minutes</div>
                                        </div>
                                    </div>
                                    <p className="text-blue-50 text-base mb-6 leading-relaxed">
                                        For urgent issues — failed transactions, locked accounts, or anything that can't wait — hit us on WhatsApp right now.
                                    </p>
                                    <a
                                        href={whatsappHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#001F5B] border border-[#1e90ff] text-white text-base font-bold rounded-xl hover:bg-[#1e90ff]/10 transition-all shadow-md hover:shadow-lg justify-center w-full sm:w-auto"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        Chat on WhatsApp
                                    </a>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ── BOTTOM CTA ───────────────────────────────────────── */}
                <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 text-center">
                    <motion.div {...fadeUp}>
                        <p className="text-gray-500 text-base">
                            Not a customer yet?{' '}
                            <Link to="/register" className="text-primary font-semibold hover:underline">
                                Create a free account
                            </Link>{' '}
                            and get instant access to all our services.
                        </p>
                    </motion.div>
                </section>

            </main>

            <LandingFooter />
        </div>
    );
}
