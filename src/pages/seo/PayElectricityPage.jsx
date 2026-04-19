import { Zap, Building2, Lock } from 'lucide-react';
import ServiceLandingPage from '../../components/landing/ServiceLandingPage';

const schema = [
    {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'How do I pay my electricity bill online in Nigeria?',
            acceptedAnswer: { '@type': 'Answer', text: 'To pay your electricity bill online in Nigeria, create a free account on Ufriends IT, fund your wallet, go to Services, select Electricity, choose your DISCO (e.g. Ikeja, Eko, Abuja), enter your meter number, select prepaid or postpaid, enter the amount, and confirm. Your token is delivered instantly via SMS and on-screen.' },
        },
        {
            '@type': 'Question',
            name: 'Which electricity companies (DISCOs) does Ufriends IT support?',
            acceptedAnswer: { '@type': 'Answer', text: 'Ufriends IT supports electricity bill payment for all major Nigerian DISCOs including Ikeja Electric (IKEDC), Eko Electric (EKEDC), Abuja Electric (AEPB), Kano Electric (KEDCO), Port Harcourt Electric (PHED), Jos Electric (JED), Ibadan Electric (IBEDC), and Kaduna Electric (KAEDCO).' },
        },
        {
            '@type': 'Question',
            name: 'How quickly do I get my electricity token?',
            acceptedAnswer: { '@type': 'Answer', text: 'Your electricity token is delivered instantly via SMS and displayed on-screen immediately after payment confirmation. No delays, no manual processing.' },
        },
        {
            '@type': 'Question',
            name: 'Can I pay for both prepaid and postpaid electricity?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes. Ufriends IT supports both prepaid (token generation) and postpaid (bill payment) electricity for all supported DISCOs across Nigeria.' },
        },
    ],
},
    {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Pay electricity bills for Ikeja, Eko, Abuja, Kano, Port Harcourt, Jos, Ibadan and Kaduna electricity companies online. Get your prepaid token instantly — no meter visit, no stress.",
        "provider": { "@id": "https://ufriends.com.ng/#organization" },
        "areaServed": { "@type": "Country", "name": "Nigeria" },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "NGN",
            "description": "Available instantly on the Ufriends IT platform with transparent pricing."
        }
    }
];

export default function PayElectricityPage() {
    return (
        <ServiceLandingPage
            metaTitle="Pay Electricity Bill Online Nigeria — All DISCOs Supported | Ufriends IT"
            metaDescription="Pay electricity bills online in Nigeria for Ikeja, Eko, Abuja, Kano, Port Harcourt, Jos, Ibadan and Kaduna DISCOs. Get prepaid token instantly. Ufriends IT — fast, secure electricity payments."
            canonical="https://ufriends.com.ng/pay-electricity-bill-nigeria"
            schema={schema}
            h1="Pay Your Electricity Bill Online in Nigeria — All 8 DISCOs Supported"
            subtitle="Pay electricity bills for Ikeja, Eko, Abuja, Kano, Port Harcourt, Jos, Ibadan and Kaduna electricity companies online. Get your prepaid token instantly — no meter visit, no stress."
            badge="Utility Bill Payment"
            ctaText="Pay Electricity Bill"
            benefits={[
                { Icon: Zap, title: 'Instant Token Delivery', body: 'Electricity token delivered via SMS and on-screen immediately after payment confirmation. Zero delays.' },
                { Icon: Building2, title: 'All 8 DISCOs Covered', body: 'Ikeja, Eko, Abuja, Kano, PH, Jos, Ibadan and Kaduna — both prepaid and postpaid plans supported.' },
                { Icon: Lock, title: '100% Secure', body: 'All electricity payments are encrypted and processed through official DISCO payment gateways.' },
            ]}
            faqs={schema.mainEntity.map((e) => ({ q: e.name, a: e.acceptedAnswer.text }))}
        />
    );
}
