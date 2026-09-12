import { SaleRecord } from '../types';
import { SHOP_ADDRESS, SHOP_NAME, SHOP_PHONE } from '../constants';

export const formatReceiptId = (saleId: string) => `#${saleId.slice(0, 8).toUpperCase()}`;

export const formatPaymentLabel = (sale: Pick<SaleRecord, 'paymentMethod' | 'cashPaid' | 'upiPaid'>) => {
  if (sale.paymentMethod === 'SPLIT' && sale.cashPaid !== undefined && sale.upiPaid !== undefined) {
    return `Split — Cash ₹${sale.cashPaid.toFixed(2)} + UPI ₹${sale.upiPaid.toFixed(2)}`;
  }
  if (sale.paymentMethod === 'UPI') return 'UPI / GPay';
  if (sale.paymentMethod === 'OTHER') return 'Other';
  return 'Cash';
};

export const buildWhatsAppReceiptText = (
  sale: SaleRecord,
  options?: { customerLabel?: string; cashReceived?: number; changeDue?: number }
) => {
  const label = options?.customerLabel || sale.billLabel || sale.customerName || 'Walk-in Customer';
  const timestamp = sale.timestamp.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const lines = [
    `*${SHOP_NAME}*`,
    SHOP_ADDRESS,
    SHOP_PHONE ? `Phone: ${SHOP_PHONE}` : '',
    '',
    `Bill: ${formatReceiptId(sale.id)}`,
    `Date: ${timestamp}`,
    `Customer: ${label}`,
    '────────────────',
    ...sale.items.map(
      (item) => `${item.name} (${item.unit}) x${item.quantity} — ₹${(item.price * item.quantity).toFixed(2)}`
    ),
    '────────────────',
    `Subtotal: ₹${(sale.subtotal ?? sale.total).toFixed(2)}`,
  ];

  if ((sale.discountAmount ?? 0) > 0) {
    lines.push(`Discount: -₹${(sale.discountAmount ?? 0).toFixed(2)}`);
  }

  lines.push(`*Total: ₹${sale.total.toFixed(2)}*`);
  lines.push(`Payment: ${formatPaymentLabel(sale)}`);

  if (options?.cashReceived !== undefined) {
    lines.push(`Received: ₹${options.cashReceived.toFixed(2)}`);
    lines.push(`Change: ₹${(options.changeDue ?? 0).toFixed(2)}`);
  }

  lines.push('', 'Thank you for shopping at Suvai Bakery!');

  return lines.filter(Boolean).join('\n');
};

export const normalizeWhatsAppPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

export const shareReceiptOnWhatsApp = (
  sale: SaleRecord,
  options?: { phone?: string; customerLabel?: string; cashReceived?: number; changeDue?: number }
) => {
  const text = buildWhatsAppReceiptText(sale, options);
  const phone = options?.phone?.trim();
  const url = phone
    ? `https://wa.me/${normalizeWhatsAppPhone(phone)}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};
