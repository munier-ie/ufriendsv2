import { GraduationCap, Mail, Package } from 'lucide-react';
import ServiceLandingPage from '../../components/landing/ServiceLandingPage';

const schema = [
    {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'How do I buy a WAEC result checker PIN online?',
            acceptedAnswer: { '@type': 'Answer', text: 'To buy a WAEC result checker PIN online, create a free account on Ufriends IT, fund your wallet, go to Services, select Exam Pins, choose WAEC, specify the quantity and complete payment. Your WAEC PIN and serial number are delivered instantly to your dashboard and via email.' },
        },
        {
            '@type': 'Question',
            name: 'What exam pins can I buy on Ufriends IT?',
            acceptedAnswer: { '@type': 'Answer', text: 'Ufriends IT offers exam result checker PINs for WAEC (WASSCE/GCE), NECO, and other Nigerian examination bodies. All pins are authentic and delivered instantly after purchase.' },
        },
        {
            '@type': 'Question',
            name: 'How quickly are exam pins delivered on Ufriends IT?',
            acceptedAnswer: { '@type': 'Answer', text: 'Exam PINs are delivered instantly after payment. Your WAEC or NECO PIN and serial number are shown on-screen immediately and also sent to your registered email address.' },
        },
        {
            '@type': 'Question',
            name: 'Can I buy multiple exam pins at once?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes. You can purchase multiple WAEC or NECO pins at once on Ufriends IT, which is especially useful for schools, teachers, and exam centres. Bulk pricing may be available.' },
        },
    ],
},
    {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Purchase authentic WAEC result checker PINs and NECO scratch cards online in Nigeria. Instant delivery to your dashboard and email — no queues, no physical cards required.",
        "provider": { "@id": "https://ufriends.com.ng/#organization" },
        "areaServed": { "@type": "Country", "name": "Nigeria" },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "NGN",
            "description": "Available instantly on the Ufriends IT platform with transparent pricing."
        }
    }
];

export default function ExamPinsPage() {
    return (
        <ServiceLandingPage
            metaTitle="Buy WAEC Pin, NECO Scratch Card & Exam Pins Online Nigeria | Ufriends IT"
            metaDescription="Buy WAEC result checker PIN and NECO scratch card online in Nigeria. Instant delivery to your email and dashboard. Ufriends IT — Nigeria's fastest exam pin vending platform. Start for free."
            canonical="https://ufriends.com.ng/buy-exam-pins-nigeria"
            schema={schema}
            h1="Buy WAEC Pin & NECO Scratch Card Online in Nigeria — Instant Delivery"
            subtitle="Purchase authentic WAEC result checker PINs and NECO scratch cards online in Nigeria. Instant delivery to your dashboard and email — no queues, no physical cards required."
            badge="Education Pins"
            ctaText="Buy Exam Pins Now"
            benefits={[
                { Icon: GraduationCap, title: 'WAEC & NECO', body: 'Authentic WAEC result checker PINs and NECO scratch cards — delivered instantly after purchase.' },
                { Icon: Mail, title: 'Email Delivery', body: 'Your PIN and serial number are sent to your email immediately so you can check results from any device.' },
                { Icon: Package, title: 'Buy in Bulk', body: 'Purchase multiple pins at once — perfect for schools, exam centres, and bulk resellers.' },
            ]}
            faqs={schema.mainEntity.map((e) => ({ q: e.name, a: e.acceptedAnswer.text }))}
        />
    );
}
