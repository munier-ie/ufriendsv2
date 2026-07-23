// Default content for the landing page
// Admin can edit this via the Homepage Editor in the admin dashboard
export const DEFAULT_LANDING_CONTENT = {
  hero: {
    badge: "Nigeria's #1 Digital Services Platform",
    title: "Your All-in-One",
    titleHighlight: "Digital Services",
    titleEnd: "Platform",
    subtitle: "Buy airtime, pay bills, verify BVN/NIN, register your business, and access government services — all in one secure platform.",
    primaryBtn: "Get Started Free",
    secondaryBtn: "Learn More",
    stats: [
      { value: "10K+", label: "Active Users" },
      { value: "₦500k+", label: "Processed" },
      { value: "93.9%", label: "Uptime" },
    ],
  },
  services: [
    { title: "BVN Modification", description: "Lawful & official correction of BVN errors (name, date of birth, phone number, gender).", features: ["Name, phone number and DOB correction", "100% smooth online process", "Request resolved in less than 7 days", "Quick turnarounds & support"], color: "green", link: "/bvn-modification-nigeria", active: true },
    { title: "BVN Retrieval", description: "Instant BVN retrieval using your registered phone number or NIN details.", features: ["Retrieve via Phone Number", "Instant Retrieval", "Download PDF Slip"], color: "emerald", link: "/bvn-modification-nigeria", active: true },
    { title: "NIN Modification", description: "Official NIMC-authorized demographic details correction (name change, DOB, address).", features: ["Name Change", "DOB Update", "NIMC Authorized"], color: "purple", link: "/nin-modification-nigeria", active: true },
    { title: "NIN Validation", description: "Instant NIN status validation and print Regular, Standard, Premium & VNIN slips.", features: ["NIN Validation Check", "Premium & VNIN Slips", "QR Verified PDF"], color: "indigo", link: "/print-nin-slip-nigeria", active: true },
    { title: "BVN License & API", description: "Official BVN Verification License & Search API for agents and financial services.", features: ["BVN Verification License", "Agent Search API", "Developer Webhooks"], color: "teal", link: "/bvn-modification-nigeria", active: true },
    { title: "Cheap Data Bundles", description: "Wholesale data pricing for MTN, Airtel, Glo & 9mobile with instant automated delivery.", features: ["Wholesale Prices", "MTN, Airtel, Glo, 9mobile", "Instant Delivery"], color: "cyan", link: "/buy-data-nigeria", active: true },
    { title: "Airtime Top-up", description: "Discounted instant airtime recharge across all Nigerian networks.", features: ["All GSM Networks", "Instant Recharge", "Cashback Rewards"], color: "blue", link: "/buy-airtime-nigeria", active: true },
    { title: "CAC Registration", description: "Lawful Business Name and Company (LTD) registration directly with CAC Nigeria.", features: ["Business Name Reg", "Company (LTD) Reg", "Approved Documents"], color: "rose", link: "/cac-registration-nigeria", active: true },
    { title: "Bills & Utilities", description: "Pay electricity bills (IKEDC, EKEDC, IBEDC) and renew Cable TV (DSTV, GOTV) instantly.", features: ["Electricity Tokens", "Cable TV Renewal", "Instant Receipts"], color: "orange", link: "/pay-electricity-bill-nigeria", active: true },
    { title: "Exam PINs", description: "Instant generation of official WAEC, NECO, and JAMB result checking PINs.", features: ["WAEC Result Checker", "NECO Token", "JAMB Direct PIN"], color: "yellow", link: "/buy-exam-pins-nigeria", active: true },
  ],
  benefits: {
    sectionBadge: "Why UFriends IT",
    heading: "Why Choose UFriends IT",
    subheading: "We're committed to providing the best fintech experience through innovation, security, and exceptional service.",
    items: [
      { title: "Bank-Level Security", description: "Your transactions are protected with advanced encryption and multi-layer security protocols." },
      { title: "Lightning Fast", description: "Experience instant transactions and real-time processing. No more waiting hours for payments." },
      { title: "24/7 Availability", description: "Access all our services anytime, anywhere. Our platform never sleeps." },
      { title: "Expert Support", description: "Get help when you need it with our dedicated customer support team." },
    ],
    bannerTitle: "Join Over 50,000 Satisfied Customers",
    bannerSubtitle: "Experience the difference with UFriends IT's comprehensive digital services platform.",
    ratingText: "4.9/5 Rating",
    reviewCount: "2,500+ verified reviews",
  },
  testimonials: {
    sectionBadge: "Customer Stories",
    heading: "What Our Customers Say",
    subheading: "Don't just take our word for it. Here's what real customers say about their experience.",
    items: [
      { name: "Adebayo Johnson", role: "Agent & POS Operator, Lagos", initials: "AJ", content: "I printed my NIN slip and paid my DSTV subscription in less than 3 minutes. I used to travel to a cybercafe for this. Now I do everything from my phone on Ufriends IT. I even became an agent and I earn commission every day." },
      { name: "Fatima Abdullahi", role: "Student, Abuja", initials: "FA", content: "I was confused about how to buy cheap data for my studies. A friend told me about Ufriends IT and I got the cheapest MTN SME data instantly. No bank charges, no stress. I have not bought data anywhere else since then." },
      { name: "Chinedu Okafor", role: "Tech Entrepreneur", initials: "CO", content: "The BVN and NIN services made setting up my startup so much easier. UFriends IT's platform is intuitive, secure, and efficient." },
    ],
    stats: [
      { value: "10K+", label: "Happy Customers" },
      { value: "₦500k+", label: "Processed Safely" },
      { value: "93.9%", label: "Uptime Record" },
    ],
  },
  faq: {
    sectionBadge: "FAQ",
    heading: "Frequently Asked Questions",
    subheading: "Got questions? We've got answers. Find everything you need to know about UFriends IT.",
    items: [
      { question: "How do I get started with UFriends IT?", answer: "Getting started is simple! Click the 'Sign Up' button, fill in your details, verify your email address, and you're ready to use all our services. Registration takes less than 2 minutes." },
      { question: "What payment methods do you accept?", answer: "We accept bank transfers, card payments (Visa, Mastercard), and funding via multiple payment gateways. Your wallet is credited instantly after a successful payment." },
      { question: "How secure is my data on UFriends IT?", answer: "We use bank-level encryption and multi-factor authentication to protect your data. All transactions are secured with SSL and we never store card details on our servers." },
      { question: "What services can I access on the platform?", answer: "UFriends IT offers airtime, data, bills payment (electricity, cable TV), BVN/NIN services, CAC registration, exam pins, bulk SMS, agency banking, and software development services." },
      { question: "How long do transactions take to process?", answer: "Most transactions (airtime, data, bills) are processed instantly. Government services like NIN/BVN may take a few minutes. CAC registration follows the official CAC timeline." },
      { question: "Is there a referral program?", answer: "Yes! You earn commission for every friend you refer who signs up and makes a transaction. Log in to your dashboard to get your unique referral link and track your earnings." },
    ],
    support: {
      email: "support@ufriendsit.com",
      phone: "+234 81 6969 6095",
      hours: "24/7",
    },
  },
  cta: {
    badge: "Get Started Today",
    heading: "Ready to Join",
    headingHighlight: "50,000+ Users?",
    subheading: "Start using Nigeria's most trusted digital services platform today. Sign up free and get instant access to all our services.",
    primaryBtn: "Create Free Account",
    secondaryBtn: "Sign In",
    badges: ["No card required", "Free to get started", "Instant access"],
  },
  footer: {
    description: "Nigeria's most trusted digital services platform — providing airtime, data, bill payments, government ID services, and business solutions.",
    copyright: "UFriends IT. All rights reserved.",
    tagline: "Built with ❤️ for Nigerians",
    social: {
      facebook: "https://facebook.com/ufriendsIT",
      twitter: "https://twitter.com/ufriends_it",
      tiktok: "https://tiktok.com/@ufriends_it",
      youtube: "https://youtube.com/@UfriendsIT",
    },
  },
  navbar: {
    brandName: "UFriends IT",
  },
};

const STORAGE_KEY = 'uf_landing_content_v4';

export function loadLandingContent() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      // Deep merge stored on top of defaults so new fields are always present
      return deepMerge(DEFAULT_LANDING_CONTENT, JSON.parse(stored));
    }
  } catch (_) {}
  return DEFAULT_LANDING_CONTENT;
}

export function saveLandingContent(content) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  } catch (_) {}
}

function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) output[key] = source[key];
        else output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}
