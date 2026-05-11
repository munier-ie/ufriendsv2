import React from 'react';
import { useParams, Navigate, useLocation } from 'react-router-dom';
import ServiceLandingPage from '../../components/landing/ServiceLandingPage';
import { CheckCircle2, Zap, Smartphone, Globe, ShieldCheck, CreditCard, Clock, FileText } from 'lucide-react';
import seoData from './content/seo-pages.json';

// Helper to assign a relevant Lucide icon based on the benefit title
const getIconForBenefit = (title, index) => {
    const t = title.toLowerCase();
    if (t.includes('instant') || t.includes('fast') || t.includes('speed')) return Zap;
    if (t.includes('phone') || t.includes('number') || t.includes('mobile')) return Smartphone;
    if (t.includes('secure') || t.includes('safe') || t.includes('protect')) return ShieldCheck;
    if (t.includes('pay') || t.includes('price') || t.includes('affordable') || t.includes('discount')) return CreditCard;
    if (t.includes('time') || t.includes('wait') || t.includes('queue')) return Clock;
    if (t.includes('document') || t.includes('print') || t.includes('slip') || t.includes('format')) return FileText;
    if (t.includes('all') || t.includes('network') || t.includes('provider')) return Globe;
    
    // Fallback based on index
    const fallbacks = [CheckCircle2, Zap, ShieldCheck, Globe];
    return fallbacks[index % fallbacks.length];
};

export default function SeoPageDynamic({ routeSlug }) {
    // We can accept a direct routeSlug prop (from App.jsx) or use useLocation
    const location = useLocation();
    
    // Extract the slug from the pathname, e.g., "/buy-data-nigeria" -> "buy-data-nigeria"
    const currentSlug = routeSlug || location.pathname.split('/').filter(Boolean).pop();
    
    const data = seoData[currentSlug];

    if (!data) {
        return <Navigate to="/" replace />;
    }

    // Process benefits to inject Icon components
    const processedBenefits = (data.benefits || []).map((b, i) => ({
        ...b,
        Icon: getIconForBenefit(b.title, i)
    }));

    // Extract FAQs from schema if they exist
    let faqs = [];
    if (data.schema) {
        const faqSchema = data.schema.find(s => s['@type'] === 'FAQPage');
        if (faqSchema && faqSchema.mainEntity) {
            faqs = faqSchema.mainEntity.map(faq => ({
                q: faq.name,
                a: faq.acceptedAnswer.text
            }));
        }
    }

    return (
        <ServiceLandingPage
            metaTitle={data.metaTitle}
            metaDescription={data.metaDescription}
            canonical={data.canonical}
            schema={data.schema}
            h1={data.h1}
            subtitle={data.subtitle}
            badge={data.badge}
            ctaText={data.ctaText}
            benefits={processedBenefits}
            faqs={faqs}
        />
    );
}
