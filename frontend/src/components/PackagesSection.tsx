import React from 'react';
import type { Package, Language } from '../types';
import { translations } from '../translations';
import { CheckCircle2, Star, ArrowRight, Tag, ShieldCheck, Sparkles } from 'lucide-react';

interface PackagesSectionProps {
  packages: Package[];
  lang: Language;
  onSelectPackage: (pkgId: string) => void;
}

export const PackagesSection: React.FC<PackagesSectionProps> = ({ packages, lang, onSelectPackage }) => {
  const t = translations[lang];

  return (
    <section id="packages-section" className="py-16 bg-gradient-to-b from-maroon-950 via-maroon-900 to-maroon-950 text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/40 text-xs font-bold uppercase tracking-wider mb-3">
            <Tag className="w-3.5 h-3.5 text-gold-400" />
            <span>{t.packagesHeader}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold font-royal text-transparent bg-clip-text bg-gradient-to-r from-cream-100 via-gold-200 to-gold-400">
            {lang === 'hi' ? 'बचत पैकेज: संपूर्ण विवाह व्यवस्था' : 'All-Inclusive Bundled Packages'}
          </h2>

          <p className="mt-3 text-sm sm:text-base text-cream-200">
            {t.packagesSub}
          </p>
        </div>

        {/* Packages Cards Grid */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {packages.map((pkg) => {
            const isHindi = lang === 'hi';
            const name = isHindi ? pkg.nameHindi : pkg.name;
            const desc = isHindi ? pkg.descriptionHindi : pkg.description;
            const savings = pkg.price - pkg.discountPrice;

            return (
              <div
                key={pkg.id}
                className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 border-2 ${
                  pkg.popular
                    ? 'glass-maroon border-gold-400 shadow-gold-glow scale-105 z-10'
                    : 'bg-maroon-900/60 border-gold-500/30 hover:border-gold-400'
                }`}
              >
                {/* Popular Badge */}
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 badge-shadi px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase flex items-center space-x-1 shadow-md">
                    <Star className="w-3.5 h-3.5 fill-gold-300 text-gold-300" />
                    <span>{lang === 'hi' ? 'सर्वाधिक लोकप्रिय' : 'MOST POPULAR'}</span>
                  </div>
                )}

                <div>
                  {/* Header Title */}
                  <div className="text-center pb-6 border-b border-gold-500/20">
                    <h3 className="text-xl sm:text-2xl font-bold font-royal text-cream-100">
                      {name}
                    </h3>
                    <p className="mt-2 text-xs text-cream-200 leading-relaxed">
                      {desc}
                    </p>

                    {/* Pricing */}
                    <div className="mt-5 flex items-baseline justify-center space-x-3">
                      <span className="text-3xl sm:text-4xl font-black font-royal text-gold-300">
                        ₹{pkg.discountPrice.toLocaleString('en-IN')}
                      </span>
                      {pkg.price > pkg.discountPrice && (
                        <span className="text-sm text-gold-400/60 line-through">
                          ₹{pkg.price.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    {savings > 0 && (
                      <div className="mt-2 inline-block bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-xs font-bold px-3 py-0.5 rounded-full">
                        {t.saveBadge} ₹{savings.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>

                  {/* Included Categories & Features List */}
                  <div className="py-6 space-y-3">
                    <div className="text-xs font-bold text-gold-300 uppercase tracking-wider flex items-center space-x-1.5 pb-1 border-b border-gold-500/20">
                      <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                      <span>{isHindi ? 'पैकेज प्लान में शामिल चीजें और सेवाएं:' : 'Things Included in This Package Plan:'}</span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {pkg.includedCategoryNames.map((item, idx) => (
                        <div key={idx} className="flex items-start space-x-2.5 text-xs text-cream-100 bg-maroon-950/40 p-2 rounded-lg border border-gold-500/20">
                          <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                          <span className="font-medium">{item}</span>
                        </div>
                      ))}
                    </div>

                    {/* Standard Plan Inclusions */}
                    <div className="pt-2 text-[11px] text-gold-300/90 space-y-1">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{isHindi ? '1 प्राथमिक + 1 बैकअप वेंडर (SLA गारंटी)' : '1 Primary + 1 Standby Backup Vendor SLA'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{isHindi ? 'शादी के दिन ऑन-साइट फील्ड मैनेजर' : 'On-Site Ground Field Operations Supervisor'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="pt-4 border-t border-gold-500/20">
                  <button
                    onClick={() => onSelectPackage(pkg.id)}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
                      pkg.popular
                        ? 'btn-gold-shimmer bg-gradient-to-r from-gold-500 via-gold-400 to-gold-600 text-maroon-950 shadow-gold-glow hover:scale-105'
                        : 'bg-maroon-800 hover:bg-gold-500 hover:text-maroon-950 text-gold-300 border border-gold-500/30'
                    }`}
                  >
                    <span>{t.bookPackage}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="mt-3 flex items-center justify-center space-x-1.5 text-[11px] text-gold-400/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
                    <span>100% Guaranteed Vendor SLA</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
