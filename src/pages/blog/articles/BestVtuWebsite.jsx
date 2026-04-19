import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';

export default function BestVtuWebsite() {
    const isHowTo = false;
    const contentRef = useRef(null);
    const conclusionRef = useRef(null);
    const [tocStyle, setTocStyle] = useState({ position: 'absolute', top: 0 });
    const [tocLeft, setTocLeft] = useState(0);
    const [tocWidth, setTocWidth] = useState(288);

    useEffect(() => {
        const THRESHOLD_FROM_TOP = 150; // px from top before TOC starts following
        const tocOriginalEl = document.getElementById('toc-placeholder');

        function updateTocLeft() {
            if (tocOriginalEl) {
                const rect = tocOriginalEl.getBoundingClientRect();
                setTocLeft(rect.left);
                setTocWidth(rect.width);
            }
        }

        function handleScroll() {
            if (!contentRef.current || !conclusionRef.current || !tocOriginalEl) return;

            const contentRect = contentRef.current.getBoundingClientRect();
            const conclusionRect = conclusionRef.current.getBoundingClientRect();
            const placeholderRect = tocOriginalEl.getBoundingClientRect();

            updateTocLeft();

            const startFollowing = placeholderRect.top <= THRESHOLD_FROM_TOP;
            const stopFollowing = conclusionRect.top <= THRESHOLD_FROM_TOP + 20;

            if (stopFollowing) {
                // Pin to end: absolute from bottom of content
                const contentHeight = contentRef.current.offsetHeight;
                const tocEl = document.getElementById('toc-panel');
                const tocHeight = tocEl ? tocEl.offsetHeight : 500;
                setTocStyle({ position: 'absolute', top: contentHeight - tocHeight });
            } else if (startFollowing) {
                // Follow: fixed
                setTocStyle({ position: 'fixed', top: THRESHOLD_FROM_TOP });
            } else {
                // Start: absolute at top
                setTocStyle({ position: 'absolute', top: 0 });
            }
        }

        updateTocLeft();
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', updateTocLeft);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', updateTocLeft);
        };
    }, []);

    const scrollToSection = (e, id) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            const offset = 110;
            const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    };

    const schema = isHowTo ? {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        'name': "Best VTU Websites in Nigeria 2026 — Honest Comparison",
        'description': 'Simple step-by-step guide on best VTU website Nigeria 2026 in Nigeria using Ufriends IT.',
        'step': [
            { '@type': 'HowToStep', 'text': 'Create a free account on Ufriends.com.ng.' },
            { '@type': 'HowToStep', 'text': 'Add funds to your in-app wallet.' },
            { '@type': 'HowToStep', 'text': 'Select the service you need from the dashboard.' },
            { '@type': 'HowToStep', 'text': 'Enter your details and confirm. Done instantly.' }
        ]
    } : {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
            {
                '@type': 'Question',
                'name': 'Is Ufriends IT safe to use?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Yes. Ufriends IT is a trusted Nigerian platform. Your information and money are protected at all times.'
                }
            }
        ]
    };

    const fixedStyles = tocStyle.position === 'fixed'
        ? { position: 'fixed', top: tocStyle.top, left: tocLeft, width: tocWidth, zIndex: 40 }
        : { position: 'absolute', top: tocStyle.top, right: 0, width: tocWidth, zIndex: 40 };

    return (
        <div className="w-full pb-16 max-w-[1200px] mx-auto">
            <Helmet>
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            </Helmet>

            {/* Outer flex row - main content + TOC */}
            <div ref={contentRef} className="flex flex-col lg:flex-row gap-12 text-left items-start relative">

                {/* Main Blog Content */}
                <div className="flex-1 w-full min-w-0 space-y-10">

                    {/* INTRODUCTION */}
                    <section id="introduction">
                        <h2 className="scroll-mt-32 text-3xl md:text-4xl font-extrabold text-blue-900 mb-5 tracking-tight">Introduction</h2>
                        <p className="text-lg text-gray-700 leading-relaxed mb-3">The Problem: Getting things done online in Nigeria used to be stressful. Long queues, wrong offices, and wasted trips made simple tasks feel impossible.</p>
                        <p className="text-lg text-gray-700 leading-relaxed mb-3">The Solution: Millions of Nigerians now handle everything — from buying data to printing government documents — right from their phones. You don't need to leave your house anymore.</p>
                        <p className="text-lg text-gray-700 leading-relaxed">Whether you're a student, a business owner, or just someone who wants to save time, this guide will walk you through everything step by step. Ufriends IT makes all of this seamless.</p>
                    </section>

                    {/* COMPLIANCE & ACCURACY */}
                    <section id="compliance-accuracy" className="bg-gradient-to-r from-blue-50 to-indigo-50 p-7 rounded-2xl border border-blue-100 shadow-sm">
                        <h2 className="scroll-mt-32 text-2xl font-bold text-blue-800 mb-3">Why Getting It Right Matters</h2>
                        <p className="text-base text-gray-700 mb-5">Getting your details right matters. A wrong name or phone number can delay your request or get it rejected. Always double-check before you submit.</p>
                        <ul className="space-y-3">
                            
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Check twice:</strong> Make sure your name, phone number, and ID are correct before submitting.</span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Stay safe:</strong> Only use trusted platforms. Ufriends IT keeps your information private with end-to-end encryption.</span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Fast results:</strong> When your details are correct, you get your result fast — no waiting, no headaches.</span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Save money:</strong> No hidden charges. What you see is what you pay on Ufriends IT.</span>
                                </li>
                        </ul>
                    </section>

                    {/* STEP BY STEP */}
                    <section id="step-by-step">
                        <h2 className="scroll-mt-32 text-3xl md:text-4xl font-extrabold text-blue-900 mb-5 tracking-tight">Step-by-Step Guide</h2>
                        <p className="text-base text-gray-700 mb-6 font-medium">Ready to do this yourself? Forget the old stress of going to a physical office or waiting in queues. Just follow these exact steps to complete everything right here on Ufriends IT in less than 5 minutes:</p>
                        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-7 md:p-9">
                            <ol className="space-y-8">
                                <li className="flex items-start gap-4 md:gap-6 relative">
                                    {/* Line connecting the steps */}
                                    <div className="absolute left-[1.15rem] top-12 bottom-[-2rem] w-px bg-gray-200" aria-hidden="true"></div>
                                    <span className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg mt-0.5 shadow-md ring-4 ring-white">1</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">Create Your Free Account</h3>
                                        <p className="text-base text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{__html: "Go to <strong>Ufriends.com.ng</strong> on your phone or computer and click on sign up. Fill in your basic details like your name and phone number. It takes less than 2 minutes."}} />
                                    </div>
                                </li>
                                <li className="flex items-start gap-4 md:gap-6 relative">
                                    {/* Line connecting the steps */}
                                    <div className="absolute left-[1.15rem] top-12 bottom-[-2rem] w-px bg-gray-200" aria-hidden="true"></div>
                                    <span className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg mt-0.5 shadow-md ring-4 ring-white">2</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">Fund Your Wallet</h3>
                                        <p className="text-base text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{__html: "Once you are logged in, click on <strong>'Fund Wallet'</strong> on your dashboard. You will be given a dedicated account number. Send money to this account, and it instantly reflects in your Ufriends wallet."}} />
                                    </div>
                                </li>
                                <li className="flex items-start gap-4 md:gap-6 relative">
                                    {/* Line connecting the steps */}
                                    <div className="absolute left-[1.15rem] top-12 bottom-[-2rem] w-px bg-gray-200" aria-hidden="true"></div>
                                    <span className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg mt-0.5 shadow-md ring-4 ring-white">3</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">Select Your Service</h3>
                                        <p className="text-base text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{__html: "Look at your dashboard and click on the service you need—whether that is Data, Electricity, or Government Services like NIN/BVN."}} />
                                    </div>
                                </li>
                                <li className="flex items-start gap-4 md:gap-6 relative">
                                    {/* Line connecting the steps */}
                                    <div className="absolute left-[1.15rem] top-12 bottom-[-2rem] w-px bg-gray-200" aria-hidden="true"></div>
                                    <span className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg mt-0.5 shadow-md ring-4 ring-white">4</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">Fill in Your Details</h3>
                                        <p className="text-base text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{__html: "Enter the required information carefully (like your phone number, meter number, or NIN). Always double-check to make sure there are absolutely no mistakes."}} />
                                    </div>
                                </li>
                                <li className="flex items-start gap-4 md:gap-6 relative">
                                    {/* Line connecting the steps */}
                                    
                                    <span className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg mt-0.5 shadow-md ring-4 ring-white">5</span>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm and Finish</h3>
                                        <p className="text-base text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{__html: "Click on Proceed or Pay. The small fee will be deducted from your funded wallet, and your service is delivered to you instantly. You can immediately download your slip or view your receipt!"}} />
                                    </div>
                                </li>
                            </ol>
                        </div>
                        <div className="mt-6 p-5 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-base text-blue-800 font-medium"><strong>Tip:</strong> You can complete all of this in under 5 minutes. Ufriends IT is designed to be simple — even if you've never done it before.</p>
                        </div>
                    </section>

                    {/* CHALLENGES */}
                    <section id="challenges">
                        <h2 className="scroll-mt-32 text-2xl md:text-3xl font-bold text-gray-800 mb-5 border-b pb-3 border-gray-200">Common Problems & How to Fix Them</h2>
                        <p className="text-base text-gray-700 mb-3">The Problem: Things don't always go as planned when dealing with online services in Nigeria. Poor internet and incorrect details can cause frustrating delays.</p>
                        <p className="text-base text-gray-700 mb-5 font-semibold text-blue-900">The Solution: Ufriends IT was specifically built to bypass these exact problems. Here is how we make sure your transactions succeed the first time:</p>
                        <ul className="space-y-3">
                            
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Wrong details entered:</strong> Always review your information before confirming. Ufriends shows you a summary before you pay.</span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Poor internet connection:</strong> If you lose connection, just refresh and check your transaction history — your money is safe.</span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Delays:</strong> Most services on Ufriends are instant. If there's a delay, our support team responds quickly.</span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Don't know which service to pick:</strong> Ufriends has clear labels for every service. If you're still confused, just chat with support.</span>
                                </li>
                        </ul>
                    </section>

                    {/* OPPORTUNITIES */}
                    <section id="opportunities">
                        <h2 className="scroll-mt-32 text-2xl md:text-3xl font-bold text-gray-800 mb-5 border-b pb-3 border-gray-200">Earn Money With Ufriends IT</h2>
                        <p className="text-base text-gray-700 mb-5">Did you know you can make money helping others use Ufriends IT? Many Nigerians are already earning by reselling services in their communities.</p>
                        <ul className="space-y-3">
                            
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Become an agent:</strong> Sign up as a Ufriends agent and earn a commission on every service you sell.</span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Help your community:</strong> Many people in your area don't know how to do this online. You can help them — and earn from it.</span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Work from anywhere:</strong> All you need is a smartphone and data. No office needed, no startup cost.</span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Extra income:</strong> Agents on Ufriends earn daily. It's a real, sustainable way to grow your income.</span>
                                </li>
                        </ul>
                    </section>

                    {/* QUOTE */}
                    <blockquote className="relative border-l-4 border-blue-500 pl-6 py-4 my-6 bg-white rounded-r-xl shadow-sm">
                        <span className="absolute -top-2 left-3 text-blue-200 text-5xl leading-none">"</span>
                        <p className="text-lg italic text-gray-700 font-medium mt-2">Ufriends IT is changing how everyday Nigerians handle money, data, and government services — all from their phone, in minutes.</p>
                    </blockquote>

                    {/* MAXIMIZING VALUE */}
                    <section id="maximizing-value">
                        <h2 className="scroll-mt-32 text-3xl md:text-4xl font-extrabold text-blue-900 mb-5 tracking-tight">Get More From Ufriends IT</h2>
                        <p className="text-base text-gray-700 mb-3">Ufriends IT is more than just one service — it's your all-in-one app for everything digital in Nigeria.</p>
                        <p className="text-base text-gray-700 mb-6">Instead of using different apps for data, electricity, TV subscriptions, and government services, you can do it all in one place. That saves you time, money, and stress.</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                                <h4 className="font-bold text-gray-900 mb-1">One App, Everything</h4>
                                <p className="text-sm text-gray-600">Data, airtime, DSTV, electricity, NIN, BVN — all in one place.</p>
                            </div>
                            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                                <h4 className="font-bold text-gray-900 mb-1">Instant Delivery</h4>
                                <p className="text-sm text-gray-600">No waiting. Services are delivered the moment you pay.</p>
                            </div>
                            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                                <h4 className="font-bold text-gray-900 mb-1">Best Prices</h4>
                                <p className="text-sm text-gray-600">We offer some of the lowest prices in Nigeria. No hidden fees.</p>
                            </div>
                            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                                <h4 className="font-bold text-gray-900 mb-1">Safe & Trusted</h4>
                                <p className="text-sm text-gray-600">Thousands of Nigerians trust Ufriends IT every day. Your money is protected.</p>
                            </div>
                        </div>
                    </section>

                    {/* ADVANCED TIPS */}
                    <section id="advanced-tips" className="bg-white p-7 rounded-2xl border-2 border-dashed border-gray-200">
                        <h2 className="scroll-mt-32 text-2xl font-bold text-gray-900 mb-2">Helpful Tips</h2>
                        <p className="text-base text-gray-600 mb-5">Make the most of your Ufriends account with these simple tips:</p>
                        <ul className="space-y-3">
                            
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Turn on notifications:</strong> Get instant alerts when your transaction is done. You'll never miss an update.</span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Track your spending:</strong> Ufriends keeps a history of all your transactions. Great for budgeting.</span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Refer and earn:</strong> Invite your friends to join Ufriends and earn bonus rewards for every referral.</span>
                                </li>

                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                                    <span className="text-base text-gray-700"><strong className="text-gray-900">Works on any device:</strong> Use Ufriends on your phone, tablet, or computer — it works on all of them.</span>
                                </li>
                        </ul>
                    </section>

                    {/* CONCLUSION */}
                    <section ref={conclusionRef} id="conclusion">
                        <h2 className="scroll-mt-32 text-3xl font-extrabold text-blue-900 mb-4 tracking-tight">Wrapping Up</h2>
                        <p className="text-lg text-gray-700 leading-relaxed mb-4">Dealing with <strong>best VTU website Nigeria 2026</strong> doesn't have to be complicated or stressful. With the right platform, it's fast, safe, and easy.</p>
                        <p className="text-base text-gray-700 leading-relaxed">Ufriends IT was built for Nigerians — people who are busy, on the go, and want things to just work. Join thousands of users who already trust us for their everyday digital needs.</p>
                    </section>

                </div>

                {/* TOC Placeholder — keeps space on the right while TOC floats */}
                <aside id="toc-placeholder" className="hidden lg:block w-72 flex-shrink-0 self-start" style={{ minHeight: 1 }}>
                    {/* Invisible spacer */}
                </aside>

                {/* TOC Panel — floats using scroll-driven positioning */}
                <div
                    id="toc-panel"
                    className="hidden lg:block w-72"
                    style={fixedStyles}
                >
                    <div className="bg-[#fcfdfe] rounded-2xl shadow-md border border-gray-100 p-6 overflow-y-auto max-h-[calc(100vh-180px)]">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest">On This Page</h4>
                        </div>
                        <nav className="flex flex-col space-y-3 relative before:absolute before:inset-y-0 before:left-1.5 before:w-px before:bg-gray-100 pl-4">
                            {[
                                ['introduction', 'Introduction'],
                                ['compliance-accuracy', 'Why It Matters'],
                                ['step-by-step', 'Step-by-Step Guide'],
                                ['challenges', 'Common Problems'],
                                ['opportunities', 'Earn With Ufriends'],
                                ['maximizing-value', 'Get More Value'],
                                ['advanced-tips', 'Helpful Tips'],
                                ['conclusion', 'Wrapping Up'],
                            ].map(([id, label]) => (
                                <a key={id} href={`#${id}`} onClick={(e) => scrollToSection(e, id)} className="relative text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors py-0.5 pl-4 group">
                                    <span className="absolute -left-1.5 top-1/2 -mt-1 h-2 w-2 rounded-full bg-white border border-gray-300 group-hover:border-blue-600 group-hover:bg-blue-600 transition-all duration-200"></span>
                                    {label}
                                </a>
                            ))}
                        </nav>
                        <div className="mt-7 pt-5 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-3 font-medium">Need help? Chat with us!</p>
                            <a href="https://chat.whatsapp.com/G4dSBWV7Pp5BLBoOtborg2?mode=gi_t" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-green-500 text-white text-sm font-bold rounded-xl hover:bg-green-600 transition-colors text-center shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.562 4.14 1.541 5.874L.057 23.514a.75.75 0 00.918.943l5.84-1.525A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22.5A10.46 10.46 0 016.56 21.02l-.41-.245-4.25 1.11 1.13-4.12-.268-.424A10.447 10.447 0 011.5 12C1.5 6.21 6.21 1.5 12 1.5S22.5 6.21 22.5 12 17.79 22.5 12 22.5z"/></svg>
                                Chat Support
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA — below both columns */}
            <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white p-10 rounded-3xl mt-16 text-center shadow-xl">
                <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
                <p className="text-lg mb-8 text-blue-100 font-medium max-w-xl mx-auto">Join thousands of Nigerians who use Ufriends IT every day to save time, save money, and get things done — from anywhere.</p>
                <a href="https://ufriends.com.ng/register" className="inline-block bg-white text-blue-900 px-10 py-3 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg">Create Free Account</a>
            </div>
        </div>
    );
}