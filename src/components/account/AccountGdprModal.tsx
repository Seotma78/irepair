import React, { useState } from 'react';
import { CustomerProfile } from '../../services/customerAuthApi';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  Download, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Mail 
} from 'lucide-react';

interface AccountGdprModalProps {
  customer: CustomerProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const AccountGdprModal: React.FC<AccountGdprModalProps> = ({
  customer,
  isOpen,
  onClose,
}) => {
  const { showNotification } = useApp();
  const [requestType, setRequestType] = useState<'export' | 'delete'>('export');
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestType === 'delete' && confirmText.toLowerCase() !== 'delete') {
      showNotification('Please type "DELETE" to confirm your erasure request', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/account/gdpr-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: requestType,
          reason,
          customerEmail: customer.email,
          customerId: customer.id,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit privacy request');
      }

      setSubmitted(true);
      showNotification('Privacy request logged and dispatched to the Data Protection Officer', 'success');
    } catch (err: any) {
      showNotification(err.message || 'Error submitting request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden z-10 border border-slate-100">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#DF0C88]" />
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Privacy Rights & GDPR Portal
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-900">Request Received</h4>
              <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto">
                Your request has been officially recorded in accordance with the UK General Data Protection Regulation (UK GDPR). Our compliance team will review and fulfill your request within 30 calendar days to <strong>{customer.email}</strong>.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                Close Portal
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-500">
                You have the legal right under UK GDPR to request a copy of all personal data held about you by iRepair Mobiles, or request the permanent deletion / anonymization of your customer account.
              </p>

              {/* Action Selector */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestType('export')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    requestType === 'export'
                      ? 'border-[#DF0C88] bg-pink-50/50 text-[#DF0C88]'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Download className="w-4 h-4 mb-1.5 text-[#DF0C88]" />
                  <div className="text-xs font-bold">Export My Personal Data</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Receive a full JSON/CSV record</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestType('delete')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    requestType === 'delete'
                      ? 'border-rose-500 bg-rose-50/50 text-rose-700'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Trash2 className="w-4 h-4 mb-1.5 text-rose-600" />
                  <div className="text-xs font-bold">Delete / Anonymize Account</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Permanent account erasure</div>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Request (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us if you have any specific requirements..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                />
              </div>

              {requestType === 'delete' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="flex items-start gap-2 text-rose-800 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <strong>Permanent Action:</strong> Deleting your account will anonymize past order records required for UK statutory tax/VAT compliance, cancel any active device warranties, and permanently disable login.
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-[11px] font-bold text-rose-900 mb-1">
                      Type "DELETE" below to confirm:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="DELETE"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-mono uppercase text-rose-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 ${
                    requestType === 'delete'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-[#DF0C88] hover:bg-[#C50875]'
                  }`}
                >
                  {submitting ? 'Submitting...' : 'Submit GDPR Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
