import React from 'react';
import type { Language } from '../types';
import { translations } from '../translations';
import { ShieldCheck, UserCheck, RefreshCw, CheckCircle2, MapPin, Award } from 'lucide-react';

interface AboutSlaSectionProps {
  lang: Language;
  onOpenBooking: () => void;
}

export const AboutSlaSection: React.FC<AboutSlaSectionProps> = ({ lang, onOpenBooking }) => {
  const t = translations[lang];

  const biharDistricts = ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Samastipur', 'Saran (Chhapra)', 'Madhubani', 'Bhojpur (Ara)', 'Vaishali'];
  const upDistricts = ['Varanasi', 'Gorakhpur', 'Lucknow', 'Prayagraj', 'Deoria', 'Azamgarh', 'Ghazipur', 'Ballia', 'Ayodhya', 'Jaunpur'];

  return (
    <section id="about-section" className="py-16 bg-cream-200 border-t border-gold-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Managed Aggregator Pitch */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-maroon-100 text-maroon-900 text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-4 h-4 text-gold-600" />
              <span>{lang === 'hi' ? 'हमारी 100% जवाबदेही' : 'Our Managed Accountability'}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold font-royal text-maroon-950 leading-tight">
              {lang === 'hi'
                ? 'सिर्फ वेंडर की सूची नहीं — आपकी शादी की पूरी गारंटी हमारी है!'
                : 'Not Just a Vendor Directory — We Take Full Responsibility For Your Wedding'}
            </h2>

            <p className="mt-4 text-sm sm:text-base text-slate-700 leading-relaxed">
              {lang === 'hi'
                ? 'शहरी भारत में अर्बन कंपनी जैसे प्लेटफॉर्म घरेलू सेवाओं की जिम्मेदारी लेते हैं। विवाह साथी वही मॉडल बिहार और यूपी के ग्रामीण विवाह बाजार में लेकर आया है। ग्राहक हमारे प्लेटफॉर्म से बुकिंग करते हैं, और हम बैकग्राउंड में अनुभवी वेंडरों को मैनेज करते हैं।'
                : 'Just as Urban Company takes full accountability for home services in metro cities, VivahSathi brings the exact managed-aggregator structure to rural weddings in Bihar and Uttar Pradesh. You book through us, and we manage every local vendor behind the scenes.'}
            </p>

            {/* SLA Checklist */}
            <div className="mt-6 space-y-3">
              <div className="flex items-start space-x-3 bg-white p-3.5 rounded-xl border border-gold-500/30 shadow-sm">
                <RefreshCw className="w-5 h-5 text-maroon-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-maroon-900">
                    {lang === 'hi' ? '2x बैकअप वेंडर गारंटी (Backup SLA)' : '2x Backup Vendor SLA Guarantee'}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {lang === 'hi'
                      ? 'हर बुकिंग के लिए 1 मुख्य वेंडर + 1 बैकअप वेंडर तय रहता है। यदि कोई आपात स्थिति आती है, तो 30 मिनट में बैकअप वेंडर पहुंचता है।'
                      : 'Every booking gets 1 primary vendor + 1 backup vendor assigned. If primary underperforms, backup is dispatched immediately.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-white p-3.5 rounded-xl border border-gold-500/30 shadow-sm">
                <UserCheck className="w-5 h-5 text-maroon-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-maroon-900">
                    {lang === 'hi' ? 'शादी के दिन ऑन-साइट सुपरवाइजर' : 'On-Site Ground Supervisor'}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {lang === 'hi'
                      ? 'हमारी टीम का अधिकारी मंडप, भोजन और लाइटिंग की समय पर डिलीवरी स्वयं नियंत्रित करता है।'
                      : 'Our dedicated field manager visits the venue to ensure timely tent setup, hygienic food, and smooth baraat arrival.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={onOpenBooking}
                className="px-6 py-3 rounded-xl bg-maroon-900 hover:bg-maroon-800 text-gold-300 font-bold text-sm shadow-md transition-all"
              >
                {t.bookNow}
              </button>
            </div>
          </div>

          {/* Visual Guarantee Card */}
          <div className="bg-gradient-to-br from-maroon-900 to-maroon-950 p-8 rounded-3xl text-white border-2 border-gold-500/40 shadow-maroon-glow relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Award className="w-48 h-48 text-gold-400" />
            </div>

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-400/40 flex items-center justify-center mb-4">
                <ShieldCheck className="w-7 h-7 text-gold-400" />
              </div>

              <h3 className="text-2xl font-bold font-royal text-gold-300">
                {lang === 'hi' ? 'विवाह साथी 100% सुरक्षा वादा' : 'VivahSathi 100% Quality & Reliability Shield'}
              </h3>

              <ul className="mt-6 space-y-4 text-xs sm:text-sm text-cream-100">
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-gold-400 shrink-0" />
                  <span>{lang === 'hi' ? 'भुगतान सीधे कंपनी को, काम पूरा होने पर वेंडर को भुगतान' : 'Payment made to company, released to vendor after successful service'}</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-gold-400 shrink-0" />
                  <span>{lang === 'hi' ? 'शादी की तारीख से 48 घंटे पहले सभी वेंडरों की ऑन-साइट पुष्टि' : 'Full vendor physical re-confirmation 48 hours before wedding date'}</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-gold-400 shrink-0" />
                  <span>{lang === 'hi' ? 'स्थानीय मंडी भाव पर पारदर्शी दरें (कोई छिपा शुल्क नहीं)' : 'Transparent local rates with zero hidden charges'}</span>
                </li>
                <li className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-gold-400 shrink-0" />
                  <span>{lang === 'hi' ? '24x7 इमरजेंसी हेल्पलाइन नंबर' : '24x7 Emergency Ops Hotline dispatch support'}</span>
                </li>
              </ul>

              <div className="mt-8 pt-6 border-t border-gold-500/20 flex items-center justify-between text-xs text-gold-300">
                <span>Verified Vendor Network</span>
                <span className="font-bold">Bihar & UP State Division</span>
              </div>
            </div>
          </div>
        </div>

        {/* Districts Coverage */}
        <div className="mt-16 pt-12 border-t border-gold-500/20">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h3 className="text-2xl font-bold font-royal text-maroon-900">
              {t.districtsTitle}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {t.districtsSub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gold-500/30 shadow-sm">
              <div className="flex items-center space-x-2 text-maroon-900 font-bold text-sm mb-3">
                <MapPin className="w-4 h-4 text-gold-600" />
                <span>BIHAR DISTRICTS (बिहार)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {biharDistricts.map((d, i) => (
                  <span key={i} className="px-3 py-1 bg-maroon-50 text-maroon-900 text-xs font-semibold rounded-full border border-maroon-200">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gold-500/30 shadow-sm">
              <div className="flex items-center space-x-2 text-maroon-900 font-bold text-sm mb-3">
                <MapPin className="w-4 h-4 text-gold-600" />
                <span>UTTAR PRADESH DISTRICTS (उत्तर प्रदेश)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {upDistricts.map((d, i) => (
                  <span key={i} className="px-3 py-1 bg-gold-50 text-gold-900 text-xs font-semibold rounded-full border border-gold-300">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
