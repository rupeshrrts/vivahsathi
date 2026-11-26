import React, { useState, useEffect } from 'react';
import type { Category, Package, Language, Booking } from '../types';
import { X, CheckCircle2, ArrowRight, ArrowLeft, Sparkles, MessageSquare, ShieldCheck } from 'lucide-react';

interface BookingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  packages: Package[];
  lang: Language;
  preSelectedPackageId?: string;
  preSelectedCategoryId?: string;
  onBookingCreated?: (booking: Booking) => void;
}

export const BookingWizardModal: React.FC<BookingWizardModalProps> = ({
  isOpen,
  onClose,
  categories,
  packages,
  lang,
  preSelectedPackageId,
  preSelectedCategoryId,
  onBookingCreated
}) => {
  // Wizard state
  const [step, setStep] = useState<number>(1);
  const [selectedType, setSelectedType] = useState<'package' | 'categories'>('package');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  
  // Location & Details
  const [state, setState] = useState<'Bihar' | 'Uttar Pradesh'>('Bihar');
  const [district, setDistrict] = useState<string>('Patna');
  const [tehsilVillage, setTehsilVillage] = useState<string>('');
  const [weddingDate, setWeddingDate] = useState<string>('');
  const [guestCount, setGuestCount] = useState<number>(300);
  const [budget, setBudget] = useState<string>('150000');
  const [notes, setNotes] = useState<string>('');
  
  // Contact
  const [customerName, setCustomerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');

  // Status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  const biharDistricts = ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Samastipur', 'Saran (Chhapra)', 'Madhubani', 'Bhojpur (Ara)', 'Vaishali'];
  const upDistricts = ['Varanasi', 'Gorakhpur', 'Lucknow', 'Prayagraj', 'Deoria', 'Azamgarh', 'Ghazipur', 'Ballia', 'Ayodhya', 'Jaunpur'];

  useEffect(() => {
    if (preSelectedPackageId) {
      setSelectedType('package');
      setSelectedPackageId(preSelectedPackageId);
    } else if (preSelectedCategoryId) {
      setSelectedType('categories');
      setSelectedCategoryIds([preSelectedCategoryId]);
    } else if (packages.length > 0) {
      setSelectedPackageId(packages[0].id);
    }
  }, [preSelectedPackageId, preSelectedCategoryId, packages]);

  if (!isOpen) return null;

  const toggleCategory = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  // Calculate estimated price
  let calculatedTotal = 0;
  if (selectedType === 'package') {
    const pkg = packages.find(p => p.id === selectedPackageId);
    if (pkg) calculatedTotal = pkg.discountPrice;
  } else {
    selectedCategoryIds.forEach(id => {
      const cat = categories.find(c => c.id === id);
      if (cat) calculatedTotal += cat.startingPrice;
    });
  }

  const handleSubmit = async () => {
    if (!customerName || !phone || !tehsilVillage || !weddingDate) {
      alert(lang === 'hi' ? 'कृपया सभी आवश्यक फ़ील्ड भरें (नाम, फोन, गांव/ब्लॉक, तारीख)' : 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          phone,
          whatsapp: whatsapp || phone,
          district: `${district} (${state})`,
          tehsilVillage,
          weddingDate,
          selectedCategoryIds,
          selectedPackageId: selectedType === 'package' ? selectedPackageId : null,
          guestCount,
          budget,
          totalPrice: calculatedTotal,
          notes
        })
      });

      if (!response.ok) throw new Error('Booking failed');

      const data: Booking = await response.json();
      setCompletedBooking(data);
      if (onBookingCreated) onBookingCreated(data);
    } catch (err) {
      console.error(err);
      alert('Error saving booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDistricts = state === 'Bihar' ? biharDistricts : upDistricts;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-maroon-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden border-2 border-gold-500/40 shadow-maroon-glow relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-maroon-950 via-maroon-900 to-maroon-950 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gold-300 hover:text-white p-1 rounded-full bg-maroon-800/80 border border-gold-500/30"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center space-x-2 text-gold-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>VivahSathi Booking Wizard</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold font-royal text-cream-100">
            {completedBooking
              ? (lang === 'hi' ? 'बुकिंग सफलतापूर्वक संपन्न!' : 'Booking Submitted Successfully!')
              : (lang === 'hi' ? 'शादी की बुकिंग / अनुमानित कोट' : 'Book Wedding Services')}
          </h3>

          {!completedBooking && (
            <div className="mt-4 flex items-center justify-between text-xs text-gold-300/80">
              <span className={`font-semibold ${step >= 1 ? 'text-gold-400' : ''}`}>1. Services</span>
              <span>→</span>
              <span className={`font-semibold ${step >= 2 ? 'text-gold-400' : ''}`}>2. Location & Date</span>
              <span>→</span>
              <span className={`font-semibold ${step >= 3 ? 'text-gold-400' : ''}`}>3. Guests & Contact</span>
              <span>→</span>
              <span className={`font-semibold ${step >= 4 ? 'text-gold-400' : ''}`}>4. Confirm</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-800">

          {/* SUCCESS SCREEN */}
          {completedBooking ? (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="bg-maroon-100 text-maroon-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Booking ID: {completedBooking.id}
                </span>
                <h4 className="mt-3 text-2xl font-bold font-royal text-maroon-950">
                  {lang === 'hi' ? 'आपकी शादी की बुकिंग दर्ज हो गई है!' : 'Your Wedding Booking is Received!'}
                </h4>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  {lang === 'hi'
                    ? 'हमारी ऑपरेशन्स टीम 2 घंटे के भीतर आपके प्राथमिक एवं बैकअप वेंडर का आवंटन पूरा करेगी।'
                    : 'Our team will review your location details and dispatch primary & backup vendor confirmation shortly.'}
                </p>
              </div>

              {/* Receipt Summary Box */}
              <div className="bg-cream-100 p-5 rounded-2xl border border-gold-500/30 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{completedBooking.customerName} ({completedBooking.phone})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-bold text-slate-900">{completedBooking.tehsilVillage}, {completedBooking.district}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Wedding Date:</span>
                  <span className="font-bold text-maroon-900">{completedBooking.weddingDate}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm text-maroon-950">
                  <span>Estimated Total:</span>
                  <span className="text-gold-600 font-royal">₹{completedBooking.totalPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <a
                  href={`https://wa.me/919876543210?text=Namaste%20VivahSathi%2C%20my%20Booking%20ID%20is%20${completedBooking.id}.%20Please%20confirm%20my%20vendor%20assignment.`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'व्हाट्सएप पर रसीद भेजें' : 'Share Booking on WhatsApp'}</span>
                </a>

                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl bg-maroon-900 text-gold-300 font-bold text-xs hover:bg-maroon-800 transition-all"
                >
                  {lang === 'hi' ? 'समाप्त करें' : 'Done & Close'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: SERVICE TYPE */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                    <button
                      onClick={() => setSelectedType('package')}
                      className={`flex-1 py-2.5 rounded-lg transition-all ${
                        selectedType === 'package' ? 'bg-maroon-900 text-gold-300 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      {lang === 'hi' ? 'संपूर्ण पैकेज (बचत विकल्प)' : 'Bundled Package (Best Value)'}
                    </button>
                    <button
                      onClick={() => setSelectedType('categories')}
                      className={`flex-1 py-2.5 rounded-lg transition-all ${
                        selectedType === 'categories' ? 'bg-maroon-900 text-gold-300 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      {lang === 'hi' ? 'अलग-अलग सेवाएं चुनें' : 'Custom Service Selection'}
                    </button>
                  </div>

                  {selectedType === 'package' ? (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        {lang === 'hi' ? 'पैकेज चुनें:' : 'Select Package:'}
                      </label>
                      {packages.map(pkg => (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPackageId(pkg.id)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedPackageId === pkg.id
                              ? 'border-gold-500 bg-cream-100 shadow-md'
                              : 'border-slate-200 hover:border-gold-400 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold font-royal text-maroon-950 text-sm">
                                {lang === 'hi' ? pkg.nameHindi : pkg.name}
                              </div>
                              <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                                {lang === 'hi' ? pkg.descriptionHindi : pkg.description}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <div className="text-lg font-black font-royal text-gold-600">
                                ₹{pkg.discountPrice.toLocaleString('en-IN')}
                              </div>
                              {pkg.price > pkg.discountPrice && (
                                <div className="text-[10px] text-slate-400 line-through">
                                  ₹{pkg.price.toLocaleString('en-IN')}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Items Included for this Price */}
                          <div className="mt-3 pt-2 border-t border-gold-500/20">
                            <div className="text-[11px] font-bold text-maroon-900 uppercase tracking-wider mb-1">
                              {lang === 'hi' ? 'इस कीमत में शामिल चीजें:' : 'Things Included For This Price:'}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-700">
                              {pkg.includedCategoryNames.map((item, idx) => (
                                <div key={idx} className="flex items-center space-x-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0" />
                                  <span className="truncate">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        {lang === 'hi' ? 'आवश्यक सेवाएं चुनें (कीमत और शामिल चीजें देखें):' : 'Select Required Services (Price & Inclusions):'}
                      </label>
                      <div className="grid grid-cols-1 gap-3">
                        {categories.map(cat => {
                          const checked = selectedCategoryIds.includes(cat.id);
                          return (
                            <div
                              key={cat.id}
                              onClick={() => toggleCategory(cat.id)}
                              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                                checked
                                  ? 'border-maroon-800 bg-maroon-50/80 shadow-sm'
                                  : 'border-slate-200 hover:border-maroon-300 bg-white'
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {}}
                                  className="w-4 h-4 accent-maroon-800 rounded mt-1 shrink-0"
                                />
                                <div className="flex-1">
                                  <div className="flex justify-between items-baseline">
                                    <h4 className="text-sm font-bold text-maroon-950 font-royal">
                                      {lang === 'hi' ? cat.nameHindi : cat.name}
                                    </h4>
                                    <span className="text-xs font-extrabold text-gold-600 bg-gold-50 px-2 py-0.5 rounded border border-gold-300 shrink-0 ml-2">
                                      ₹{cat.startingPrice.toLocaleString('en-IN')}
                                    </span>
                                  </div>

                                  {/* List of Things Included For This Money */}
                                  <div className="mt-2 text-xs text-slate-600">
                                    <div className="text-[11px] font-bold text-slate-700 mb-1">
                                      {lang === 'hi' ? `₹${cat.startingPrice.toLocaleString('en-IN')} में क्या-क्या मिलेगा:` : `Things Included for ₹${cat.startingPrice.toLocaleString('en-IN')}:`}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                                      {cat.features.map((feat, idx) => (
                                        <div key={idx} className="flex items-center space-x-1.5 text-slate-700">
                                          <span className="text-gold-600 font-bold">•</span>
                                          <span>{feat}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: LOCATION & DATE */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">State (राज्य)</label>
                      <select
                        value={state}
                        onChange={(e) => {
                          const st = e.target.value as 'Bihar' | 'Uttar Pradesh';
                          setState(st);
                          setDistrict(st === 'Bihar' ? 'Patna' : 'Varanasi');
                        }}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-maroon-800"
                      >
                        <option value="Bihar">Bihar (बिहार)</option>
                        <option value="Uttar Pradesh">Uttar Pradesh (उत्तर प्रदेश)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">District (जिला)</label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-maroon-800"
                      >
                        {currentDistricts.map((d, i) => (
                          <option key={i} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {lang === 'hi' ? 'ब्लॉक / तहसील / गाँव का नाम *' : 'Tehsil / Block & Village Name *'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bihta Block, Village Dayalpur"
                      value={tehsilVillage}
                      onChange={(e) => setTehsilVillage(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-maroon-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {lang === 'hi' ? 'विवाह तिथि (Wedding Date) *' : 'Wedding Date *'}
                    </label>
                    <input
                      type="date"
                      value={weddingDate}
                      onChange={(e) => setWeddingDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-maroon-800"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: GUESTS & CONTACT */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {lang === 'hi' ? 'अनुमानित मेहमान' : 'Guest Count'}
                      </label>
                      <input
                        type="number"
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-maroon-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {lang === 'hi' ? 'अनुमानित बजट (₹)' : 'Target Budget (₹)'}
                      </label>
                      <input
                        type="text"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-maroon-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {lang === 'hi' ? 'आपका पूरा नाम (Customer Name) *' : 'Your Full Name *'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Chandra Sharma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-maroon-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        {lang === 'hi' ? 'मोबाइल नंबर *' : 'Mobile Number *'}
                      </label>
                      <input
                        type="tel"
                        placeholder="10 digit number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-maroon-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        WhatsApp Number
                      </label>
                      <input
                        type="tel"
                        placeholder="Same as mobile"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-maroon-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {lang === 'hi' ? 'विशेष आवश्यकताएं (Special Notes)' : 'Special Demands / Notes'}
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Specific food menu request or preferred mandap color"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-maroon-800"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & CONFIRM */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="bg-cream-100 p-4 rounded-2xl border border-gold-500/30 text-xs space-y-2">
                    <h5 className="font-bold font-royal text-maroon-900 text-sm border-b border-gold-500/20 pb-1">
                      {lang === 'hi' ? 'बुकिंग समीक्षा' : 'Booking Summary Review'}
                    </h5>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Name:</span>
                      <span className="font-bold">{customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact:</span>
                      <span className="font-bold">{phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Location:</span>
                      <span className="font-bold">{tehsilVillage}, {district} ({state})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Wedding Date:</span>
                      <span className="font-bold text-maroon-900">{weddingDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Guests & Budget:</span>
                      <span className="font-bold">{guestCount} Guests (Est. ₹{budget})</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold">
                      <span>{lang === 'hi' ? 'अनुमानित कुल लागत:' : 'Estimated Total Price:'}</span>
                      <span className="text-gold-600 font-royal">₹{calculatedTotal.toLocaleString('en-IN')}</span>
                    </div>

                    {/* Explicit Plan Inclusions List */}
                    <div className="pt-3 border-t border-slate-200">
                      <div className="text-[11px] font-bold text-maroon-900 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gold-600" />
                        <span>{lang === 'hi' ? 'आपकी योजना में शामिल चीजें:' : 'Things Included in Your Selected Plan:'}</span>
                      </div>
                      <div className="space-y-1 pl-1">
                        {selectedType === 'package' ? (
                          packages
                            .find(p => p.id === selectedPackageId)
                            ?.includedCategoryNames.map((item, i) => (
                              <div key={i} className="text-xs text-slate-700 flex items-start space-x-1.5">
                                <span className="text-gold-600 font-bold">•</span>
                                <span>{item}</span>
                              </div>
                            ))
                        ) : (
                          selectedCategoryIds.map(id => {
                            const cat = categories.find(c => c.id === id);
                            if (!cat) return null;
                            return (
                              <div key={id} className="text-xs text-slate-700 flex justify-between items-center py-0.5 border-b border-dashed border-slate-200">
                                <span>• {lang === 'hi' ? cat.nameHindi : cat.name}</span>
                                <span className="font-semibold text-slate-900">₹{cat.startingPrice.toLocaleString('en-IN')}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {lang === 'hi'
                        ? '100% कंपनी जिम्मेदारी: हम प्राइमरी + बैकअप वेंडर स्वयं अलॉट करेंगे।'
                        : '100% Managed Guarantee: Primary + Standby Backup Vendors will be assigned.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Navigation Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                {step > 1 ? (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center space-x-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : <div />}

                {step < 4 ? (
                  <button
                    onClick={() => {
                      if (step === 1 && selectedType === 'categories' && selectedCategoryIds.length === 0) {
                        alert(lang === 'hi' ? 'कृपया कम से कम 1 सेवा चुनें' : 'Please select at least 1 service');
                        return;
                      }
                      setStep(step + 1);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-maroon-900 hover:bg-maroon-800 text-gold-300 font-bold text-xs flex items-center space-x-2 shadow-md"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-7 py-3 rounded-xl btn-gold-shimmer bg-gradient-to-r from-gold-500 via-gold-400 to-gold-600 text-maroon-950 font-extrabold text-xs shadow-gold-glow flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{lang === 'hi' ? 'बुकिंग जमा करें' : 'Confirm & Create Booking'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
