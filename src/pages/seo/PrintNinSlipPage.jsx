import { Zap, Shield, FileText } from 'lucide-react';
import ServiceLandingPage from '../../components/landing/ServiceLandingPage';

const schema = [
    {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'How do I print my NIN slip online in Nigeria?',
            acceptedAnswer: { '@type': 'Answer', text: 'To print your NIN slip online in Nigeria, create a free account on Ufriends IT at ufriends.com.ng, fund your wallet, then go to Government Services, select NIN Slip, enter your NIN number, choose your preferred format (Regular, Standard, Premium or VNIN), and download your printable slip instantly.' },
        },
        {
            '@type': 'Question',
            name: 'What NIN slip formats are available on Ufriends IT?',
            acceptedAnswer: { '@type': 'Answer', text: 'Ufriends IT offers four NIN slip formats: Regular, Standard, Premium, and VNIN (Virtual NIN). Each format is officially acceptable and delivered instantly after payment.' },
        },
        {
            '@type': 'Question',
            name: 'Is it safe to print my NIN slip online?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes. Ufriends IT uses bank-grade encryption and secure NIMC-authorised data processing. Your NIN details are used only to generate your slip and are protected at all times.' },
        },
        {
            '@type': 'Question',
            name: 'How long does it take to get my NIN slip?',
            acceptedAnswer: { '@type': 'Answer', text: 'NIN slip delivery on Ufriends IT is instant. Once your payment is confirmed, your NIN slip is generated and available for download within seconds.' },
        },
        {
            '@type': 'Question',
            name: 'Can I print a NIN slip for someone else?',
            acceptedAnswer: { '@type': 'Answer', text: "Yes. Café operators and agents can print NIN slips for multiple customers through Ufriends IT. Simply enter the customer's NIN number and select the required format." },
        },
    ],
},
    {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Get your National Identification Number (NIN) slip instantly — Regular, Standard, Premium, and VNIN formats. No NIMC office queues, no delays. Download and print in minutes.",
        "provider": { "@id": "https://ufriends.com.ng/#organization" },
        "areaServed": { "@type": "Country", "name": "Nigeria" },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "NGN",
            "description": "Available instantly on the Ufriends IT platform with transparent pricing."
        }
    }
];

export default function PrintNinSlipPage() {
    return (
        <ServiceLandingPage
            metaTitle="Print NIN Slip Online Nigeria — All Formats, Instant Delivery"
            metaDescription="Print your NIN slip online in Nigeria on Ufriends IT. All formats available: Regular, Standard, Premium and VNIN. Secure, fast and instant. No queues, no stress. Start for free."
            canonical="https://ufriends.com.ng/print-nin-slip-nigeria"
            schema={schema}
            h1="Print Your NIN Slip Online in Nigeria"
            subtitle="Get your National Identification Number (NIN) slip instantly — Regular, Standard, Premium, and VNIN formats. No NIMC office queues, no delays. Download and print in minutes."
            badge="Government Identity Services"
            ctaText="Print NIN Slip Now"
            benefits={[
                { Icon: Zap, title: 'Instant Delivery', body: 'Your NIN slip is generated and ready to download within seconds of payment confirmation — no waiting.' },
                { Icon: Shield, title: 'Secure & Safe', body: 'Bank-grade encryption protects your NIN data throughout the entire transaction. We never store your personal data.' },
                { Icon: FileText, title: 'All 4 Formats', body: 'Regular, Standard, Premium, or VNIN format — all officially acceptable across agencies and institutions.' },
            ]}
            faqs={schema.mainEntity.map((e) => ({ q: e.name, a: e.acceptedAnswer.text }))}
        />
    );
}
