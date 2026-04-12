import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useLandingContent } from '../../contexts/LandingContentContext';

export default function CtaSection() {
  const { content } = useLandingContent();
  const c = content.cta;

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-primary/5 via-white to-secondary/10 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
          <span className="inline-block text-sm font-semibold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-6">{c.badge}</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {c.heading}{' '}<span className="text-primary">{c.headingHighlight}</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">{c.subheading}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link to="/register" className="inline-flex items-center px-10 py-4 bg-primary text-white font-semibold text-lg rounded-xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 hover:-translate-y-0.5">
              {c.primaryBtn}<ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link to="/login" className="inline-flex items-center px-10 py-4 border-2 border-primary text-primary font-semibold text-lg rounded-xl hover:bg-primary hover:text-white transition-all">
              {c.secondaryBtn}
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-sm text-gray-500">
            {c.badges.map((badge) => (
              <div key={badge} className="flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-green-500" /><span>{badge}</span></div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
