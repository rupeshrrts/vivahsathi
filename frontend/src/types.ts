export interface Category {
  id: string;
  name: string;
  nameHindi: string;
  description: string;
  descriptionHindi: string;
  image: string;
  startingPrice: number;
  displayOrder: number;
  features: string[];
}

export interface Package {
  id: string;
  name: string;
  nameHindi: string;
  includedCategoryIds: string[];
  includedCategoryNames: string[];
  price: number;
  discountPrice: number;
  description: string;
  descriptionHindi: string;
  image: string;
  popular?: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  district: string;
  villageTehsil: string;
  phone: string;
  reliabilityScore: number;
  reliabilityNotes: string;
  active: boolean;
  experienceYears: number;
  completedWeddings: number;
}

export interface AssignedVendorItem {
  category: string;
  categoryName?: string;
  vendorId: string;
  vendorName: string;
  phone: string;
}

export interface BackupVendorItem {
  category: string;
  vendorId: string;
  vendorName: string;
  phone: string;
}

export interface Booking {
  id: string;
  customerName: string;
  phone: string;
  whatsapp: string;
  district: string;
  tehsilVillage: string;
  weddingDate: string;
  selectedCategoryIds: string[];
  selectedPackageId?: string | null;
  guestCount: number;
  budget: string;
  status: 'New' | 'Confirmed' | 'Vendor Assigned' | 'Completed' | 'Cancelled';
  assignedVendors: AssignedVendorItem[];
  backupVendors: BackupVendorItem[];
  totalPrice: number;
  notes: string;
  createdAt: string;
}

export interface AdminUser {
  username: string;
  name: string;
  role: string;
}

export type Language = 'hi' | 'en';
