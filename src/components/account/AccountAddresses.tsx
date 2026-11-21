import React, { useState } from 'react';
import { CustomerProfile } from '../../services/customerAuthApi';
import { customerAccountApi } from '../../services/customerAccountApi';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useApp } from '../../context/AppContext';
import { 
  MapPin, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  X,
  Truck,
  Building
} from 'lucide-react';

interface AccountAddressesProps {
  customer: CustomerProfile;
}

export const AccountAddresses: React.FC<AccountAddressesProps> = ({ customer }) => {
  const { refreshCustomer } = useCustomerAuth();
  const { showNotification } = useApp();

  const [editModal, setEditModal] = useState<'billing' | 'shipping' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Address form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('GB');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const billing = customer.billing || {};
  const shipping = customer.shipping || {};

  const openEditModal = (type: 'billing' | 'shipping') => {
    const data = type === 'billing' ? billing : shipping;
    setFirstName(data.first_name || customer.firstName || '');
    setLastName(data.last_name || customer.lastName || '');
    setCompany(data.company || '');
    setAddress1(data.address_1 || '');
    setAddress2(data.address_2 || '');
    setCity(data.city || '');
    setState(data.state || '');
    setPostcode(data.postcode || '');
    setCountry(data.country || 'GB');
    setEmail(data.email || customer.email || '');
    setPhone(data.phone || '');
    setSameAsBilling(false);
    setError(null);
    setEditModal(type);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate UK Postcode format if country is GB
    if (country === 'GB') {
      const cleanPostcode = postcode.replace(/\s+/g, '').toUpperCase();
      const ukPostcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/;
      if (!ukPostcodeRegex.test(cleanPostcode)) {
        setError('Please enter a valid UK postcode (e.g. SW1A 1AA or E1 6AN).');
        return;
      }
    }

    setSubmitting(true);
    try {
      const addressPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        company: company.trim(),
        address_1: address1.trim(),
        address_2: address2.trim(),
        city: city.trim(),
        state: state.trim(),
        postcode: postcode.trim().toUpperCase(),
        country: country,
        ...(editModal === 'billing' ? { email: email.trim(), phone: phone.trim() } : {}),
      };

      const updatePayload: any = {};
      if (editModal === 'billing') {
        updatePayload.billing = addressPayload;
        if (sameAsBilling) {
          updatePayload.shipping = {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            company: company.trim(),
            address_1: address1.trim(),
            address_2: address2.trim(),
            city: city.trim(),
            state: state.trim(),
            postcode: postcode.trim().toUpperCase(),
            country: country,
          };
        }
      } else {
        updatePayload.shipping = addressPayload;
      }

      await customerAccountApi.updateAddresses(updatePayload);
      showNotification(`${editModal === 'billing' ? 'Billing' : 'Shipping'} address updated successfully`, 'success');
      setEditModal(null);
      await refreshCustomer();
    } catch (err: any) {
      setError(err.message || 'Failed to update address in WooCommerce.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 font-heading mb-1">
          Your Saved Addresses
        </h3>
        <p className="text-xs text-slate-500">
          The following addresses are used on the checkout page by default and synced with your WooCommerce customer profile.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Billing Address Card */}
          <div className="border border-slate-200 rounded-2xl p-5 hover:border-[#DF0C88]/50 transition-colors relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-[#DF0C88]" />
                  Billing Address
                </span>
                <button
                  onClick={() => openEditModal('billing')}
                  className="text-xs font-semibold text-[#DF0C88] hover:text-[#C50875] flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{billing.address_1 ? 'Edit' : 'Add'}</span>
                </button>
              </div>

              {billing.address_1 ? (
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-900 text-sm">{billing.first_name} {billing.last_name}</p>
                  {billing.company && <p className="text-slate-500">{billing.company}</p>}
                  <p>{billing.address_1}</p>
                  {billing.address_2 && <p>{billing.address_2}</p>}
                  <p>{billing.city}{billing.postcode ? `, ${billing.postcode}` : ''}</p>
                  <p>{billing.country || 'United Kingdom'}</p>
                  {billing.phone && <p className="text-slate-500 pt-1">Phone: {billing.phone}</p>}
                  {billing.email && <p className="text-slate-500">Email: {billing.email}</p>}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4">You have not set up a default billing address yet.</p>
              )}
            </div>

            <button
              onClick={() => openEditModal('billing')}
              className="mt-4 w-full py-2 bg-slate-50 hover:bg-pink-50 border border-slate-200 text-slate-700 hover:text-[#DF0C88] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {billing.address_1 ? 'Edit Billing Address' : 'Add Billing Address'}
            </button>
          </div>

          {/* Shipping Address Card */}
          <div className="border border-slate-200 rounded-2xl p-5 hover:border-emerald-500/50 transition-colors relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  Shipping Address
                </span>
                <button
                  onClick={() => openEditModal('shipping')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{shipping.address_1 ? 'Edit' : 'Add'}</span>
                </button>
              </div>

              {shipping.address_1 ? (
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-900 text-sm">{shipping.first_name} {shipping.last_name}</p>
                  {shipping.company && <p className="text-slate-500">{shipping.company}</p>}
                  <p>{shipping.address_1}</p>
                  {shipping.address_2 && <p>{shipping.address_2}</p>}
                  <p>{shipping.city}{shipping.postcode ? `, ${shipping.postcode}` : ''}</p>
                  <p>{shipping.country || 'United Kingdom'}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-4">You have not set up a default delivery address yet.</p>
              )}
            </div>

            <button
              onClick={() => openEditModal('shipping')}
              className="mt-4 w-full py-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {shipping.address_1 ? 'Edit Shipping Address' : 'Add Shipping Address'}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Address Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setEditModal(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden z-10 border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Edit {editModal === 'billing' ? 'Billing' : 'Shipping'} Address
              </h3>
              <button onClick={() => setEditModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="p-6 overflow-y-auto space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company (Optional)</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="House name / number and street"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                />
                <input
                  type="text"
                  placeholder="Apartment, suite, unit (optional)"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  className="w-full px-3 py-2 mt-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Town / City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">County (Optional)</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Postcode *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SW1A 1AA"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                  >
                    <option value="GB">United Kingdom (UK)</option>
                    <option value="IE">Ireland</option>
                  </select>
                </div>
              </div>

              {editModal === 'billing' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]/30"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 pt-1 select-none">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={(e) => setSameAsBilling(e.target.checked)}
                      className="rounded border-slate-300 text-[#DF0C88] focus:ring-[#DF0C88] w-4 h-4"
                    />
                    <span>Also update my default delivery address to match this billing address</span>
                  </label>
                </>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
