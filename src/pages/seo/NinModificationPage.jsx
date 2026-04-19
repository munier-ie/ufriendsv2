import { BadgeCheck, MapPin, FileEdit } from 'lucide-react';
import ServiceLandingPage from '../../components/landing/ServiceLandingPage';

const schema = [
    {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'How do I modify my NIN in Nigeria online?',
            acceptedAnswer: { '@type': 'Answer', text: 'You can modify your NIN (National Identification Number) online in Nigeria through Ufriends IT. Create a free account, go to Manual Services, select NIN Modification, fill in the correction details, upload any required documents, and submit your request. Our team processes modifications quickly.' },
        },
        {
            '@type': 'Question',
            name: 'What NIN details can be corrected or modified?',
            acceptedAnswer: { '@type': 'Answer', text: 'On Ufriends IT, you can correct your NIN first name, last name, middle name, date of birth, and phone number linked to your NIN. All modifications are processed through authorised channels.' },
        },
        {
            '@type': 'Question',
            name: 'How long does NIN modification take on Ufriends IT?',
            acceptedAnswer: { '@type': 'Answer', text: 'NIN modification processing time varies depending on the type of correction. Simple phone number updates are typically faster, while name and date of birth corrections may take 2–5 business days after document verification.' },
        },
        {
            '@type': 'Question',
            name: 'What documents are needed for NIN modification?',
            acceptedAnswer: { '@type': 'Answer', text: 'The required documents depend on the type of modification. For name corrections, a valid ID showing the correct name is usually required. For date of birth corrections, a birth certificate or sworn affidavit may be needed.' },
        },
    ],
},
    {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Made an error on your National Identification Number? Ufriends IT handles NIN name correction, date of birth updates, and phone number modifications — all online, no NIMC office queues.",
        "provider": { "@id": "https://ufriends.com.ng/#organization" },
        "areaServed": { "@type": "Country", "name": "Nigeria" },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "NGN",
            "description": "Available instantly on the Ufriends IT platform with transparent pricing."
        }
    }
];

export default function NinModificationPage() {
    return (
        <ServiceLandingPage
            metaTitle="NIN Modification Online Nigeria — Correct Your NIN Details Fast"
            metaDescription="Need to correct your NIN name, date of birth, or phone number? Ufriends IT handles NIN modification online in Nigeria — fast, authorised, and affordable. Start for free today."
            canonical="https://ufriends.com.ng/nin-modification-nigeria"
            schema={schema}
            h1="NIN Modification Online in Nigeria — Correct Your NIN Details Today"
            subtitle="Made an error on your National Identification Number? Ufriends IT handles NIN name correction, date of birth updates, and phone number modifications — all online, no NIMC office queues."
            badge="Government Identity Services"
            ctaText="Request NIN Modification"
            benefits={[
                { Icon: BadgeCheck, title: 'Authorised Processing', body: 'All NIN modifications are processed through official NIMC-authorised channels for guaranteed acceptance.' },
                { Icon: MapPin, title: 'No Office Queues', body: 'Submit your modification request online from anywhere in Nigeria — no physical NIMC office visit required.' },
                { Icon: FileEdit, title: 'All Correction Types', body: 'Name, date of birth, and phone number corrections all supported with transparent, affordable pricing.' },
            ]}
            faqs={schema.mainEntity.map((e) => ({ q: e.name, a: e.acceptedAnswer.text }))}
        />
    );
}
