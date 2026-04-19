import { Phone, Zap, BadgePercent } from 'lucide-react';
import ServiceLandingPage from '../../components/landing/ServiceLandingPage';

const schema = [
    {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'How do I buy airtime online in Nigeria?',
            acceptedAnswer: { '@type': 'Answer', text: 'To buy airtime online in Nigeria, create a free account on Ufriends IT, fund your wallet, go to Services, select Airtime, choose your network (MTN, Airtel, Glo or 9mobile), enter the phone number and amount, then confirm. Airtime is delivered instantly to the phone number.' },
        },
        {
            '@type': 'Question',
            name: 'Is there a discount on airtime purchase on Ufriends IT?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes. Ufriends IT offers discounts on airtime purchases. VTU airtime and Share & Sell options are available at below-retail rates, so you save money on every recharge.' },
        },
        {
            '@type': 'Question',
            name: "Can I buy airtime for another person's number?",
            acceptedAnswer: { '@type': 'Answer', text: "Yes. On Ufriends IT, you can recharge airtime for any MTN, Airtel, Glo, or 9mobile number in Nigeria, not just your own. Simply enter the recipient's phone number during the purchase." },
        },
    ],
},
    {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Recharge MTN, Airtel, Glo, and 9mobile airtime instantly at discounted rates. VTU, Share & Sell options available — Nigeria's most reliable airtime top-up platform.",
        "provider": { "@id": "https://ufriends.com.ng/#organization" },
        "areaServed": { "@type": "Country", "name": "Nigeria" },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "NGN",
            "description": "Available instantly on the Ufriends IT platform with transparent pricing."
        }
    }
];

export default function BuyAirtimePage() {
    return (
        <ServiceLandingPage
            metaTitle="Buy Airtime Online Nigeria — MTN, Airtel, Glo & 9Mobile | Ufriends IT"
            metaDescription="Recharge airtime online for any MTN, Airtel, Glo or 9mobile number in Nigeria. Instant delivery, up to 3% discount on airtime. No bank charges. Ufriends IT — Nigeria's fastest VTU platform."
            canonical="https://ufriends.com.ng/buy-airtime-nigeria"
            schema={schema}
            h1="Buy Airtime Online in Nigeria — All Networks, Instant Recharge"
            subtitle="Recharge MTN, Airtel, Glo, and 9mobile airtime instantly at discounted rates. VTU, Share & Sell options available — Nigeria's most reliable airtime top-up platform."
            badge="Airtime VTU"
            ctaText="Buy Airtime Now"
            benefits={[
                { Icon: Phone, title: 'Any Number, Any Network', body: 'Recharge your own number or someone else\'s — MTN, Airtel, Glo, and 9mobile all supported.' },
                { Icon: Zap, title: 'Instant Recharge', body: 'Airtime delivered to any Nigerian number within seconds of confirming your purchase.' },
                { Icon: BadgePercent, title: 'Up to 3% Discount', body: 'Enjoy automatic discounts on every airtime purchase — buy more, save more on every recharge.' },
            ]}
            faqs={schema.mainEntity.map((e) => ({ q: e.name, a: e.acceptedAnswer.text }))}
        />
    );
}
