import { Customer, CartItem } from '../types';

export interface StoredBillGroup {
  id: string;
  name: string;
  customer?: Customer;
  items: CartItem[];
  redeemPoints: boolean;
}

export interface HeldBillSession {
  id: string;
  label: string;
  savedAt: string;
  groups: StoredBillGroup[];
  activeGroupId: string | null;
}

const HELD_BILLS_KEY = 'suvai_held_bills';

export const loadHeldBills = (): HeldBillSession[] => {
  try {
    const raw = localStorage.getItem(HELD_BILLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveHeldBills = (sessions: HeldBillSession[]) => {
  localStorage.setItem(HELD_BILLS_KEY, JSON.stringify(sessions));
};

export const addHeldBill = (session: HeldBillSession) => {
  const existing = loadHeldBills();
  saveHeldBills([session, ...existing]);
};

export const removeHeldBill = (id: string) => {
  saveHeldBills(loadHeldBills().filter((session) => session.id !== id));
};
