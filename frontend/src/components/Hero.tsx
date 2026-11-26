import React from 'react';
import { ShieldAlert, Sparkles, CheckCircle2, MessageCircle, ArrowRight, Star, Users, Award, MapPin } from 'lucide-react';
import type { Language } from '../types';
import { translations } from '../translations';

interface HeroProps {
  lang: Language;
  onOpenBooking: () => void;
  onOpenTrack: () => void;
}

export const Hero: React.FC<HeroProps> = ({ lang, onOpenBooking, onOpenTrack }) => {
  const t = translations[lang];

  return (
    <div className="relative overflow-hidden bg-royal-gradient text-white pt-12 pb-24 border-b border-gold-500/25">
      
      {/* Decorative Background Patterns & Ambient Glows */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-gradient-to-b from-gold-500/15 via-maroon-800/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-maroon-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Managed Aggregator Guarantee Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center space-x-2.5 px-5 py-2 rounded-full glass-maroon border border-gold-400/40 text-gold-300 text-xs sm:text-sm font-semibold shadow-gold-glow animate-bounce-slow">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span>{t.trustPitch}</span>
            <span className="hidden sm:inline-block bg-gradient-to-r from-gold-500 to-gold-400 text-maroon-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm">
              BIHAR & UP
            </span>
          </div>
        </div>

        {/* Hero Main Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-royal tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-cream-50 via-gold-200 via-gold-300 to-gold-400 drop-shadow-md">
            {t.heroTitle}
          </h1>
          
          <p className="mt-6 text-base sm:text-lg lg:text-xl text-cream-200/90 font-normal leading-relaxed max-w-3xl mx-auto drop-shadow-sm">
            {t.heroSub}
          </p>

          {/* Quick CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onOpenBooking()}
              className="w-full sm:w-auto btn-gold-shimmer px-8 py-4 rounded-xl bg-gradient-to-r from-gold-500 via-gold-400 to-gold-600 text-maroon-950 font-black text-base shadow-gold-glow hover:scale-105 transition-all flex items-center justify-center space-x-3 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-maroon-950" />
              <span>{t.bookNow}</span>
              <ArrowRight className="w-5 h-5 text-maroon-950" />
            </button>

            <a
              href="https://wa.me/919876543210?text=Namaste%20VivahSathi%2C%20I%20want%20to%20book%20wedding%20services"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg transition-all flex items-center justify-center space-x-2 border border-emerald-400/40 cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 text-white" />
              <span>{t.whatsappUs}</span>
            </a>

            <button
              onClick={onOpenTrack}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-maroon-950/80 hover:bg-maroon-900 text-gold-300 font-semibold text-base border border-gold-500/30 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md"
            >
              <span>{t.navTrack}</span>
            </button>
          </div>
        </div>

        {/* Hero Featured Visual Showcase Banner */}
        <div className="mt-14 relative rounded-3xl overflow-hidden border-2 border-gold-500/35 shadow-2xl max-w-5xl mx-auto bg-royal-card">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="relative h-64 md:h-auto overflow-hidden">
              <img
                src="/images/mandap.jpg"
                alt="Royal Mandap Decoration"
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-3 left-3 badge-shadi px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                <Star className="w-3.5 h-3.5 fill-gold-400 text-gold-400" />
                <span>Verified Local Vendors</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gold-500/25 bg-maroon-950/70 backdrop-blur-md">
              <div>
                <div className="text-xs font-extrabold text-gold-400 uppercase tracking-widest mb-1 flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-gold-400" />
                  <span>100% Managed Aggregator Model</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-royal text-cream-100">
                  {lang === 'hi' ? 'शादी की हर ज़रूरत, एक ही छत के नीचे' : 'Every Rural Wedding Service, Under One Roof'}
                </h3>
                <p className="mt-2.5 text-xs sm:text-sm text-cream-200/90 leading-relaxed">
                  {lang === 'hi'
                    ? 'टेंट हाउस, हलवाई कैटरिंग, बैंड-बाजा, वीडियोग्राफी, और पूजा मुहूर्त। यदि कोई वेंडर अनुपस्थित होता है, तो विवाह साथी का बैकअप वेंडर तुरंत सेवा शुरू करेगा।'
                    : 'Tent shamiyana, master halwai, baraat band, videography, and Vedic rituals. If a vendor fails, VivahSathi backup vendor steps in instantly.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gold-500/20 grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center space-x-2 text-gold-300">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>Primary + Backup Vendor</span>
                </div>
                <div className="flex items-center space-x-2 text-gold-300">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>Day-of Field Manager</span>
                </div>
                <div className="flex items-center space-x-2 text-gold-300">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>Transparent Mandi Rates</span>
                </div>
                <div className="flex items-center space-x-2 text-gold-300">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
                  <span>Cash on Service Option</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Stats Bar */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="glass-maroon p-5 rounded-2xl border border-gold-500/30 text-center hover:border-gold-400/60 transition-all duration-300">
            <Users className="w-6 h-6 text-gold-400 mx-auto mb-1.5" />
            <div className="text-2xl font-black text-gold-300 font-royal">500+</div>
            <div className="text-xs text-cream-200/90 mt-1">{t.heroStat1}</div>
          </div>

          <div className="glass-maroon p-5 rounded-2xl border border-gold-500/30 text-center hover:border-gold-400/60 transition-all duration-300">
            <Award className="w-6 h-6 text-gold-400 mx-auto mb-1.5" />
            <div className="text-2xl font-black text-gold-300 font-royal">100%</div>
            <div className="text-xs text-cream-200/90 mt-1">{t.heroStat2}</div>
          </div>

          <div className="glass-maroon p-5 rounded-2xl border border-gold-500/30 text-center hover:border-gold-400/60 transition-all duration-300">
            <ShieldAlert className="w-6 h-6 text-gold-400 mx-auto mb-1.5" />
            <div className="text-2xl font-black text-gold-300 font-royal">2x Backup</div>
            <div className="text-xs text-cream-200/90 mt-1">{t.heroStat3}</div>
          </div>

          <div className="glass-maroon p-5 rounded-2xl border border-gold-500/30 text-center hover:border-gold-400/60 transition-all duration-300">
            <MapPin className="w-6 h-6 text-gold-400 mx-auto mb-1.5" />
            <div className="text-2xl font-black text-gold-300 font-royal">Bihar & UP</div>
            <div className="text-xs text-cream-200/90 mt-1">{t.heroStat4}</div>
          </div>
        </div>

      </div>
    </div>
  );
};
