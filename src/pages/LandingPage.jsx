import React from 'react';
import { motion } from 'framer-motion';
import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import ServicesSection from '../components/landing/ServicesSection';
import BenefitsSection from '../components/landing/BenefitsSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import FaqSection from '../components/landing/FaqSection';
import CtaSection from '../components/landing/CtaSection';
import LandingFooter from '../components/landing/LandingFooter';
import PageMeta from '../components/seo/PageMeta';

// ─── Homepage JSON-LD Schema ──────────────────────────────────────────────────
const homepageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            '@id': 'https://ufriends.com.ng/#organization',
            name: 'Ufriends IT',
            url: 'https://ufriends.com.ng',
            logo: {
                '@type': 'ImageObject',
                url: 'https://ufriends.com.ng/favicon.svg',
                width: 512,
                height: 512,
            },
            description:
                "Nigeria's all-in-one VTU and government services platform for buying cheap data, airtime, printing NIN/BVN slips, NIN/BVN modification, cable TV subscription, electricity bill payment, exam pins, and CAC business registration.",
            address: {
                '@type': 'PostalAddress',
                addressCountry: 'NG',
            },
            contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                availableLanguage: 'English',
            },
            sameAs: [
                'https://www.facebook.com/ufriends_it',
                'https://twitter.com/ufriends_it',
                'https://www.instagram.com/ufriends_it',
                'https://www.tiktok.com/@ufriends_it'
            ],
        },
        {
            '@type': 'WebSite',
            '@id': 'https://ufriends.com.ng/#website',
            url: 'https://ufriends.com.ng',
            name: 'Ufriends IT',
            publisher: { '@id': 'https://ufriends.com.ng/#organization' },
            inLanguage: 'en-NG',
        },
    ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden relative">
      {/* ─── SEO Meta Tags + JSON-LD Schema ─── */}
      <PageMeta
        title="Buy Data, Airtime, Print NIN & BVN Slip Online Nigeria"
        description="Ufriends IT is Nigeria's all-in-one VTU platform. Buy cheap data, airtime, print NIN slip, BVN slip, NIN/BVN modification, cable TV, electricity bills, exam pins and CAC registration. Start for free today."
        canonical="https://ufriends.com.ng/"
        schema={homepageSchema}
      />

      {/* Dashed Bottom Fade Grid */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e7e5e4 1px, transparent 1px),
            linear-gradient(to bottom, #e7e5e4 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 0",
          maskImage: `
             repeating-linear-gradient(
                  to right,
                  black 0px,
                  black 3px,
                  transparent 3px,
                  transparent 8px
                ),
                repeating-linear-gradient(
                  to bottom,
                  black 0px,
                  black 3px,
                  transparent 3px,
                  transparent 8px
                ),
                radial-gradient(ellipse 100% 80% at 50% 100%, #000 50%, transparent 90%)
          `,
          WebkitMaskImage: `
      repeating-linear-gradient(
                  to right,
                  black 0px,
                  black 3px,
                  transparent 3px,
                  transparent 8px
                ),
                repeating-linear-gradient(
                  to bottom,
                  black 0px,
                  black 3px,
                  transparent 3px,
                  transparent 8px
                ),
                radial-gradient(ellipse 100% 80% at 50% 100%, #000 50%, transparent 90%)
          `,
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      />
      <LandingNavbar />

      {/* Static H1 for SEO crawlers (Bing, Google) that don't run JavaScript.
          Visually hidden but fully accessible and indexable. */}
      <h1 className="sr-only">
        Buy Cheap Data, Airtime, Print NIN &amp; BVN Slip Online in Nigeria — Ufriends IT
      </h1>

      <main className="relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <HeroSection />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <ServicesSection />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <BenefitsSection />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <TestimonialsSection />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <FaqSection />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <CtaSection />
        </motion.div>
      </main>
      <div className="relative z-10">
        <LandingFooter />
      </div>
    </div>
  );
}
