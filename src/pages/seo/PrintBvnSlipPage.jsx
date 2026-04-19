import { Download, CreditCard, Shield } from 'lucide-react';
import ServiceLandingPage from '../../components/landing/ServiceLandingPage';

const schema = [
    {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'How do I print my BVN slip online in Nigeria?',
            acceptedAnswer: { '@type': 'Answer', text: 'To print your BVN slip online in Nigeria, create a free account on Ufriends IT, fund your wallet, go to Government Services, select BVN Slip, enter your BVN number, choose your preferred format (Regular or Premium Plastic), and your BVN slip is generated instantly for download and printing.' },
        },
        {
            '@type': 'Question',
            name: 'What BVN slip formats are available on Ufriends IT?',
            acceptedAnswer: { '@type': 'Answer', text: 'Ufriends IT offers two BVN slip formats: Regular (standard printable document) and Premium Plastic (laminated card-style). Both formats display your full BVN details and are officially acceptable.' },
        },
        {
            '@type': 'Question',
            name: 'Is it safe to print my BVN slip on Ufriends IT?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes. Ufriends IT uses bank-grade encryption to protect your BVN data. Your information is used solely to generate your BVN slip and is not stored or shared with third parties.' },
        },
    ],
},
    {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Get your Bank Verification Number (BVN) slip printed online in Nigeria. Choose Regular or Premium Plastic format — delivered instantly. No bank visit, no stress.",
        "provider": { "@id": "https://ufriends.com.ng/#organization" },
        "areaServed": { "@type": "Country", "name": "Nigeria" },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "NGN",
            "description": "Available instantly on the Ufriends IT platform with transparent pricing."
        }
    }
];

export default function PrintBvnSlipPage() {
    return (
        <ServiceLandingPage
            metaTitle="Print BVN Slip Online Nigeria — Regular & Premium Plastic | Ufriends IT"
            metaDescription="Print your BVN slip online in Nigeria on Ufriends IT. Regular or Premium Plastic format, instant delivery, no bank visit required. Secure and affordable. Start for free today."
            canonical="https://ufriends.com.ng/print-bvn-slip-nigeria"
            schema={schema}
            h1="Print Your BVN Slip Online in Nigeria — Regular & Premium Formats"
            subtitle="Get your Bank Verification Number (BVN) slip printed online in Nigeria. Choose Regular or Premium Plastic format — delivered instantly. No bank visit, no stress."
            badge="BVN Services"
            ctaText="Print BVN Slip Now"
            benefits={[
                { Icon: Download, title: 'Instant Download', body: 'Your BVN slip is ready for download and printing immediately after payment — zero waiting time.' },
                { Icon: CreditCard, title: 'Premium Plastic Option', body: 'Choose the Premium Plastic card format for a durable, professional-quality BVN identification card.' },
                { Icon: Shield, title: 'Fully Secure', body: 'Your BVN data is encrypted and protected throughout the entire slip generation process.' },
            ]}
            faqs={schema.mainEntity.map((e) => ({ q: e.name, a: e.acceptedAnswer.text }))}
        />
    );
}
