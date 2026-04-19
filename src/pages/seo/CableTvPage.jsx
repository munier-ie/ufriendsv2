import { Tv, Zap, RefreshCw } from 'lucide-react';
import ServiceLandingPage from '../../components/landing/ServiceLandingPage';

const schema = [
    {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'How do I subscribe to DStv online in Nigeria?',
            acceptedAnswer: { '@type': 'Answer', text: 'To subscribe to DStv online in Nigeria, create a free account on Ufriends IT, fund your wallet, go to Services, select Cable TV, choose DStv, enter your IUC/smartcard number, select your preferred package (e.g. Compact, Premium, Access), and confirm. Activation is instant.' },
        },
        {
            '@type': 'Question',
            name: 'Which cable TV providers does Ufriends IT support?',
            acceptedAnswer: { '@type': 'Answer', text: 'Ufriends IT supports cable TV subscriptions for DStv, GOtv, and Startimes. You can renew existing subscriptions or change to a different package — all instantly activated.' },
        },
        {
            '@type': 'Question',
            name: 'Can I change my DStv package on Ufriends IT?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes. Ufriends IT allows you to both renew your current DStv package or change to a different package (upgrade or downgrade) during the subscription process.' },
        },
        {
            '@type': 'Question',
            name: 'How fast is cable TV subscription activation on Ufriends IT?',
            acceptedAnswer: { '@type': 'Answer', text: 'Cable TV subscriptions via Ufriends IT are activated instantly. Your DStv, GOtv or Startimes service is restored within seconds of a successful payment.' },
        },
    ],
},
    {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "Renew or change your DStv, GOtv, or Startimes cable TV subscription online at the cheapest rate. Instant activation, no queues, available 24 hours a day, 7 days a week.",
        "provider": { "@id": "https://ufriends.com.ng/#organization" },
        "areaServed": { "@type": "Country", "name": "Nigeria" },
        "offers": {
            "@type": "Offer",
            "priceCurrency": "NGN",
            "description": "Available instantly on the Ufriends IT platform with transparent pricing."
        }
    }
];

export default function CableTvPage() {
    return (
        <ServiceLandingPage
            metaTitle="DStv GOtv Startimes Online Subscription Nigeria | Ufriends IT"
            metaDescription="Subscribe or renew DStv, GOtv or Startimes online in Nigeria at the cheapest price. Instant activation, package change supported. Ufriends IT — pay your cable TV in seconds. Start for free."
            canonical="https://ufriends.com.ng/subscribe-cable-tv-nigeria"
            schema={schema}
            h1="Subscribe to DStv, GOtv & Startimes Online in Nigeria"
            subtitle="Renew or change your DStv, GOtv, or Startimes cable TV subscription online at the cheapest rate. Instant activation, no queues, available 24 hours a day, 7 days a week."
            badge="Cable TV Subscription"
            ctaText="Subscribe Now"
            benefits={[
                { Icon: Tv, title: 'All 3 Providers', body: 'DStv, GOtv, and Startimes all supported — renew or change your package all in one place.' },
                { Icon: Zap, title: 'Instant Activation', body: 'Your cable TV subscription is restored within seconds of payment confirmation. No waiting.' },
                { Icon: RefreshCw, title: 'Change Your Package', body: 'Want to upgrade or downgrade? Ufriends IT lets you switch DStv or GOtv packages with ease.' },
            ]}
            faqs={schema.mainEntity.map((e) => ({ q: e.name, a: e.acceptedAnswer.text }))}
        />
    );
}
