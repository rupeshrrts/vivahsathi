import React, { useState, useEffect } from 'react';
import type { Booking, Vendor, Category, Package, Language } from '../types';
import { translations } from '../translations';
import { LogOut, LayoutDashboard, Calendar, Users, FolderKanban, Plus, Printer, X, Sparkles } from 'lucide-react';
import { VivahSathiLogo } from './VivahSathiLogo';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  packages: Package[];
  lang: Language;
  refreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  categories,
  lang,
}) => {
  const t = translations[lang];

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin123');
  const [authError, setAuthError] = useState<string>('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'bookings' | 'vendors' | 'categories'>('bookings');

  // Data state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Vendor Assignment Modal State
  const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
  const [selectedPrimaryVendorId, setSelectedPrimaryVendorId] = useState<string>('');
  const [selectedBackupVendorId, setSelectedBackupVendorId] = useState<string>('');
  const [assignCategory, setAssignCategory] = useState<string>('tent-mandap');

  // Vendor CRUD Modal State
  const [showAddVendorModal, setShowAddVendorModal] = useState<boolean>(false);
  const [newVendorName, setNewVendorName] = useState<string>('');
  const [newVendorCategory, setNewVendorCategory] = useState<string>('tent-mandap');
  const [newVendorDistrict, setNewVendorDistrict] = useState<string>('Patna');
  const [newVendorVillage, setNewVendorVillage] = useState<string>('');
  const [newVendorPhone, setNewVendorPhone] = useState<string>('');
  const [newVendorReliability, setNewVendorReliability] = useState<string>('Verified reliable. 10+ years experience.');

  // Field Ops Printable Checklist Modal State
  const [opsChecklist, setOpsChecklist] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchAdminData();
    }
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        throw new Error('Invalid credentials');
      }
      setIsAuthenticated(true);
      fetchAdminData();
    } catch (err: any) {
      setAuthError('Invalid admin username or password');
    }
  };

  const fetchAdminData = async () => {
    try {
      const [resB, resV] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/vendors')
      ]);
      const dataB = await resB.json();
      const dataV = await resV.json();
      setBookings(dataB);
      setVendors(dataV);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  // Update Booking Status
  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    try {
      await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchAdminData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  // Save Vendor Assignment
  const handleSaveVendorAssignment = async () => {
    if (!assigningBooking) return;

    const primaryV = vendors.find(v => v.id === selectedPrimaryVendorId);
    const backupV = vendors.find(v => v.id === selectedBackupVendorId);

    const updatedAssigned = [...(assigningBooking.assignedVendors || [])];
    const updatedBackup = [...(assigningBooking.backupVendors || [])];

    if (primaryV) {
      const existingIdx = updatedAssigned.findIndex(a => a.category === assignCategory);
      const item = {
        category: assignCategory,
        categoryName: categories.find(c => c.id === assignCategory)?.name || assignCategory,
        vendorId: primaryV.id,
        vendorName: primaryV.name,
        phone: primaryV.phone
      };
      if (existingIdx >= 0) updatedAssigned[existingIdx] = item;
      else updatedAssigned.push(item);
    }

    if (backupV) {
      const existingIdx = updatedBackup.findIndex(b => b.category === assignCategory);
      const item = {
        category: assignCategory,
        vendorId: backupV.id,
        vendorName: backupV.name,
        phone: backupV.phone
      };
      if (existingIdx >= 0) updatedBackup[existingIdx] = item;
      else updatedBackup.push(item);
    }

    try {
      await fetch(`/api/bookings/${assigningBooking.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedVendors: updatedAssigned,
          backupVendors: updatedBackup,
          status: 'Vendor Assigned'
        })
      });
      setAssigningBooking(null);
      fetchAdminData();
    } catch (err) {
      alert('Failed to save vendor assignment');
    }
  };

  // Add Vendor
  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName || !newVendorPhone) {
      alert('Name and phone are required');
      return;
    }

    try {
      await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVendorName,
          category: newVendorCategory,
          district: newVendorDistrict,
          villageTehsil: newVendorVillage,
          phone: newVendorPhone,
          reliabilityScore: 4.8,
          reliabilityNotes: newVendorReliability,
          active: true
        })
      });
      setShowAddVendorModal(false);
      setNewVendorName('');
      setNewVendorPhone('');
      fetchAdminData();
    } catch (err) {
      alert('Failed to add vendor');
    }
  };

  // Generate Field Ops Checklist
  const handleGenerateChecklist = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/ops/checklist/${bookingId}`);
      const data = await res.json();
      setOpsChecklist(data);
    } catch (err) {
      alert('Failed to generate checklist');
    }
  };

  // Calculate Dashboard Metrics
  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  const activeVendorsCount = vendors.filter(v => v.active).length;
  const newBookingsCount = bookings.filter(b => b.status === 'New').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-maroon-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-6">
      <div className="bg-white rounded-3xl max-w-6xl w-full overflow-hidden border-2 border-gold-500/40 shadow-maroon-glow flex flex-col h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-maroon-950 via-maroon-900 to-maroon-950 p-4 sm:p-6 text-white flex items-center justify-between border-b border-gold-500/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gold-500/20 border border-gold-400 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-royal text-cream-100">
                VivahSathi Admin & Field Ops Portal
              </h3>
              <span className="text-xs text-gold-300">Managed Aggregator Control Center</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isAuthenticated && (
              <button
                onClick={() => setIsAuthenticated(false)}
                className="px-3 py-1.5 rounded-lg bg-maroon-800 text-gold-300 text-xs font-bold hover:bg-maroon-700 flex items-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gold-300 hover:text-white p-1 rounded-full bg-maroon-800/80 border border-gold-500/30"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* LOGIN FORM IF NOT AUTHENTICATED */}
        {!isAuthenticated ? (
          <div className="p-8 max-w-md mx-auto my-auto w-full text-center space-y-6">
            <div className="flex flex-col items-center justify-center">
              <VivahSathiLogo variant="icon" size="lg" className="mb-3" />
              <h4 className="text-2xl font-bold font-royal text-maroon-950">{t.adminLoginTitle}</h4>
              <p className="text-xs text-slate-500 mt-1">{t.adminLoginSub}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-left">
              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {authError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t.username}</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t.password}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-maroon-900 hover:bg-maroon-800 text-gold-300 font-bold text-xs shadow-md transition-all"
              >
                {t.loginBtn}
              </button>
            </form>
          </div>
        ) : (
          /* AUTHENTICATED ADMIN DASHBOARD */
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            
            {/* Top Metrics Cards Bar */}
            <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-maroon-50 rounded-xl border border-maroon-200">
                <div className="text-[10px] font-extrabold text-maroon-800 uppercase">Total Bookings</div>
                <div className="text-xl font-bold font-royal text-maroon-950 mt-1">{totalBookings}</div>
              </div>

              <div className="p-3 bg-gold-50 rounded-xl border border-gold-200">
                <div className="text-[10px] font-extrabold text-gold-800 uppercase">Est. Revenue Value</div>
                <div className="text-xl font-bold font-royal text-gold-900 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-[10px] font-extrabold text-emerald-800 uppercase">Active Vendors</div>
                <div className="text-xl font-bold font-royal text-emerald-950 mt-1">{activeVendorsCount}</div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="text-[10px] font-extrabold text-amber-800 uppercase">New Pending Orders</div>
                <div className="text-xl font-bold font-royal text-amber-950 mt-1">{newBookingsCount}</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 bg-white border-b border-slate-200 flex space-x-6">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
                  activeTab === 'bookings' ? 'border-maroon-900 text-maroon-900' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Bookings Management ({bookings.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('vendors')}
                className={`py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
                  activeTab === 'vendors' ? 'border-maroon-900 text-maroon-900' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Vendor Directory ({vendors.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('categories')}
                className={`py-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all ${
                  activeTab === 'categories' ? 'border-maroon-900 text-maroon-900' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <FolderKanban className="w-4 h-4" />
                <span>Categories & Pricing ({categories.length})</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">

              {/* BOOKINGS TAB */}
              {activeTab === 'bookings' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-royal font-bold text-maroon-950 text-base">All Customer Bookings</h4>
                    <button
                      onClick={fetchAdminData}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300"
                    >
                      Refresh List
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Booking ID</th>
                            <th className="p-3">Customer & Phone</th>
                            <th className="p-3">Location & Date</th>
                            <th className="p-3">Est. Price</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Assigned Vendors</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bookings.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50">
                              <td className="p-3 font-bold font-royal text-maroon-900">{b.id}</td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{b.customerName}</div>
                                <div className="text-[10px] text-slate-500">{b.phone}</div>
                              </td>
                              <td className="p-3">
                                <div>{b.tehsilVillage}, {b.district}</div>
                                <div className="text-[10px] text-maroon-800 font-bold">{b.weddingDate}</div>
                              </td>
                              <td className="p-3 font-bold text-gold-700">
                                ₹{(b.totalPrice || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="p-3">
                                <select
                                  value={b.status}
                                  onChange={(e) => handleUpdateStatus(b.id, e.target.value)}
                                  className="p-1 rounded bg-slate-100 border border-slate-300 text-[11px] font-bold"
                                >
                                  <option value="New">New</option>
                                  <option value="Confirmed">Confirmed</option>
                                  <option value="Vendor Assigned">Vendor Assigned</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </td>
                              <td className="p-3">
                                <div className="space-y-0.5 text-[10px]">
                                  {b.assignedVendors && b.assignedVendors.length > 0 ? (
                                    b.assignedVendors.map((av, i) => (
                                      <div key={i} className="text-emerald-700 font-semibold truncate">
                                        ✓ {av.vendorName}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-rose-500 italic">No vendor assigned</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-right space-x-1">
                                <button
                                  onClick={() => {
                                    setAssigningBooking(b);
                                    setSelectedPrimaryVendorId('');
                                    setSelectedBackupVendorId('');
                                  }}
                                  className="px-2.5 py-1 rounded bg-maroon-900 text-gold-300 text-[11px] font-bold hover:bg-maroon-800"
                                >
                                  Assign Vendor
                                </button>
                                <button
                                  onClick={() => handleGenerateChecklist(b.id)}
                                  className="px-2.5 py-1 rounded bg-gold-500 text-maroon-950 text-[11px] font-bold hover:bg-gold-400"
                                >
                                  Ops Checklist
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VENDORS TAB */}
              {activeTab === 'vendors' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-royal font-bold text-maroon-950 text-base">Verified Vendor Directory</h4>
                    <button
                      onClick={() => setShowAddVendorModal(true)}
                      className="px-4 py-2 rounded-xl bg-maroon-900 text-gold-300 text-xs font-bold hover:bg-maroon-800 flex items-center space-x-1 shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Vendor</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendors.map((v) => (
                      <div key={v.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400">{v.id}</span>
                            <h5 className="font-bold text-maroon-950 text-sm">{v.name}</h5>
                            <span className="px-2 py-0.5 rounded bg-maroon-50 text-maroon-800 font-bold text-[10px] inline-block mt-1">
                              {v.category}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${v.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                            {v.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                          <div>📍 District: <strong>{v.district}</strong> ({v.villageTehsil})</div>
                          <div>📞 Phone: <strong>{v.phone}</strong></div>
                          <div>⭐ Reliability Rating: <strong className="text-gold-600">{v.reliabilityScore} / 5</strong></div>
                          <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                            "{v.reliabilityNotes}"
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CATEGORIES TAB */}
              {activeTab === 'categories' && (
                <div className="space-y-4">
                  <h4 className="font-royal font-bold text-maroon-950 text-base">Category & Package Pricing Directory</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.map((c) => (
                      <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                        <img src={c.image} alt={c.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                        <div>
                          <h5 className="font-bold text-maroon-900 text-sm">{c.name}</h5>
                          <div className="text-xs text-slate-500">{c.nameHindi}</div>
                          <div className="mt-1 text-xs font-bold text-gold-700">Starting Price: ₹{c.startingPrice}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* VENDOR ASSIGNMENT MODAL */}
        {assigningBooking && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="font-bold font-royal text-maroon-900">Assign Vendors for {assigningBooking.id}</h4>
                <button onClick={() => setAssigningBooking(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Service Category</label>
                <select
                  value={assignCategory}
                  onChange={(e) => setAssignCategory(e.target.value)}
                  className="w-full p-2 border rounded-xl text-xs"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Primary Vendor</label>
                <select
                  value={selectedPrimaryVendorId}
                  onChange={(e) => setSelectedPrimaryVendorId(e.target.value)}
                  className="w-full p-2 border rounded-xl text-xs"
                >
                  <option value="">-- Choose Primary Vendor --</option>
                  {vendors.filter(v => v.category === assignCategory).map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Standby Backup Vendor (SLA Guarantee)</label>
                <select
                  value={selectedBackupVendorId}
                  onChange={(e) => setSelectedBackupVendorId(e.target.value)}
                  className="w-full p-2 border rounded-xl text-xs"
                >
                  <option value="">-- Choose Backup Vendor --</option>
                  {vendors.filter(v => v.category === assignCategory).map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.phone})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveVendorAssignment}
                  className="flex-1 py-2.5 rounded-xl bg-maroon-900 text-gold-300 font-bold text-xs"
                >
                  Save Assignment
                </button>
                <button
                  onClick={() => setAssigningBooking(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD VENDOR MODAL */}
        {showAddVendorModal && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <form onSubmit={handleAddVendor} className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="font-bold font-royal text-maroon-900">Onboard New Local Vendor</h4>
                <button type="button" onClick={() => setShowAddVendorModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Vendor / Business Name *</label>
                <input
                  type="text"
                  required
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  className="w-full p-2 border rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newVendorCategory}
                    onChange={(e) => setNewVendorCategory(e.target.value)}
                    className="w-full p-2 border rounded-xl text-xs"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">District</label>
                  <input
                    type="text"
                    value={newVendorDistrict}
                    onChange={(e) => setNewVendorDistrict(e.target.value)}
                    className="w-full p-2 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Village / Tehsil</label>
                <input
                  type="text"
                  value={newVendorVillage}
                  onChange={(e) => setNewVendorVillage(e.target.value)}
                  className="w-full p-2 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={newVendorPhone}
                  onChange={(e) => setNewVendorPhone(e.target.value)}
                  className="w-full p-2 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Vetting & Reliability Notes</label>
                <textarea
                  rows={2}
                  value={newVendorReliability}
                  onChange={(e) => setNewVendorReliability(e.target.value)}
                  className="w-full p-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-maroon-900 text-gold-300 font-bold text-xs"
                >
                  Save & Onboard
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PRINTABLE FIELD OPS CHECKLIST MODAL */}
        {opsChecklist && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="font-bold font-royal text-maroon-900 flex items-center space-x-2">
                  <Printer className="w-4 h-4 text-gold-600" />
                  <span>Day-of Wedding Ops Checklist</span>
                </h4>
                <button onClick={() => setOpsChecklist(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <div className="bg-cream-100 p-4 rounded-xl border border-gold-400 text-xs space-y-1">
                <div>Booking ID: <strong>{opsChecklist.bookingId}</strong></div>
                <div>Customer: <strong>{opsChecklist.customerName}</strong> ({opsChecklist.phone})</div>
                <div>Location: <strong>{opsChecklist.location}</strong></div>
                <div>Wedding Date: <strong>{opsChecklist.weddingDate}</strong></div>
              </div>

              <div className="space-y-2 text-xs">
                <h5 className="font-bold text-slate-700 uppercase">Primary Vendors Call Sheet:</h5>
                {opsChecklist.primaryVendorsChecklist.map((v: any, idx: number) => (
                  <div key={idx} className="p-2 border rounded flex justify-between items-center">
                    <div>
                      <div className="font-bold">{v.vendorName} ({v.category})</div>
                      <div className="text-[10px] text-slate-500">Call: {v.phone}</div>
                    </div>
                    <input type="checkbox" className="w-4 h-4 accent-maroon-800" />
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-3">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-maroon-900 text-gold-300 font-bold text-xs flex items-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Checklist</span>
                </button>
                <button
                  onClick={() => setOpsChecklist(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
