import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';
import { useLandingContent } from '../../contexts/LandingContentContext';

export default function LandingFooter() {
  const { content } = useLandingContent();
  const f = content.footer;
  const nav = content.navbar;

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Logo className="w-8 h-8" />
              <span className="font-bold text-xl">{nav.brandName}</span>
            </div>
            <p className="text-gray-400 mb-6 text-sm leading-relaxed max-w-sm">
              {f.description}
            </p>
            <div className="flex space-x-3">
              {f.social.facebook && (
                <a
                  href={f.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1877F2'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </a>
              )}
              {f.social.twitter && (
                <a
                  href={f.social.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter / X"
                  className="group w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#000000'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                </a>
              )}
              {f.social.tiktok && (
                <a
                  href={f.social.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="group w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#010101'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" /></svg>
                </a>
              )}
              {f.social.youtube && (
                <a
                  href={f.social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="group w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FF0000'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-gray-400 hover:text-primary transition-colors">Home</Link></li>
              <li><a href="/#services" className="text-sm text-gray-400 hover:text-primary transition-colors">Services</a></li>
              <li><Link to="/about" className="text-sm text-gray-400 hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-sm text-gray-400 hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/contact" className="text-sm text-gray-400 hover:text-primary transition-colors">Support</Link></li>
              <li><Link to="/reseller" className="text-sm text-gray-400 hover:text-primary transition-colors">Become a Reseller</Link></li>
            </ul>
          </div>

          {/* Identity & VTU Services */}
          <div>
            <h3 className="font-semibold text-white mb-4">Identity & Services</h3>
            <ul className="space-y-2">
              <li><Link to="/bvn-modification-nigeria" className="text-sm text-gray-400 hover:text-primary transition-colors">BVN Modification</Link></li>
              <li><Link to="/bvn-modification-nigeria" className="text-sm text-gray-400 hover:text-primary transition-colors">BVN Retrieval</Link></li>
              <li><Link to="/nin-modification-nigeria" className="text-sm text-gray-400 hover:text-primary transition-colors">NIN Modification</Link></li>
              <li><Link to="/print-nin-slip-nigeria" className="text-sm text-gray-400 hover:text-primary transition-colors">NIN Validation & Slips</Link></li>
              <li><Link to="/bvn-modification-nigeria" className="text-sm text-gray-400 hover:text-primary transition-colors">BVN License & API</Link></li>
              <li><Link to="/buy-data-nigeria" className="text-sm text-gray-400 hover:text-primary transition-colors">Cheap Data Bundles</Link></li>
            </ul>
          </div>

          {/* Blog & Legal */}
          <div>
            <h3 className="font-semibold text-white mb-4">Blog & Legal</h3>
            <ul className="space-y-2">
              <li><Link to="/blog" className="text-sm text-primary font-semibold hover:underline transition-colors">UFriends IT Blog</Link></li>
              <li><Link to="/blog" className="text-sm text-gray-400 hover:text-primary transition-colors">Identity Guides & Articles</Link></li>
              <li><Link to="/privacy" className="text-sm text-gray-400 hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-gray-400 hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} {f.copyright}</p>
          <p className="text-gray-500 text-sm">{f.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
