import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../ui/Logo';
import {
  Menu, X, ChevronDown,
  Smartphone, Wifi, Receipt, UserCheck, Award,
  Building2, GraduationCap, Banknote, ShieldCheck, BookOpen, Code
} from 'lucide-react';

const services = [
  { icon: Smartphone, title: 'Airtime', description: 'Buy airtime for all networks' },
  { icon: Wifi, title: 'Data', description: 'Purchase data bundles' },
  { icon: Receipt, title: 'Bills', description: 'Pay utility bills' },
  { icon: UserCheck, title: 'BVN Services', description: 'BVN verification services' },
  { icon: Award, title: 'NIN Services', description: 'National ID services' },
  { icon: Building2, title: 'CAC Registration', description: 'Business registration' },
  { icon: GraduationCap, title: 'Education', description: 'Educational services' },
  { icon: Banknote, title: 'Agency Banking', description: 'POS and banking services' },
  { icon: ShieldCheck, title: 'Verification', description: 'Identity verification' },
  { icon: BookOpen, title: 'Training', description: 'Professional training' },
  { icon: Code, title: 'Software Dev', description: 'Custom software solutions' },
];

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const servicesRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-white/80 backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <Logo className="w-9 h-9" />
            <span className="font-bold text-xl text-gray-900">UFriends IT</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-600 hover:text-primary transition-colors font-medium text-sm">
              Home
            </Link>

            {/* Services dropdown */}
            <div className="relative" ref={servicesRef}>
              <button
                onClick={() => setServicesOpen(!servicesOpen)}
                className="flex items-center space-x-1 text-gray-600 hover:text-primary transition-colors font-medium text-sm"
              >
                <span>Services</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {servicesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[560px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 grid grid-cols-3 gap-2"
                  >
                    {services.map((service) => {
                      const Icon = service.icon;
                      return (
                        <Link
                          key={service.title}
                          to="/login"
                          onClick={() => setServicesOpen(false)}
                          className="flex items-start space-x-3 p-3 rounded-xl hover:bg-blue-50 transition-colors group"
                        >
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800 group-hover:text-primary transition-colors">{service.title}</div>
                            <div className="text-xs text-gray-500">{service.description}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <a href="#benefits" className="text-gray-600 hover:text-primary transition-colors font-medium text-sm">
              About
            </a>
            <a href="#faq" className="text-gray-600 hover:text-primary transition-colors font-medium text-sm">
              FAQ
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-gray-50"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#1e90ff] to-[#004687] hover:from-[#1e90ff]/90 hover:to-[#004687]/90 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-primary hover:bg-gray-50 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              <Link to="/" onClick={() => setMobileOpen(false)} className="block px-4 py-2 text-gray-700 hover:text-primary hover:bg-blue-50 rounded-xl transition-colors font-medium">Home</Link>
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Services</div>
              {services.map((s) => {
                const Icon = s.icon;
                return (
                  <Link key={s.title} to="/login" onClick={() => setMobileOpen(false)} className="flex items-center space-x-3 px-4 py-2 text-gray-700 hover:text-primary hover:bg-blue-50 rounded-xl transition-colors">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{s.title}</span>
                  </Link>
                );
              })}
              <div className="pt-3 border-t border-gray-100 flex flex-col space-y-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="px-4 py-2.5 text-center text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Login</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="px-4 py-2.5 text-center text-sm font-semibold text-white bg-gradient-to-r from-[#1e90ff] to-[#004687] hover:from-[#1e90ff]/90 hover:to-[#004687]/90 rounded-xl transition-colors">Sign Up Free</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
