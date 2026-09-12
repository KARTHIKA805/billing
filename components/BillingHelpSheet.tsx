import { FC } from 'react';
import { X, HelpCircle } from 'lucide-react';

interface BillingHelpSheetProps {
  open: boolean;
  onClose: () => void;
}

const sections = [
  {
    title: 'Single customer (most common)',
    steps: [
      'Tap + Add or add a product to start a bill.',
      'Tap products → choose weight or pieces.',
      'Checkout → Cash or UPI → complete payment.',
      'Receipt prints with a unique bill ID.',
    ],
  },
  {
    title: 'Cash with change',
    steps: [
      'At checkout, select Cash.',
      'Enter cash received or tap Exact / ₹500 / ₹1000.',
      'Return the change shown on screen.',
      'Single-customer receipts also show received + change.',
    ],
  },
  {
    title: 'Multiple customers at counter',
    steps: [
      'Tap + Add for each person in the queue.',
      'Select each queue chip and add their items.',
      'Checkout once — each customer gets a separate bill.',
      'Print All sends one slip per customer.',
    ],
  },
  {
    title: 'Print options (before payment)',
    steps: [
      'All receipts — print every customer (default).',
      'Selected only — tick who needs a paper slip.',
      'Skip print — save sale only; reprint later from success screen.',
    ],
  },
  {
    title: 'UPI payment',
    steps: [
      'Select UPI / GPay and show the QR code.',
      'Wait for payment success on the customer phone.',
      'Tap Confirm Payment Received.',
    ],
  },
  {
    title: 'Split Cash + UPI',
    steps: [
      'At checkout, select Split.',
      'Enter cash and UPI portions (they must add up to the total).',
      'Use 50/50 or quick presets for common splits.',
      'Receipt shows both amounts on the payment line.',
    ],
  },
  {
    title: 'Hold bill',
    steps: [
      'Tap Hold on the cart when a customer steps away.',
      'Optionally add a label (name or note).',
      'Serve the next customer with a fresh cart.',
      'Open Held in the top bar → Resume to continue.',
    ],
  },
  {
    title: 'WhatsApp receipt',
    steps: [
      'After payment: tap WhatsApp on the success screen.',
      'Bills History also has a WhatsApp button per bill.',
      'If the customer is registered, their phone is pre-filled.',
      'Otherwise WhatsApp opens so you can pick a contact.',
    ],
  },
  {
    title: 'Loyalty customer',
    steps: [
      'Search customer by name or phone in the cart panel.',
      'Tick Redeem 50 pts if they have enough points.',
      'Discount applies to the active customer bill only.',
    ],
  },
  {
    title: 'Reprint a receipt',
    steps: [
      'After payment: use Reprint on the success screen.',
      'Old bills: Bills History → find bill → Print.',
      'Each receipt uses the same bill ID as history.',
    ],
  },
  {
    title: 'Fix mistakes',
    steps: [
      'Before payment: use − / + or X on cart lines.',
      'Wrong customer: switch queue chip and move items.',
      'After payment: Admin can edit or void in Bills History.',
    ],
  },
];

const BillingHelpSheet: FC<BillingHelpSheetProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-[var(--brand-dark)]/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-3 sm:p-4">
      <div className="billing-help-sheet app-modal-panel app-modal-panel--wide bg-[var(--brand-surface)] rounded-2xl shadow-xl border border-[var(--brand-border)] overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="p-4 sm:p-5 border-b border-[var(--brand-border)] bg-[var(--brand-muted)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <HelpCircle size={22} className="text-[var(--brand-dark)] shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-[var(--brand-dark)]">Billing quick guide</h3>
              <p className="text-xs text-[var(--brand-border)]">Staff cheat sheet for billing & printing</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-[var(--brand-border)] hover:text-[var(--brand-dark)] shrink-0" aria-label="Close guide">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="rounded-xl border border-[var(--brand-accent)]/40 bg-[var(--brand-accent)]/15 p-3 text-sm text-[var(--brand-dark)]">
            <strong>Fast path:</strong> Add items → Checkout → choose payment & print → complete → Start New Bill.
          </div>

          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-[var(--brand-border)] bg-white p-4">
              <h4 className="text-sm font-bold text-[var(--brand-dark)] mb-2">{section.title}</h4>
              <ol className="space-y-1.5 text-sm text-[var(--brand-text-dark)] list-decimal list-inside">
                {section.steps.map((step) => (
                  <li key={step} className="leading-relaxed">{step}</li>
                ))}
              </ol>
            </section>
          ))}

          <section className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-muted)] p-4">
            <h4 className="text-sm font-bold text-[var(--brand-dark)] mb-2">Print decision guide</h4>
            <ul className="text-sm text-[var(--brand-text-dark)] space-y-1">
              <li>One customer → All receipts</li>
              <li>Several customers → All receipts (one slip each)</li>
              <li>Only some need paper → Selected only</li>
              <li>No paper → Skip print, reprint later</li>
              <li>Printer problem → Reprint from success or Bills History</li>
            </ul>
          </section>
        </div>

        <div className="p-4 border-t border-[var(--brand-border)] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[var(--brand-dark)] text-[var(--brand-text-light)] font-semibold text-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingHelpSheet;
