import { Landmark, Lock, FileEdit } from 'lucide-react';
import ServiceLandingPage from '../../components/landing/ServiceLandingPage';

const schema = [
    {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'How do I modify my BVN in Nigeria?',
            acceptedAnswer: { '@type': 'Answer', text: 'You can request a BVN modification through Ufriends IT. Create a free account, navigate to Manual Services, select BVN Modification, provide the correction details and supporting documents, and submit. Ufriends IT processes your request through authorised banking channels.' },
        },
        {
            '@type': 'Question',
            name: 'What BVN details can be changed on Ufriends IT?',
            acceptedAnswer: { '@type': 'Answer', text: 'Ufriends IT supports BVN name correction, date of birth modification, and phone number linked to BVN updates. Each type of modification may require specific supporting documents.' },
        },
        {
            '@type': 'Question',
            name: 'How long does BVN modification take?',
            acceptedAnswer: { '@type': 'Answer', text: 'BVN modification processing typically takes 3–7 business days depending on the bank and the type of correction. Ufriends IT will update you on your request status throughout the process.' },
        },
        {
            '@type': 'Question',
            name: 'Can I change my BVN phone number without going to the bank?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes. Through Ufriends IT, you can request a BVN phone number update without physically visiting your bank. Our service handles the submission and liaison with the appropriate banking authority on your behalf.' },
        },
    ],
},
    {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Incorrect name, wrong date of birth, or need to update the phone number on your Bank Verification Number? Ufriends IT processes BVN modifications quickly, securely, and online.",
        "provider": { "@id": "https://ufriends.com.ng/#organization" },
        "areaServed": { "@type": "Country", "name": "Nigeria" },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "NGN",
            "description": "Available instantly on the Ufriends IT platform with transparent pricing."
        }
    }
];

export default function BvnModificationPage() {
    return (
        <ServiceLandingPage
            metaTitle="BVN Modification Nigeria — Update Your BVN Details Online"
            metaDescription="Need to update your BVN name, date of birth, or phone number? Ufriends IT handles BVN modification in Nigeria online — fast, secure, and affordable. No bank visit needed. Start for free."
            canonical="https://ufriends.com.ng/bvn-modification-nigeria"
            schema={schema}
            h1="BVN Modification in Nigeria — Update Your BVN Without Bank Queues"
            subtitle="Incorrect name, wrong date of birth, or need to update the phone number on your Bank Verification Number? Ufriends IT processes BVN modifications quickly, securely, and online."
            badge="Banking Identity Services"
            ctaText="Request BVN Modification"
            benefits={[
                { Icon: Landmark, title: 'No Bank Visit Needed', body: 'Submit your BVN modification request from anywhere — our team handles bank liaison on your behalf.' },
                { Icon: Lock, title: 'Secure & Confidential', body: 'Your BVN and personal data are handled with the highest level of security and privacy protection.' },
                { Icon: FileEdit, title: 'All Modification Types', body: 'Name, date of birth, and phone number corrections all supported with clear, transparent pricing.' },
            ]}
            faqs={schema.mainEntity.map((e) => ({ q: e.name, a: e.acceptedAnswer.text }))}
        />
    );
}
