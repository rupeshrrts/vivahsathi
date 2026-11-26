import React, { useState } from 'react';
import type { Booking, Language } from '../types';
import { translations } from '../translations';
import { X, Search, CheckCircle2, UserCheck, ShieldCheck, Phone, AlertCircle } from 'lucide-react';

interface TrackBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const TrackBookingModal: React.FC<TrackBookingModalProps> = ({ isOpen, onClose, lang }) => {
  const t = translations[lang];
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setBooking(null);

    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(query.trim())}`);
      if (!res.ok) {
        throw new Error(lang === 'hi' ? 'बुकिंग नहीं मिली। कृपया आईडी या फोन नंबर जांचें।' : 'Booking record not found.');
      }
      const data: Booking = await res.json();
      setBooking(data);
    } catch (err: any) {
      setError(err.message || 'Booking search failed.');
    } finally {
      setLoading(false);
    }
  };

  const statusSteps = ['New', 'Confirmed', 'Vendor Assigned', 'Completed'];
  const currentStepIndex = booking ? statusSteps.indexOf(booking.status) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-maroon-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden border-2 border-gold-500/40 shadow-maroon-glow relative">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-maroon-950 via-maroon-900 to-maroon-950 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gold-300 hover:text-white p-1 rounded-full bg-maroon-800/80 border border-gold-500/30"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center space-x-2 text-gold-400 text-xs font-bold uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>VivahSathi Live Order Tracking</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold font-royal text-cream-100">
            {t.trackTitle}
          </h3>
        </div>

        {/* Content Body */}
        <div className="p-6 text-slate-800 space-y-6">

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={t.trackPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-maroon-800 focus:border-maroon-800"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-maroon-900 hover:bg-maroon-800 text-gold-300 font-bold text-xs shrink-0 shadow-md transition-all"
            >
              {loading ? 'Searching...' : t.trackBtn}
            </button>
          </form>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Booking Status Card */}
          {booking && (
            <div className="space-y-6 border-t border-slate-200 pt-5">
              
              {/* Top Details */}
              <div className="bg-cream-100 p-4 rounded-2xl border border-gold-500/30 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-maroon-900 font-royal text-sm">{booking.id}</span>
                  <span className="px-2.5 py-1 rounded-full bg-maroon-900 text-gold-300 font-bold text-[10px] uppercase">
                    Status: {booking.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gold-500/20 text-slate-700">
                  <div>
                    <span className="text-slate-500">Customer:</span> <strong className="text-slate-900">{booking.customerName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Phone:</span> <strong>{booking.phone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Wedding Date:</span> <strong className="text-maroon-900">{booking.weddingDate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Location:</span> <strong>{booking.tehsilVillage}, {booking.district}</strong>
                  </div>
                </div>
              </div>

              {/* Status Progress Pipeline */}
              <div>
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  {lang === 'hi' ? 'ऑर्डर की वर्तमान स्थिति:' : 'Order Progress Status:'}
                </h5>

                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  {statusSteps.map((stepName, idx) => {
                    const isDone = idx <= currentStepIndex;
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 border-2 transition-all ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                            : 'bg-slate-100 border-slate-300 text-slate-400'
                        }`}>
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <span className={`font-semibold ${isDone ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {stepName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Primary Vendors Section */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-maroon-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-gold-600" />
                  <span>{lang === 'hi' ? 'आवंटित प्राथमिक वेंडर (Primary Vendors):' : 'Assigned Primary Vendors:'}</span>
                </h5>

                {booking.assignedVendors && booking.assignedVendors.length > 0 ? (
                  <div className="space-y-2">
                    {booking.assignedVendors.map((v, i) => (
                      <div key={i} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{v.vendorName}</div>
                          <div className="text-[10px] text-slate-500">{v.categoryName || v.category}</div>
                        </div>
                        <a
                          href={`tel:${v.phone}`}
                          className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center space-x-1 hover:bg-emerald-200"
                        >
                          <Phone className="w-3 h-3 text-emerald-700" />
                          <span>{v.phone}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                    {lang === 'hi'
                      ? 'वेंडर आवंटन प्रक्रिया जारी है (2 घंटे में अपडेट)'
                      : 'Primary vendors are currently being assigned by field manager.'}
                  </div>
                )}
              </div>

              {/* Backup Vendor Guarantee */}
              <div className="p-3 bg-gold-50 border border-gold-300 rounded-xl text-[11px] text-gold-900 space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-gold-700" />
                  <span>{lang === 'hi' ? '2x बैकअप वेंडर सुरक्षा एक्टिवेटेड' : '2x Backup Vendor Guarantee Active'}</span>
                </div>
                <p className="text-[10px] text-gold-800">
                  {lang === 'hi'
                    ? 'यदि किसी कारण मुख्य वेंडर में रुकावट आती है, तो विवाह साथी का इमरजेंसी बैकअप वेंडर तुरंत सेवा संभालेगा।'
                    : 'Your booking has dedicated standby backup coverage. VivahSathi guarantees 0 wedding delays.'}
                </p>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
