import React, { useState, useEffect } from 'react';
import { customerAccountApi } from '../../services/customerAccountApi';
import { useApp } from '../../context/AppContext';
import { 
  CreditCard, 
  Trash2, 
  Plus, 
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  CheckCircle2,
  X
} from 'lucide-react';

export const AccountPaymentMethods: React.FC = () => {
  const { showNotification } = useApp();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // New card dummy/hosted form fields for Stripe demo
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [savingCard, setSavingCard] = useState(false);

  const loadTokens = async () => {
    try {
      const data = await customerAccountApi.getPaymentMethods();
      setTokens(data.tokens || data || []);
    } catch {
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleDelete = async (tokenId: number | string) => {
    if (!window.confirm('Are you sure you want to remove this saved payment method?')) return;
    try {
      await customerAccountApi.deletePaymentMethod(tokenId);
      showNotification('Payment method removed successfully', 'info');
      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
    } catch (err: any) {
      showNotification(err.message || 'Failed to remove payment method', 'error');
    }
  };

  const handleAddCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s+/g, '').length < 15) {
      showNotification('Please enter a valid card number', 'error');
      return;
    }
    setSavingCard(true);
    // Simulating token generation via Stripe hosted elements / WooCommerce gateway
    setTimeout(() => {
      const last4 = cardNumber.replace(/\s+/g, '').slice(-4);
      const newCardToken = {
        id: Date.now(),
        card_type: cardNumber.startsWith('4') ? 'Visa' : 'Mastercard',
        last4: last4,
        expiry_month: cardExpiry.split('/')[0] || '12',
        expiry_year: cardExpiry.split('/')[1] || '2028',
        is_default: tokens.length === 0,
      };
      setTokens((prev) => [...prev, newCardToken]);
      setSavingCard(false);
      setAddModalOpen(false);
      setCardNumber('');
      setCardExpiry('');
      setCardCvc('');
      setCardHolder('');
      showNotification('Card saved securely for future purchases', 'success');
    }, 800);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
        <div className="w-8 h-8 border-2 border-[#DF0C88] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Retrieving saved payment methods...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-heading">
            Saved Payment Methods
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your saved cards for fast and seamless checkout.
          </p>
        </div>

        <button
          onClick={() => setAddModalOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-[#DF0C88] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Payment Method</span>
        </button>
      </div>

      {tokens.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No saved payment methods</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You don't have any saved cards on file. You can choose to save a card securely at checkout.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="p-5 border border-slate-200 rounded-2xl flex items-center justify-between hover:border-[#DF0C88]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase tracking-wider shrink-0">
                  {token.card_type || 'Card'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    •••• •••• •••• {token.last4}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Expires {token.expiry_month}/{token.expiry_year}
                    {token.is_default && (
                      <span className="ml-2 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                        Default
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(token.id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="Delete Card"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Security notice */}
      <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong>Bank-Grade Tokenization:</strong> Your credit and debit card information is never stored on our servers. All sensitive card data is directly handled by PCI-DSS Level 1 certified gateways (e.g. Stripe, WooCommerce Payments) using secure tokenization.
        </p>
      </div>

      {/* Add Card Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setAddModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Add New Card
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCardSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name on Card *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. J SMITH"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Card Number *</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                      setCardNumber(val);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry (MM/YY) *</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length >= 2) {
                        val = val.slice(0, 2) + '/' + val.slice(2, 4);
                      }
                      setCardExpiry(val);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CVC / CVV *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="password"
                      required
                      maxLength={4}
                      placeholder="123"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCard}
                  className="px-5 py-2 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingCard ? 'Authorizing...' : 'Save Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
