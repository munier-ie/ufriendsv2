import { TrendingDown, Zap, Wifi } from 'lucide-react';
import ServiceLandingPage from '../../components/landing/ServiceLandingPage';

const schema = [
    {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'How do I buy cheap data online in Nigeria?',
            acceptedAnswer: { '@type': 'Answer', text: 'To buy cheap data online in Nigeria, create a free account on Ufriends IT at ufriends.com.ng, fund your wallet, then go to Services, select Data, choose your network (MTN, Airtel, Glo or 9mobile), select your preferred data plan, enter your phone number and complete the purchase. Data is delivered instantly.' },
        },
        {
            '@type': 'Question',
            name: 'Which networks does Ufriends IT support for data purchase?',
            acceptedAnswer: { '@type': 'Answer', text: 'Ufriends IT supports data purchase for all four major Nigerian networks: MTN, Airtel, Glo, and 9mobile. Multiple data plan types are available including SME data, Corporate Gifting, Data Awoof, and standard data bundles.' },
        },
        {
            '@type': 'Question',
            name: 'Is Ufriends IT the cheapest data platform in Nigeria?',
            acceptedAnswer: { '@type': 'Answer', text: 'Ufriends IT offers some of the most competitive data prices in Nigeria, especially for MTN SME data and other discounted data types. Prices are updated regularly to ensure you always get the best value.' },
        },
        {
            '@type': 'Question',
            name: 'How quickly is data delivered on Ufriends IT?',
            acceptedAnswer: { '@type': 'Answer', text: 'Data delivery on Ufriends IT is instant and automated. Once your wallet is funded and your purchase is confirmed, data is sent to your phone number within seconds.' },
        },
    ],
},
    {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Get the cheapest MTN, Airtel, Glo, and 9mobile data plans in Nigeria. SME data, Corporate Gifting, Data Awoof and more — automated delivery directly to your phone in seconds.",
        "provider": { "@id": "https://ufriends.com.ng/#organization" },
        "areaServed": { "@type": "Country", "name": "Nigeria" },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "NGN",
            "description": "Available instantly on the Ufriends IT platform with transparent pricing."
        }
    }
];

export default function BuyDataPage() {
    return (
        <ServiceLandingPage
            metaTitle="Buy Cheap Data Online Nigeria — MTN, Airtel, Glo & 9Mobile"
            metaDescription="Buy the cheapest data plans in Nigeria on Ufriends IT. MTN SME data, Airtel gifting data, Glo data bundles and 9mobile plans at the lowest prices. Instant delivery, no charges. Start for free."
            canonical="https://ufriends.com.ng/buy-data-nigeria"
            schema={schema}
            h1="Buy Cheap Data Online in Nigeria — All Networks, Instant Delivery"
            subtitle="Get the cheapest MTN, Airtel, Glo, and 9mobile data plans in Nigeria. SME data, Corporate Gifting, Data Awoof and more — automated delivery directly to your phone in seconds."
            badge="Data Top-Up"
            ctaText="Buy Data Now"
            benefits={[
                { Icon: TrendingDown, title: 'Lowest Prices', body: 'Ufriends IT consistently offers the cheapest data rates in Nigeria across all networks, updated daily.' },
                { Icon: Zap, title: 'Instant Delivery', body: 'Automated data delivery in seconds — no waiting, no manual processing, no delays on any network.' },
                { Icon: Wifi, title: 'All 4 Networks', body: 'MTN, Airtel, Glo, and 9mobile all supported. Multiple plan types for every need and budget.' },
            ]}
            faqs={schema.mainEntity.map((e) => ({ q: e.name, a: e.acceptedAnswer.text }))}
        />
    );
}
