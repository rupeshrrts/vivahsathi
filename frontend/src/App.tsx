import { useState, useEffect } from 'react';
import type { Category, Package, Language } from './types';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { CategoryGrid } from './components/CategoryGrid';
import { PackagesSection } from './components/PackagesSection';
import { AboutSlaSection } from './components/AboutSlaSection';
import { Footer } from './components/Footer';
import { BookingWizardModal } from './components/BookingWizardModal';
import { TrackBookingModal } from './components/TrackBookingModal';
import { AdminDashboard } from './components/AdminDashboard';
import { Globe } from 'lucide-react';

export function App() {
  // Optional language selection persisted in localStorage (default Hindi 'hi', easily switched to English 'en')
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('vivah_sathi_lang');
    return (saved === 'en' || saved === 'hi') ? saved : 'hi';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('vivah_sathi_lang', newLang);
  };

  const [activeSection, setActiveSection] = useState<string>('home');

  // API Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  // Modals state
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [preSelectedPackageId, setPreSelectedPackageId] = useState<string | undefined>(undefined);
  const [preSelectedCategoryId, setPreSelectedCategoryId] = useState<string | undefined>(undefined);

  const [isTrackOpen, setIsTrackOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [catRes, pkgRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/packages')
      ]);
      const catData = await catRes.json();
      const pkgData = await pkgRes.json();
      setCategories(catData);
      setPackages(pkgData);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    }
  };

  const handleOpenBooking = (packageId?: string, categoryId?: string) => {
    setPreSelectedPackageId(packageId);
    setPreSelectedCategoryId(categoryId);
    setIsBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col selection:bg-gold-500 selection:text-maroon-900 relative">
      
      {/* Navigation */}
      <Navbar
        lang={lang}
        setLang={setLang}
        onOpenBooking={() => handleOpenBooking()}
        onOpenTrack={() => setIsTrackOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        activeSection={activeSection}
        setActiveSection={(sec) => {
          setActiveSection(sec);
          const elem = document.getElementById(`${sec}-section`);
          if (elem) elem.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Main Content */}
      <main className="flex-grow">
        {/* Hero Section */}
        <Hero
          lang={lang}
          onOpenBooking={() => handleOpenBooking()}
          onOpenTrack={() => setIsTrackOpen(true)}
        />

        {/* Services Category Grid */}
        <CategoryGrid
          categories={categories}
          lang={lang}
          onSelectCategory={(catId) => handleOpenBooking(undefined, catId)}
        />

        {/* Bundled Packages Section */}
        <PackagesSection
          packages={packages}
          lang={lang}
          onSelectPackage={(pkgId) => handleOpenBooking(pkgId, undefined)}
        />

        {/* Managed Aggregator & SLA Guarantee Section */}
        <AboutSlaSection
          lang={lang}
          onOpenBooking={() => handleOpenBooking()}
        />
      </main>

      {/* Floating Optional Quick Language Switcher Button (Bottom-Right) */}
      <div className="fixed bottom-5 right-5 z-40">
        <div className="glass-maroon p-1.5 rounded-full border-2 border-gold-400 shadow-gold-glow flex items-center space-x-1">
          <Globe className="w-4 h-4 text-gold-400 ml-2" />
          <button
            onClick={() => setLang('hi')}
            className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all ${
              lang === 'hi'
                ? 'bg-gold-500 text-maroon-950 shadow-md scale-105'
                : 'text-gold-200 hover:text-white'
            }`}
          >
            हिंदी
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all ${
              lang === 'en'
                ? 'bg-gold-500 text-maroon-950 shadow-md scale-105'
                : 'text-gold-200 hover:text-white'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Footer */}
      <Footer
        lang={lang}
        onOpenBooking={() => handleOpenBooking()}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenTrack={() => setIsTrackOpen(true)}
      />

      {/* MODALS */}
      <BookingWizardModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        categories={categories}
        packages={packages}
        lang={lang}
        preSelectedPackageId={preSelectedPackageId}
        preSelectedCategoryId={preSelectedCategoryId}
        onBookingCreated={() => fetchInitialData()}
      />

      <TrackBookingModal
        isOpen={isTrackOpen}
        onClose={() => setIsTrackOpen(false)}
        lang={lang}
      />

      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        categories={categories}
        packages={packages}
        lang={lang}
        refreshData={fetchInitialData}
      />

    </div>
  );
}

export default App;
