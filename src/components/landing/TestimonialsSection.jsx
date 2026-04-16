import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useLandingContent } from '../../contexts/LandingContentContext';

const GRADIENTS = [
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-green-400 to-green-600',
  'from-orange-400 to-orange-600',
];

export default function TestimonialsSection() {
  const { content } = useLandingContent();
  const t = content.testimonials;

  return (
    <section id="testimonials" className="py-20 lg:py-32 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
          <span className="inline-block text-sm font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4">{t.sectionBadge}</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">{t.heading}</h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">{t.subheading}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {t.items.map((testimonial, index) => (
            <motion.div key={testimonial.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }} viewport={{ once: true }} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="mb-4"><Quote className="w-8 h-8 text-primary/20" /></div>
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
              </div>
              <blockquote className="text-gray-600 mb-6 leading-relaxed text-sm italic">"{testimonial.content}"</blockquote>
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} flex items-center justify-center shrink-0`}>
                  <span className="text-white font-bold text-sm">{testimonial.initials || testimonial.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{testimonial.name}</div>
                  <div className="text-xs text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} viewport={{ once: true }} className="mt-16">
          <p className="text-center text-gray-500 mb-8">Ready to join thousands of satisfied customers?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {t.stats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl px-8 py-5 border border-gray-100 shadow-sm text-center min-w-[160px]">
                <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
