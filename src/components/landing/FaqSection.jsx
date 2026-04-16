import React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageCircle, Mail, Phone } from 'lucide-react';
import { useLandingContent } from '../../contexts/LandingContentContext';

function FaqItem({ faq, index }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.07 }} viewport={{ once: true }} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left">
        <span className="font-semibold text-gray-900 text-sm pr-4">{faq.question}</span>
        <ChevronDown className={`w-5 h-5 text-primary shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <p className="px-6 pb-5 text-sm text-gray-500 leading-relaxed">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FaqSection() {
  const { content } = useLandingContent();
  const f = content.faq;

  return (
    <section id="faq" className="py-20 lg:py-32 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left */}
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <span className="inline-block text-sm font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4">{f.sectionBadge}</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">{f.heading}</h2>
            <p className="text-lg text-gray-600 mb-10">{f.subheading}</p>
            <div className="bg-gradient-to-br from-primary/5 to-secondary/10 rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center"><MessageCircle className="w-5 h-5 text-white" /></div>
                <div><div className="font-bold text-gray-900">Still have questions?</div><div className="text-sm text-gray-500">Our support team is ready to help</div></div>
              </div>
              <div className="space-y-3 mb-5">
                <div className="flex items-center space-x-2 text-sm"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-gray-600">{f.support.hours} Support Available</span></div>
                <div className="flex items-center space-x-2 text-sm"><div className="w-2 h-2 bg-blue-500 rounded-full" /><span className="text-gray-600">Average Response: 2 minutes</span></div>
              </div>
              <div className="flex flex-col gap-2">
                <a href={`mailto:${f.support.email}`} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"><Mail className="w-4 h-4" /><span>{f.support.email}</span></a>
                <a href={`tel:${f.support.phone}`} className="flex items-center space-x-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"><Phone className="w-4 h-4" /><span>{f.support.phone}</span></a>
              </div>
            </div>
          </motion.div>

          {/* Right – FAQ Accordion */}
          <div className="space-y-3">
            {f.items.map((faq, index) => <FaqItem key={faq.question} faq={faq} index={index} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
