import { Briefcase, ClipboardList, BadgeCheck } from 'lucide-react';
import ServiceLandingPage from '../../components/landing/ServiceLandingPage';

const schema = [
    {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'How do I register a business with CAC online in Nigeria?',
            acceptedAnswer: { '@type': 'Answer', text: 'To register your business with CAC online in Nigeria through Ufriends IT, create a free account, go to Government Services, select CAC Registration, choose your business type (Business Name, LTD, Enterprise or NGO), fill in the required details, upload necessary documents, and submit your application. Ufriends IT handles the entire filing process with the Corporate Affairs Commission.' },
        },
        {
            '@type': 'Question',
            name: 'What types of business can I register on Ufriends IT?',
            acceptedAnswer: { '@type': 'Answer', text: 'Ufriends IT supports CAC registration for Business Name, Limited Liability Company (LTD/GTE), Enterprise, and NGO/Incorporated Trustees. Each type has different requirements and fees.' },
        },
        {
            '@type': 'Question',
            name: 'How long does CAC business registration take through Ufriends IT?',
            acceptedAnswer: { '@type': 'Answer', text: 'CAC registration processing typically takes 3–10 business days depending on the type of entity being registered and CAC verification timelines. Ufriends IT keeps you updated throughout the process.' },
        },
        {
            '@type': 'Question',
            name: 'Do I need to visit the CAC office myself?',
            acceptedAnswer: { '@type': 'Answer', text: 'No. Ufriends IT handles the entire CAC registration process online on your behalf. You provide the required information and documents, and we handle the submission and follow-up with CAC.' },
        },
    ],
},
    {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Register your business with the Corporate Affairs Commission (CAC) through Ufriends IT. Business Name, Limited Company, Enterprise, and NGO registration — handled completely online.",
        "provider": { "@id": "https://ufriends.com.ng/#organization" },
        "areaServed": { "@type": "Country", "name": "Nigeria" },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "NGN",
            "description": "Available instantly on the Ufriends IT platform with transparent pricing."
        }
    }
];

export default function CacRegistrationPage() {
    return (
        <ServiceLandingPage
            metaTitle="CAC Business Registration Online Nigeria — Business Name, LTD & NGO | Ufriends IT"
            metaDescription="Register your business with CAC online in Nigeria. Ufriends IT handles Business Name, LTD, Enterprise and NGO registration. No CAC office visit needed. Fast, affordable, start for free."
            canonical="https://ufriends.com.ng/cac-registration-nigeria"
            schema={schema}
            h1="CAC Business Registration Online in Nigeria — Business Name, LTD, NGO & More"
            subtitle="Register your business with the Corporate Affairs Commission (CAC) through Ufriends IT. Business Name, Limited Company, Enterprise, and NGO registration — handled completely online."
            badge="CAC Business Registration"
            ctaText="Register Your Business"
            benefits={[
                { Icon: Briefcase, title: 'All Business Types', body: 'Business Name, LTD/GTE, Enterprise, and NGO/Incorporated Trustees all supported with guidance.' },
                { Icon: ClipboardList, title: 'We Handle Everything', body: 'Submit your details online — Ufriends IT manages the entire CAC filing process on your behalf.' },
                { Icon: BadgeCheck, title: 'Transparent Pricing', body: 'Clear, affordable pricing for all CAC registration types with no hidden charges or surprises.' },
            ]}
            faqs={schema.mainEntity.map((e) => ({ q: e.name, a: e.acceptedAnswer.text }))}
        />
    );
}
