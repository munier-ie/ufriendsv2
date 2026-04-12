import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Zap, Wifi, Tv, Fingerprint, Shield, Star } from 'lucide-react';
import Logo from '../ui/Logo';
import { useLandingContent } from '../../contexts/LandingContentContext';

const phoneIcons = [
  { icon: Zap, label: 'Airtime' },
  { icon: Wifi, label: 'Data' },
  { icon: Tv, label: 'Bills' },
  { icon: Fingerprint, label: 'BVN' },
  { icon: Shield, label: 'NIN' },
  { icon: Star, label: 'CAC' },
];

export default function HeroSection() {
  const { content } = useLandingContent();
  const hero = content.hero;

  const scrollToServices = () => {
    const el = document.getElementById('services');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50 pointer-events-none" />
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div className="space-y-8" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>{hero.badge}</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                {hero.title}{' '}
                <span className="text-primary bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {hero.titleHighlight}
                </span>{' '}
                {hero.titleEnd}
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl">{hero.subtitle}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/register" className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white font-semibold text-lg rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 hover:shadow-xl hover:-translate-y-0.5">
                {hero.primaryBtn}<ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <button onClick={scrollToServices} className="inline-flex items-center justify-center px-8 py-4 border-2 border-primary text-primary font-semibold text-lg rounded-xl hover:bg-primary hover:text-white transition-all">
                <Play className="mr-2 h-5 w-5" />{hero.secondaryBtn}
              </button>
            </div>
            <div className="flex items-center gap-8 pt-2">
              {hero.stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right – Phone Mockup */}
          <motion.div className="relative flex justify-center lg:justify-end" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.4 }}>
            <div className="relative">
              <div className="relative w-72 h-[580px] bg-gray-900 rounded-[3rem] p-2 shadow-2xl">
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
                  <div className="h-full bg-gradient-to-br from-blue-50/60 to-cyan-50/60 p-5 flex flex-col">
                    <div className="flex justify-between items-center mb-5 text-xs text-gray-500">
                      <span className="font-medium">9:41</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-2 bg-primary rounded-sm" /><div className="w-1 h-2 bg-gray-300 rounded-sm" /><div className="w-6 h-2 bg-green-500 rounded-sm" />
                      </div>
                    </div>
                    <div className="text-center mb-5">
                      <div className="flex items-center justify-center space-x-2 mb-1"><Logo className="w-7 h-7" /><span className="font-bold text-lg text-primary">{content.navbar.brandName}</span></div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest">Digital Services</p>
                    </div>
                    <div className="text-center mb-5">
                      <h2 className="text-base font-bold text-gray-900 mb-1">Secure ID &amp; Services</h2>
                      <p className="text-xs text-gray-500">Trusted by 50,000+ users</p>
                    </div>
                    <div className="mb-5">
                      <Link to="/register" className="block w-full text-center bg-primary text-white rounded-xl py-2.5 text-sm font-semibold">{hero.primaryBtn}</Link>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {phoneIcons.map(({ icon: Icon, label }) => (
                        <div key={label} className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100 text-center">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg mb-1.5 flex items-center justify-center mx-auto"><Icon className="w-4 h-4 text-primary" /></div>
                          <p className="text-[10px] font-semibold text-gray-800">{label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                      <h3 className="text-xs font-bold text-gray-800 mb-1.5">More Services</h3>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-500">
                        <span>• Education</span><span>• Agency Banking</span><span>• Training</span><span>• Software Dev</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl" />
              </div>
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-secondary/20 rounded-full blur-xl" />
              <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-primary/10 rounded-full blur-2xl" />
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="absolute -left-8 top-24 bg-white rounded-2xl shadow-xl px-4 py-3 border border-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center"><span className="text-green-600 text-sm">✓</span></div>
                  <div><div className="text-xs font-bold text-gray-800">Payment Sent</div><div className="text-xs text-green-600">Instant &amp; Secure</div></div>
                </div>
              </motion.div>
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} className="absolute -right-6 bottom-28 bg-white rounded-2xl shadow-xl px-4 py-3 border border-gray-100">
                <div className="text-xs font-bold text-gray-800">⭐ 4.9/5 Rating</div>
                <div className="text-xs text-gray-500">2,500+ Reviews</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
