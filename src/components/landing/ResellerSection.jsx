import { Globe, Smartphone, ArrowRight, Zap, ShieldCheck, TrendingUp, Apple, Wifi, Layers } from 'lucide-react';
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function ResellerSection() {
  return (
    <section className="py-24 relative overflow-hidden bg-transparent">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -ml-64 -mb-64" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="inline-block text-sm font-bold text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-6"
            >
              Business Opportunity
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl font-black text-slate-900 mb-6 leading-tight"
            >
              Start Your Own <span className="text-primary">VTU & Fintech</span> Business
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-slate-400 mb-10 leading-relaxed"
            >
              Don't just be a user, become a technology provider. <span className="text-slate-700 font-bold">Buy a professional VTU website</span> and native <span className="text-slate-700 font-bold">VTU mobile applications</span> (Android & iOS) tailored for the Nigerian market. From airtime vending to utility bill payments, we provide the complete infrastructure you need to launch a high-earning digital agency in 72 hours.
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
              {[
                { icon: Zap, title: "Launch VTU Website", desc: "Get your web portal ready in 48-72 hours." },
                { icon: ShieldCheck, title: "Fintech Grade", desc: "Built on our secure, proven infrastructure." },
                { icon: Globe, title: "Full White-Label", desc: "Your brand, your logo, your own domain." },
                { icon: TrendingUp, title: "Build Your Agency", desc: "Automate sales and earn passive income." }
              ].map((item, i) => (
                <motion.div 
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  className="flex gap-4"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 border border-primary/10">
                    <item.icon size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Link 
                to="/reseller" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/20"
              >
                View Pricing & Plans <ArrowRight size={20} />
              </Link>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="relative h-[500px] flex items-center justify-center lg:justify-end"
          >
            {/* ─── Premium 3D Layered Mockup ─── */}

            {/* Laptop Mockup (Main Backdrop) */}
            <div className="absolute w-[440px] h-[280px] bg-slate-900 rounded-2xl border-[6px] border-slate-800 shadow-2xl rotate-[-2deg] z-0 overflow-hidden group">
                <div className="w-full h-full bg-white p-3 flex flex-col gap-3">
                    {/* Admin Dashboard Mock UI */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                        </div>
                        <div className="w-24 h-2.5 bg-slate-100 rounded-full" />
                    </div>
                    <div className="flex gap-3 h-full">
                        <div className="w-16 bg-slate-50 rounded-lg" />
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="h-12 bg-primary/5 border border-primary/10 rounded-xl p-2">
                                    <div className="h-1.5 w-1/2 bg-primary/20 rounded-full mb-2" />
                                    <div className="h-2.5 w-3/4 bg-primary rounded-full" />
                                </div>
                                <div className="h-12 bg-slate-50 rounded-xl" />
                            </div>
                            <div className="h-24 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                                <TrendingUp size={24} className="text-primary/40" />
                                <div className="h-1.5 w-1/3 bg-slate-200 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-0 w-full h-3 bg-slate-800 flex justify-center">
                    <div className="w-12 h-1 bg-slate-700 rounded-full mt-0.5" />
                </div>
            </div>

            {/* Android Device (User App View) */}
            <motion.div 
              initial={{ x: 80, y: 40, opacity: 0, rotate: -12 }}
              whileInView={{ x: 0, y: 0, opacity: 1, rotate: -12 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="absolute left-0 lg:-left-12 bottom-12 w-36 h-[280px] bg-slate-950 rounded-[2.5rem] p-2 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] z-20 border-2 border-slate-800"
            >
                <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden p-3 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <div className="w-4 h-4 bg-primary/20 rounded-md" />
                        <div className="flex gap-0.5">
                            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                        </div>
                    </div>
                    <div className="h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl mb-4 p-2.5">
                        <div className="h-1 w-1/2 bg-white/20 rounded-full mb-2" />
                        <div className="h-3 w-3/4 bg-white rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[Zap, Wifi, Smartphone, Layers].map((Icon, i) => (
                            <div key={i} className="aspect-square bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center">
                                <Icon size={16} className="text-primary/60" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-auto h-6 bg-primary rounded-xl" />
                </div>
            </motion.div>

            {/* iOS Device (Success/Receipt View) */}
            <motion.div 
              initial={{ x: -80, y: 40, opacity: 0, rotate: 8 }}
              whileInView={{ x: 0, y: 0, opacity: 1, rotate: 8 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="absolute right-0 lg:-right-8 top-12 w-40 h-[300px] bg-slate-950 rounded-[2.8rem] p-2.5 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] z-20 border-2 border-slate-800"
            >
                <div className="w-full h-full bg-slate-50 rounded-[2.2rem] overflow-hidden p-4 flex flex-col items-center">
                    <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4 border border-green-100 shadow-sm">
                        <ShieldCheck size={28} />
                    </div>
                    <div className="w-full space-y-3">
                        <div className="h-2 w-2/3 bg-slate-200 rounded-full mx-auto" />
                        <div className="h-6 w-1/2 bg-slate-900 rounded-xl mx-auto" />
                        <div className="space-y-1.5 pt-4">
                            <div className="flex justify-between"><div className="w-8 h-1.5 bg-slate-200 rounded-full" /><div className="w-12 h-1.5 bg-slate-300 rounded-full" /></div>
                            <div className="flex justify-between"><div className="w-10 h-1.5 bg-slate-200 rounded-full" /><div className="w-8 h-1.5 bg-slate-300 rounded-full" /></div>
                        </div>
                    </div>
                    <button className="mt-auto w-full h-10 bg-white border border-slate-200 rounded-2xl text-[9px] font-black uppercase text-slate-400">Download PDF</button>
                </div>
                {/* Dynamic Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-5 bg-slate-950 rounded-b-xl flex items-center justify-center">
                    <div className="w-6 h-1 bg-slate-800 rounded-full" />
                </div>
            </motion.div>

            {/* Static Stats Badge */}
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="absolute -bottom-6 right-24 bg-white p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 z-30"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                  <TrendingUp size={24} />
                </div>
                <div className="pr-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Monthly Commissions</p>
                  <p className="text-xl font-black text-slate-900 leading-none mt-2">₦250k+</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
