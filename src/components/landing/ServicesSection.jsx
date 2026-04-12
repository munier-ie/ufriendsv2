import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Smartphone, Wifi, Receipt, UserCheck, Award,
  Building2, GraduationCap, Banknote, ShieldCheck, BookOpen, Code, ArrowRight,
} from 'lucide-react';
import { useLandingContent } from '../../contexts/LandingContentContext';

const ICON_MAP = {
  Airtime: Smartphone, Data: Wifi, 'Bills Payment': Receipt, 'BVN Services': UserCheck,
  'NIN Services': Award, 'CAC Registration': Building2, Education: GraduationCap,
  'Agency Banking': Banknote, Verification: ShieldCheck, Training: BookOpen, 'Software Dev': Code,
};
const COLOR_MAP = {
  blue: { iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  cyan: { iconBg: 'bg-cyan-50', iconColor: 'text-cyan-600' },
  orange: { iconBg: 'bg-orange-50', iconColor: 'text-orange-600' },
  green: { iconBg: 'bg-green-50', iconColor: 'text-green-600' },
  purple: { iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
  indigo: { iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  rose: { iconBg: 'bg-rose-50', iconColor: 'text-rose-600' },
  yellow: { iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600' },
  teal: { iconBg: 'bg-teal-50', iconColor: 'text-teal-600' },
  sky: { iconBg: 'bg-sky-50', iconColor: 'text-sky-600' },
  fuchsia: { iconBg: 'bg-fuchsia-50', iconColor: 'text-fuchsia-600' },
};
const FALLBACK_ICONS = [Smartphone, Wifi, Receipt, UserCheck, Award, Building2, GraduationCap, Banknote, ShieldCheck, BookOpen, Code];
const FALLBACK_COLORS = Object.values(COLOR_MAP);

export default function ServicesSection() {
  const { content } = useLandingContent();
  const activeServices = content.services.filter((s) => s.active !== false);

  return (
    <section id="services" className="py-20 lg:py-32 bg-gray-50/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
          <span className="inline-block text-sm font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4">Everything You Need</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Comprehensive <span className="text-primary">Financial Services</span></h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">From everyday transactions to business solutions — we provide a complete suite of digital services.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {activeServices.map((service, index) => {
            const Icon = ICON_MAP[service.title] || FALLBACK_ICONS[index % FALLBACK_ICONS.length];
            const palette = COLOR_MAP[service.color] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
            return (
              <motion.div key={service.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.05 }} viewport={{ once: true }} className="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 ${palette.iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-6 w-6 ${palette.iconColor}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{service.title}</h3>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{service.description}</p>
                <div className="space-y-1.5 mb-5">
                  {(service.features || []).map((f) => (
                    <div key={f} className="flex items-center text-xs text-gray-500"><div className="w-1.5 h-1.5 bg-primary rounded-full mr-2 shrink-0" />{f}</div>
                  ))}
                </div>
                <Link to="/register" className="inline-flex items-center text-xs font-semibold text-primary group-hover:gap-2 gap-1 transition-all">
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        <motion.div className="text-center mt-16" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} viewport={{ once: true }}>
          <p className="text-gray-500 mb-6">Need a custom solution? We're here to help.</p>
          <Link to="/register" className="inline-flex items-center px-8 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl">
            Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
