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
    features: [
      'Name, phone number and DOB correction',
      '100% smooth online process',
      'Resolution delivered in less than 7 days',
      'Quick turnarounds & support',
    ],
    link: '/bvn-modification-nigeria',
  },
  {
    id: 'bvn-retrieval',
    title: 'BVN Retrieval',
    badge: 'Instant Retrieval',
    description: 'Retrieve your lost or forgotten Bank Verification Number (BVN) instantly using your registered phone number or personal details.',
    icon: Search,
    features: ['Retrieve via Phone Number', 'No Bank Hall Stresses', 'Official BVN Slip PDF', 'Instant Status Result'],
    link: '/bvn-modification-nigeria',
  },
  {
    id: 'nin-modification',
    title: 'NIN Modification',
    badge: 'NIMC Authorized Service',
    description: 'Official demographic details correction for National Identity Number (NIN): change of name, DOB, address update, and phone linkage.',
    icon: Award,
    features: ['NIMC Authorized Data Modification', 'Name, DOB & Address Correction', 'Full Documentation Assistance', 'Verified Legal Process'],
    link: '/nin-modification-nigeria',
  },
  {
    id: 'nin-validation',
    title: 'NIN Validation & Slips',
    badge: 'Instant Validation',
    description: 'Validate your NIN status in real time and generate official Regular, Standard, Premium, and VNIN slips with QR code verification.',
    icon: FileText,
    features: ['Real-time NIN Status Validation', 'Print Regular & Premium NIN Slips', 'Virtual NIN (VNIN) Retrieval', 'Instant High-Res PDF Download'],
    link: '/print-nin-slip-nigeria',
  },
  {
    id: 'bvn-license',
    title: 'BVN Verification License & API',
    badge: 'Developer & Agent Portal',
    description: 'Access official BVN Verification License & Search API endpoints for agents, businesses, and developers needing automated lookups.',
    icon: Key,
    features: ['Agent BVN Verification License', 'High-Speed Search API Access', 'Sandbox & Live Environment', 'Automated Webhook Callbacks'],
    link: '/bvn-modification-nigeria',
  },
];

const ICON_MAP = {
  'Cheap Data Bundles': Wifi,
  'Airtime Top-up': Smartphone,
  'CAC Registration': Building2,
  'Bills & Utilities': Receipt,
  'Exam PINs': GraduationCap,
  'Bills Payment': Receipt,
  Airtime: Smartphone,
  Data: Wifi,
  Education: GraduationCap,
  'Agency Banking': Banknote,
  Verification: ShieldCheck,
  Training: BookOpen,
  'Software Dev': Code,
};

export default function ServicesSection() {
  const { content } = useLandingContent();
  
  // Filter out BVN and NIN services from the general VTU & Utility Services list to avoid duplication
  const vtuServices = content.services.filter((s) => {
    if (s.active === false) return false;
    const titleLower = s.title.toLowerCase();
    return !titleLower.includes('bvn') && !titleLower.includes('nin');
  });

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
          <span className="inline-block text-sm font-semibold text-[#004687] bg-blue-50 border border-blue-200/80 px-4 py-1.5 rounded-full mb-4">
            Official Identity & VTU Services
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Comprehensive <span className="text-[#004687]">Identity & Financial Services</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Official BVN/NIN modification, instant retrieval, validation, verification licensing, and wholesale VTU data services.
          </p>
        </motion.div>

        {/* ─── FEATURED CORE IDENTITY SERVICES ─── */}
        <div className="mb-16">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#004687]" />
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Featured Identity Services
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
                  className="group relative overflow-hidden bg-white rounded-2xl p-7 border border-blue-100/80 shadow-sm hover:shadow-xl hover:border-[#1e90ff] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Subtle Watermarked Background Icon (Fades in on hover only) */}
                  <div className="absolute -top-4 -right-4 pointer-events-none opacity-0 group-hover:opacity-[0.07] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ease-out text-[#004687]">
                    <Icon className="w-36 h-36 stroke-[1.2]" />
                  </div>

                  <div className="relative z-10">
                    {/* Top Row: Badge pill */}
                    <div className="mb-4">
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-[#004687] border border-blue-200/80 inline-block">
                        {service.badge}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h4 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#004687] transition-colors">
                      {service.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                      {service.description}
                    </p>

                    {/* Feature List */}
                    <div className="space-y-2 mb-8 bg-blue-50/40 p-4 rounded-xl border border-blue-100/60">
                      {service.features.map((feat) => (
                        <div key={feat} className="flex items-start text-xs font-medium text-gray-700">
                          <CheckCircle2 className="w-4 h-4 text-[#1e90ff] mr-2 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Link */}
                  <Link
                    to={service.link}
                    className="relative z-10 w-full inline-flex items-center justify-center px-4 py-3.5 bg-gradient-to-r from-[#1e90ff] to-[#004687] text-white hover:from-[#1e90ff]/90 hover:to-[#004687]/90 font-semibold text-xs rounded-xl transition-all shadow-md group-hover:shadow-lg"
                  >
                    <span>Access Service</span>
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ─── VTU & UTILITY SERVICES GRID ─── */}
        <div className="pt-8 border-t border-gray-200/80">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-[#004687]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              VTU & Utility Services
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {vtuServices.map((service, index) => {
              const Icon = ICON_MAP[service.title] || Smartphone;
              const linkHref = service.link || "/register";
              return (
                <motion.div 
                  key={service.title} 
                  initial={{ opacity: 0, y: 20 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.4, delay: index * 0.04 }} 
                  viewport={{ once: true }} 
                  className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 bg-blue-50/80 border border-blue-100 rounded-xl flex items-center justify-center text-[#004687] mb-4 group-hover:bg-[#004687] group-hover:text-white transition-all">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h4 className="text-base font-bold text-gray-900 mb-2 group-hover:text-[#004687] transition-colors">{service.title}</h4>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">{service.description}</p>
                    <div className="space-y-1.5 mb-5">
                      {(service.features || []).map((f) => (
                        <div key={f} className="flex items-center text-xs text-gray-500">
                          <div className="w-1.5 h-1.5 bg-[#1e90ff] rounded-full mr-2 shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link to={linkHref} className="inline-flex items-center text-xs font-semibold text-[#004687] group-hover:text-[#1e90ff] group-hover:gap-2 gap-1 transition-all pt-2 border-t border-gray-50">
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
