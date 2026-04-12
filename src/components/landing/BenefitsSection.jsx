import { motion } from 'framer-motion';
import { Shield, Zap, Clock, Headphones } from 'lucide-react';
import { useLandingContent } from '../../contexts/LandingContentContext';

const ICONS = [Shield, Zap, Clock, Headphones];
const COLORS = [
  { color: 'text-blue-600', bg: 'bg-blue-50' },
  { color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { color: 'text-green-600', bg: 'bg-green-50' },
  { color: 'text-purple-600', bg: 'bg-purple-50' },
];

export default function BenefitsSection() {
  const { content } = useLandingContent();
  const b = content.benefits;

  return (
    <section id="benefits" className="py-20 lg:py-32 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
          <span className="inline-block text-sm font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4">{b.sectionBadge}</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">{b.heading}</h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">{b.subheading}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {b.items.map((item, index) => {
            const Icon = ICONS[index % ICONS.length];
            const palette = COLORS[index % COLORS.length];
            return (
              <motion.div key={item.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }} className="text-center group hover:scale-105 transition-transform duration-300">
                <div className={`w-16 h-16 ${palette.bg} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-lg transition-shadow`}>
                  <Icon className={`h-8 w-8 ${palette.color}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.description}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} viewport={{ once: true }} className="mt-16">
          <div className="bg-gradient-to-r from-primary/5 to-secondary/10 rounded-3xl p-8 md:p-12 text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{b.bannerTitle}</h3>
            <p className="text-gray-600 mb-6">{b.bannerSubtitle}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center space-x-2">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-2 font-semibold text-gray-800">{b.ratingText}</span>
              </div>
              <div className="text-gray-500 text-sm">Based on {b.reviewCount}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
