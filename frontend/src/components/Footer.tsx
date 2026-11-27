import React from 'react';
import type { Language } from '../types';
import { translations } from '../translations';
import { MessageSquare, PhoneCall, ShieldCheck, Heart } from 'lucide-react';
import { VivahSathiLogo } from './VivahSathiLogo';

interface FooterProps {
  lang: Language;
  onOpenBooking: () => void;
  onOpenAdmin: () => void;
  onOpenTrack: () => void;
}

export const Footer: React.FC<FooterProps> = ({ lang, onOpenBooking, onOpenAdmin, onOpenTrack }) => {
  const t = translations[lang];

  return (
    <footer className="bg-maroon-950 text-cream-200 border-t-2 border-gold-500/40 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <VivahSathiLogo variant="full" size="md" lang={lang} showTagline={false} />

            <p className="text-xs text-cream-200/80 leading-relaxed">
              {t.trustPitch}
            </p>

            <div className="flex items-center space-x-2 text-gold-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Managed Aggregator Platform</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-royal font-bold text-gold-300 text-sm mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li><button onClick={onOpenBooking} className="hover:text-gold-400 transition-colors">Book Wedding Package</button></li>
              <li><button onClick={onOpenTrack} className="hover:text-gold-400 transition-colors">Track Booking Status</button></li>
              <li><button onClick={onOpenAdmin} className="hover:text-gold-400 transition-colors">Admin & Field Ops Portal</button></li>
            </ul>
          </div>

          {/* Key Services */}
          <div>
            <h4 className="font-royal font-bold text-gold-300 text-sm mb-3">Services</h4>
            <ul className="space-y-2 text-xs text-cream-200/80">
              <li>• Tent & Mandap Shamiyana</li>
              <li>• Master Halwai & Feast Catering</li>
              <li>• Baraat Band & High-Bass DJ</li>
              <li>• Groom Cars & Baraat Buses</li>
              <li>• 4K Drone Photography</li>
              <li>• Pandit Ji Vedic Puja</li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-3">
            <h4 className="font-royal font-bold text-gold-300 text-sm mb-1">Direct Assistance</h4>
            
            <a
              href="https://wa.me/919876543210?text=Namaste%20VivahSathi%2C%20I%20want%20to%20book%20wedding%20services"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Direct Support</span>
            </a>

            <a
              href="tel:+919876543210"
              className="w-full py-2.5 rounded-xl bg-maroon-900 border border-gold-500/30 hover:bg-maroon-800 text-gold-300 font-bold text-xs flex items-center justify-center space-x-2 transition-all"
            >
              <PhoneCall className="w-4 h-4 text-gold-400" />
              <span>Call Helpline: +91 98765 43210</span>
            </a>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-gold-500/20 text-center text-xs text-cream-200/60 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>{t.footNotice}</div>
          <div className="flex items-center space-x-1">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for Rural Bihar & Uttar Pradesh</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
