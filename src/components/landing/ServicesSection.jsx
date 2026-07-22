import { Smartphone, Wifi, Receipt, UserCheck, Award, Building2, GraduationCap, Banknote, ShieldCheck, BookOpen, Code, ArrowRight, CheckCircle2, FileText, Key, Search } from 'lucide-react';
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { useLandingContent } from '../../contexts/LandingContentContext';

const CORE_IDENTITY_SERVICES = [
  {
    id: 'bvn-modification',
    title: 'BVN Modification',
    badge: 'Lawful & Fast Online Service',
    description: 'Official online correction of BVN errors including name correction, date of birth update, phone number linkage, and gender adjustment.',
    icon: UserCheck,
    color: 'emerald',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cardBorder: 'border-emerald-200/60 hover:border-emerald-500',
    iconBg: 'bg-emerald-500/10 text-emerald-600',
    features: ['Name & Date of Birth Correction', 'Phone Number & Account Linkage', '100% Lawful Online Process', 'Quick Turnaround & Support'],
    link: '/bvn-modification-nigeria',
  },
  {
    id: 'bvn-retrieval',
    title: 'BVN Retrieval',
    badge: 'Instant Retrieval',
    description: 'Retrieve your lost or forgotten Bank Verification Number (BVN) instantly using your registered phone number or personal details.',
    icon: Search,
    color: 'teal',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
    cardBorder: 'border-teal-200/60 hover:border-teal-500',
    iconBg: 'bg-teal-500/10 text-teal-600',
    features: ['Retrieve via Phone Number', 'No Bank Hall Stresses', 'Official BVN Slip PDF', 'Instant Status Result'],
    link: '/bvn-modification-nigeria',
  },
  {
    id: 'nin-modification',
    title: 'NIN Modification',
    badge: 'NIMC Authorized Service',
    description: 'Official demographic details correction for National Identity Number (NIN): change of name, DOB, address update, and phone linkage.',
    icon: Award,
    color: 'purple',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    cardBorder: 'border-purple-200/60 hover:border-purple-500',
    iconBg: 'bg-purple-500/10 text-purple-600',
    features: ['NIMC Authorized Data Modification', 'Name, DOB & Address Correction', 'Full Documentation Assistance', 'Verified Legal Process'],
    link: '/nin-modification-nigeria',
  },
  {
    id: 'nin-validation',
    title: 'NIN Validation & Slips',
    badge: 'Instant Validation',
    description: 'Validate your NIN status in real time and generate official Regular, Standard, Premium, and VNIN slips with QR code verification.',
    icon: FileText,
    color: 'indigo',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    cardBorder: 'border-indigo-200/60 hover:border-indigo-500',
    iconBg: 'bg-indigo-500/10 text-indigo-600',
    features: ['Real-time NIN Status Validation', 'Print Regular & Premium NIN Slips', 'Virtual NIN (VNIN) Retrieval', 'Instant High-Res PDF Download'],
    link: '/print-nin-slip-nigeria',
  },
  {
    id: 'bvn-license',
    title: 'BVN Verification License & API',
    badge: 'Developer & Agent Portal',
    description: 'Access official BVN Verification License & Search API endpoints for agents, businesses, and developers needing automated lookups.',
    icon: Key,
    color: 'blue',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    cardBorder: 'border-blue-200/60 hover:border-blue-500',
    iconBg: 'bg-blue-500/10 text-blue-600',
    features: ['Agent BVN Verification License', 'High-Speed Search API Access', 'Sandbox & Live Environment', 'Automated Webhook Callbacks'],
    link: '/bvn-modification-nigeria',
  },
];

const ICON_MAP = {
  'BVN Modification': UserCheck,
  'BVN Retrieval': Search,
  'NIN Modification': Award,
  'NIN Validation': FileText,
  'BVN License & API': Key,
  'Cheap Data Bundles': Wifi,
  'Airtime Top-up': Smartphone,
  'CAC Registration': Building2,
  'Bills & Utilities': Receipt,
  'Exam PINs': GraduationCap,
};

const COLOR_MAP = {
  blue: { iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  cyan: { iconBg: 'bg-cyan-50', iconColor: 'text-cyan-600' },
  orange: { iconBg: 'bg-orange-50', iconColor: 'text-orange-600' },
  green: { iconBg: 'bg-green-50', iconColor: 'text-green-600' },
  emerald: { iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  purple: { iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
  indigo: { iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  rose: { iconBg: 'bg-rose-50', iconColor: 'text-rose-600' },
  yellow: { iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600' },
  teal: { iconBg: 'bg-teal-50', iconColor: 'text-teal-600' },
};

export default function ServicesSection() {
  const { content } = useLandingContent();
  const activeServices = content.services.filter((s) => s.active !== false);

  return (
    <section id="services" className="py-20 lg:py-28 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ─── SECTION HEADER ─── */}
        <motion.div 
          className="text-center mb-16" 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }} 
          viewport={{ once: true }}
        >
          <span className="inline-block text-sm font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4">
            Official Identity & VTU Services
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Comprehensive <span className="text-primary">BVN, NIN & Financial Services</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Official BVN/NIN modification, instant retrieval, validation, verification licensing, and wholesale VTU data services.
          </p>
        </motion.div>

        {/* ─── FEATURED CORE IDENTITY SERVICES (EMPTHASIZED) ─── */}
        <div className="mb-16">
          <div className="flex items-center space-x-3 mb-8">
            <ShieldCheck className="w-7 h-7 text-primary" />
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Featured Identity Services: BVN & NIN Solutions
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CORE_IDENTITY_SERVICES.map((service, index) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  viewport={{ once: true }}
                  className={`group relative bg-white rounded-2xl p-7 border-2 ${service.cardBorder} shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between`}
                >
                  <div>
                    {/* Top Row: Icon + Badge */}
                    <div className="flex items-center justify-between mb-5">
                      <div className={`w-14 h-14 ${service.iconBg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${service.badgeBg}`}>
                        {service.badge}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h4 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary transition-colors">
                      {service.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                      {service.description}
                    </p>

                    {/* Feature List */}
                    <div className="space-y-2 mb-8 bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                      {service.features.map((feat) => (
                        <div key={feat} className="flex items-start text-xs font-medium text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Link */}
                  <Link
                    to={service.link}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-900 text-white hover:bg-primary font-semibold text-xs rounded-xl transition-all shadow-md group-hover:shadow-lg"
                  >
                    <span>Access Service</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ─── ALL DIGITAL & VTU SERVICES GRID ─── */}
        <div className="pt-8 border-t border-gray-200/80">
          <div className="flex items-center space-x-3 mb-8">
            <Smartphone className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold text-gray-900">
              All Digital VTU & Utility Services
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {activeServices.map((service, index) => {
              const Icon = ICON_MAP[service.title] || Smartphone;
              const palette = COLOR_MAP[service.color] || COLOR_MAP.blue;
              const linkHref = service.link || "/register";
              return (
                <motion.div 
                  key={service.title} 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.4, delay: index * 0.04 }} 
                  viewport={{ once: true }} 
                  className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className={`w-12 h-12 ${palette.iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-6 w-6 ${palette.iconColor}`} />
                    </div>
                    <h4 className="text-base font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{service.title}</h4>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">{service.description}</p>
                    <div className="space-y-1.5 mb-5">
                      {(service.features || []).map((f) => (
                        <div key={f} className="flex items-center text-xs text-gray-500">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2 shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link to={linkHref} className="inline-flex items-center text-xs font-semibold text-primary group-hover:gap-2 gap-1 transition-all pt-2 border-t border-gray-50">
                    Learn More <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ─── BOTTOM CTA ─── */}
        <motion.div className="text-center mt-16" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} viewport={{ once: true }}>
          <p className="text-gray-500 mb-6">Need a custom solution or developer API access? We're here to help.</p>
          <Link to="/register" className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#1e90ff] to-[#004687] text-white font-semibold rounded-xl hover:from-[#1e90ff]/90 hover:to-[#004687]/90 transition-all shadow-lg hover:shadow-xl">
            Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
