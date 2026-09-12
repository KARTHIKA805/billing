import { FC } from 'react';
import { SaleRecord } from '../types';
import { SHOP_NAME } from '../constants';
import { formatPaymentLabel, formatReceiptId } from '../utils/receiptFormat';

interface ReceiptPrintBlockProps {
  sale: SaleRecord;
  customerLabel?: string;
  active?: boolean;
  cashReceived?: number;
  changeDue?: number;
}

const ReceiptPrintBlock: FC<ReceiptPrintBlockProps> = ({
  sale,
  customerLabel,
  active = false,
  cashReceived,
  changeDue,
}) => {
  const label = customerLabel || sale.billLabel || sale.customerName || 'Walk-in Customer';
  const receiptTimestamp = sale.timestamp.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div
      className={`thermal-receipt-print ${active ? 'thermal-receipt-print--active' : ''}`}
      aria-hidden="true"
    >
      <div className="thermal-receipt-print__header">
        <div className="font-bold text-[12px] uppercase tracking-wide">{SHOP_NAME}</div>
        <div className="text-[10px] mt-1">Bill: {formatReceiptId(sale.id)}</div>
        <div className="text-[10px]">{receiptTimestamp}</div>
      </div>
      <div className="thermal-receipt-print__divider" />
      <div className="space-y-1 text-[10px] thermal-receipt-print__group">
        <div className="font-bold">{label}</div>
        {sale.items.map((item) => (
          <div key={item.cartLineId} className="flex justify-between gap-2">
            <span className="flex-1">{item.name} ({item.unit}) x {item.quantity}</span>
            <span>₹{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between text-[10px] pt-1">
          <span>Subtotal</span>
          <span>₹{(sale.subtotal ?? sale.total).toFixed(2)}</span>
        </div>
        {(sale.discountAmount ?? 0) > 0 && (
          <div className="flex justify-between text-[10px]">
            <span>Discount</span>
            <span>-₹{(sale.discountAmount ?? 0).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-[10px] font-semibold pt-1 border-t border-dashed border-slate-200">
          <span>Total</span>
          <span>₹{sale.total.toFixed(2)}</span>
        </div>
      </div>
      <div className="thermal-receipt-print__divider" />
      <div className="text-[10px] text-center">
        <div>Payment: {formatPaymentLabel(sale)}</div>
        {cashReceived !== undefined && (
          <>
            <div>Received: ₹{cashReceived.toFixed(2)}</div>
            <div>Change: ₹{(changeDue ?? 0).toFixed(2)}</div>
          </>
        )}
        <div>Thank you for shopping!</div>
      </div>
    </div>
  );
};

export default ReceiptPrintBlock;
