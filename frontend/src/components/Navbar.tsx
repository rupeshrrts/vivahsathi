import React, { useState } from 'react';
import { UserCheck, Menu, X, Globe, LogIn, Sparkles } from 'lucide-react';
import type { Language } from '../types';
import { translations } from '../translations';
import { VivahSathiLogo } from './VivahSathiLogo';

interface NavbarProps {
  lang: Language;
  setLang: (l: Language) => void;
  onOpenBooking: (packageId?: string, categoryId?: string) => void;
  onOpenTrack: () => void;
  onOpenAdmin: () => void;
  activeSection: string;
  setActiveSection: (sec: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  setLang,
  onOpenBooking,
  onOpenTrack,
  onOpenAdmin,
  activeSection,
  setActiveSection,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 bg-maroon-950/90 backdrop-blur-xl border-b border-gold-500/25 text-white shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <VivahSathiLogo 
            variant="full" 
            size="md" 
            lang={lang} 
            onClick={() => setActiveSection('home')} 
          />

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-7">
            <button
              onClick={() => setActiveSection('home')}
              className={`text-sm font-semibold transition-colors hover:text-gold-400 ${
                activeSection === 'home' ? 'text-gold-400 border-b-2 border-gold-400 pb-1' : 'text-cream-200'
              }`}
            >
              {t.navHome}
            </button>
            <button
              onClick={() => setActiveSection('services')}
              className={`text-sm font-semibold transition-colors hover:text-gold-400 ${
                activeSection === 'services' ? 'text-gold-400 border-b-2 border-gold-400 pb-1' : 'text-cream-200'
              }`}
            >
              {t.navCategories}
            </button>
            <button
              onClick={() => setActiveSection('packages')}
              className={`text-sm font-semibold transition-colors hover:text-gold-400 ${
                activeSection === 'packages' ? 'text-gold-400 border-b-2 border-gold-400 pb-1' : 'text-cream-200'
              }`}
            >
              {t.navPackages}
            </button>
            <button
              onClick={onOpenTrack}
              className="text-sm font-semibold text-gold-300 hover:text-gold-200 transition-colors flex items-center space-x-1 bg-maroon-800/80 px-3 py-1.5 rounded-full border border-gold-500/20"
            >
              <UserCheck className="w-4 h-4 text-gold-400" />
              <span>{t.navTrack}</span>
            </button>
            <button
              onClick={() => setActiveSection('about')}
              className={`text-sm font-semibold transition-colors hover:text-gold-400 ${
                activeSection === 'about' ? 'text-gold-400 border-b-2 border-gold-400 pb-1' : 'text-cream-200'
              }`}
            >
              {t.navAbout}
            </button>
          </nav>

          {/* Right Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Language Switcher */}
            <div className="flex items-center bg-maroon-950 p-1 rounded-full border border-gold-500/30 text-xs">
              <button
                onClick={() => setLang('hi')}
                className={`px-3 py-1 rounded-full font-bold transition-all ${
                  lang === 'hi' ? 'bg-gold-500 text-maroon-950 shadow-sm' : 'text-gold-200 hover:text-white'
                }`}
              >
                हिंदी
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-full font-bold transition-all ${
                  lang === 'en' ? 'bg-gold-500 text-maroon-950 shadow-sm' : 'text-gold-200 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {/* Admin Portal button */}
            <button
              onClick={onOpenAdmin}
              className="p-2 rounded-full text-gold-300 hover:text-white hover:bg-maroon-800/80 border border-gold-500/30 transition-all"
              title={t.navAdmin}
            >
              <LogIn className="w-5 h-5 text-gold-400" />
            </button>

            {/* Book Now Button */}
            <button
              onClick={() => onOpenBooking()}
              className="btn-gold-shimmer px-5 py-2.5 rounded-full bg-gradient-to-r from-gold-500 via-gold-400 to-gold-600 text-maroon-950 font-bold text-sm shadow-gold-glow hover:brightness-110 active:scale-95 transition-all flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-maroon-900" />
              <span>{t.bookNow}</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center space-x-3">
            {/* Quick Lang Switch */}
            <button
              onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
              className="px-2.5 py-1 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-300 text-xs font-bold flex items-center space-x-1"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang.toUpperCase()}</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gold-300 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-maroon-950 border-b border-gold-500/30 px-4 pt-3 pb-6 space-y-3">
          <button
            onClick={() => { setActiveSection('home'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-base font-medium text-cream-100 hover:text-gold-400"
          >
            {t.navHome}
          </button>
          <button
            onClick={() => { setActiveSection('services'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-base font-medium text-cream-100 hover:text-gold-400"
          >
            {t.navCategories}
          </button>
          <button
            onClick={() => { setActiveSection('packages'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-base font-medium text-cream-100 hover:text-gold-400"
          >
            {t.navPackages}
          </button>
          <button
            onClick={() => { onOpenTrack(); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-base font-medium text-gold-300 hover:text-gold-200 flex items-center space-x-2"
          >
            <UserCheck className="w-4 h-4 text-gold-400" />
            <span>{t.navTrack}</span>
          </button>
          <button
            onClick={() => { setActiveSection('about'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-base font-medium text-cream-100 hover:text-gold-400"
          >
            {t.navAbout}
          </button>
          <button
            onClick={() => { onOpenAdmin(); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-base font-medium text-gold-400 flex items-center space-x-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{t.navAdmin}</span>
          </button>

          <div className="pt-2 flex flex-col space-y-2">
            <button
              onClick={() => { onOpenBooking(); setMobileMenuOpen(false); }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-maroon-950 font-bold text-center shadow-gold-glow"
            >
              {t.bookNow}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
