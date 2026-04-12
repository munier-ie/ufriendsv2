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
      { value: "50K+", label: "Active Users" },
      { value: "₦2B+", label: "Processed" },
      { value: "99.9%", label: "Uptime" },
    ],
  },
  services: [
    { title: "Airtime", description: "Buy airtime for all networks instantly with competitive rates.", features: ["All Networks", "Instant Delivery", "Best Rates"], color: "blue", active: true },
    { title: "Data", description: "Purchase internet data bundles across all major network providers.", features: ["All Networks", "Various Plans", "Auto Renewal"], color: "cyan", active: true },
    { title: "Bills Payment", description: "Pay electricity, cable TV, water, and utility bills in one place.", features: ["Electricity", "Cable TV", "Water Bills"], color: "orange", active: true },
    { title: "BVN Services", description: "Complete BVN verification and linked banking services securely.", features: ["BVN Verification", "Bank Linking", "Secure Process"], color: "green", active: true },
    { title: "NIN Services", description: "National Identity Number services including verification and slip printing.", features: ["NIN Verification", "Slip Printing", "Fast Processing"], color: "purple", active: true },
    { title: "CAC Registration", description: "Business registration with CAC made simple and efficient.", features: ["Business Reg", "Name Search", "Documentation"], color: "indigo", active: true },
    { title: "Education", description: "Result checking, school fees, and exam pin purchases all in one.", features: ["Result Checking", "School Fees", "Exam Pins"], color: "rose", active: true },
    { title: "Agency Banking", description: "Request POS terminals and become a marketer earning commissions.", features: ["POS Request", "Marketer Program", "Commission Earnings"], color: "yellow", active: true },
    { title: "Verification", description: "Identity and document verification services for individuals and businesses.", features: ["ID Verification", "Document Check", "Background Check"], color: "teal", active: true },
    { title: "Training", description: "Professional training programs in fintech, digital skills, and business.", features: ["Digital Skills", "Fintech Training", "Certification"], color: "sky", active: true },
    { title: "Software Dev", description: "Custom software solutions, mobile apps, and web development services.", features: ["Mobile Apps", "Web Development", "Custom Solutions"], color: "fuchsia", active: true },
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
      { name: "Adebayo Johnson", role: "Small Business Owner", initials: "AJ", content: "UFriends IT has transformed how I manage my business finances. The bill payment feature saves me hours every month. Highly recommended!" },
      { name: "Fatima Abdullahi", role: "Freelance Designer", initials: "FA", content: "As a freelancer, I need reliable financial services. UFriends IT delivers every time. Their customer support is outstanding." },
      { name: "Chinedu Okafor", role: "Tech Entrepreneur", initials: "CO", content: "The BVN and NIN services made setting up my startup so much easier. UFriends IT's platform is intuitive, secure, and efficient." },
    ],
    stats: [
      { value: "50K+", label: "Happy Customers" },
      { value: "₦2B+", label: "Processed Safely" },
      { value: "99.9%", label: "Uptime Record" },
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
      phone: "+234 800 000 0000",
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
      facebook: "https://facebook.com",
      twitter: "https://twitter.com",
      instagram: "https://instagram.com",
    },
  },
  navbar: {
    brandName: "UFriends IT",
  },
};

const STORAGE_KEY = 'uf_landing_content';

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
