import React from 'react';
import type { Category, Language } from '../types';
import { translations } from '../translations';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

interface CategoryGridProps {
  categories: Category[];
  lang: Language;
  onSelectCategory: (catId: string) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({ categories, lang, onSelectCategory }) => {
  const t = translations[lang];

  return (
    <section id="services-section" className="py-16 bg-cream-100 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-maroon-100 text-maroon-900 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-gold-600" />
            <span>{t.categoriesHeader}</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold font-royal text-maroon-950">
            {lang === 'hi' ? 'शादी की सभी आवश्यक सेवाएं' : 'Complete Rural Wedding Services'}
          </h2>
          
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            {t.categoriesSub}
          </p>
        </div>

        {/* Categories Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => {
            const isHindi = lang === 'hi';
            const name = isHindi ? cat.nameHindi : cat.name;
            const desc = isHindi ? cat.descriptionHindi : cat.description;

            return (
              <div
                key={cat.id}
                className="group bg-white rounded-2xl overflow-hidden border border-gold-500/30 shadow-md hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between transform hover:-translate-y-1"
              >
                <div>
                  {/* Category Image Header */}
                  <div className="relative h-48 overflow-hidden bg-slate-900">
                    <img
                      src={cat.image}
                      alt={name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-maroon-950/80 via-transparent to-transparent" />
                    
                    {/* Price Tag Badge */}
                    <div className="absolute bottom-3 left-3 bg-maroon-900/90 backdrop-blur-md border border-gold-400/40 text-gold-300 px-3 py-1 rounded-lg text-xs font-bold shadow-md">
                      {t.startingFrom} ₹{cat.startingPrice.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    <h3 className="text-lg font-bold font-royal text-maroon-900 group-hover:text-gold-600 transition-colors">
                      {name}
                    </h3>
                    
                    <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {desc}
                    </p>

                    {/* Features / Included Items List */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-maroon-900 uppercase tracking-wider mb-2 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gold-600" />
                        <span>{isHindi ? 'योजना में शामिल चीजें एवं सुविधाएं:' : 'Things Included in Service Plan:'}</span>
                      </div>
                      <div className="space-y-1.5">
                        {cat.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0 mt-1.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-0">
                  <button
                    onClick={() => onSelectCategory(cat.id)}
                    className="w-full py-2.5 rounded-xl bg-maroon-900 hover:bg-maroon-800 text-gold-300 text-xs font-bold transition-all flex items-center justify-center space-x-2 group-hover:bg-gold-500 group-hover:text-maroon-950"
                  >
                    <span>{lang === 'hi' ? 'बुकिंग में जोड़ें' : 'Add to Booking'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
