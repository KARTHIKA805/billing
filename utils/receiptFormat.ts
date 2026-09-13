import { SaleRecord } from '../types';

export const formatReceiptId = (saleId: string) => `#${saleId.slice(0, 8).toUpperCase()}`;

export const formatPaymentLabel = (sale: Pick<SaleRecord, 'paymentMethod' | 'cashPaid' | 'upiPaid'>) => {
  if (sale.paymentMethod === 'SPLIT' && sale.cashPaid !== undefined && sale.upiPaid !== undefined) {
    return `Split — Cash ₹${sale.cashPaid.toFixed(2)} + UPI ₹${sale.upiPaid.toFixed(2)}`;
  }
  if (sale.paymentMethod === 'UPI') return 'UPI / GPay';
  if (sale.paymentMethod === 'OTHER') return 'Other';
  return 'Cash';
};
