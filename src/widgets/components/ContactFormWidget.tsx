import React, { useState } from 'react';
import { WidgetRenderProps } from '../types';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface FieldDef {
  id: string;
  label: string;
  name?: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  width?: 'full' | 'half';
  options?: string[] | string;
  defaultValue?: any;
}

const DEFAULT_FIELDS: FieldDef[] = [
  { id: 'f_name', label: 'Your Full Name', name: 'name', type: 'text', placeholder: 'e.g. John Doe', required: true, width: 'half' },
  { id: 'f_email', label: 'Email Address', name: 'email', type: 'email', placeholder: 'e.g. john@example.com', required: true, width: 'half' },
  { id: 'f_phone', label: 'Phone Number', name: 'phone', type: 'tel', placeholder: 'e.g. +44 7900 123456', required: false, width: 'half' },
  { id: 'f_subject', label: 'Inquiry Subject', name: 'subject', type: 'select', placeholder: 'Select inquiry type', required: true, width: 'half', options: ['Repair Inquiry', 'Order / Refurbished Store', 'Sell / Trade-in Inquiry', 'Warranty Claim', 'Corporate / Fleet Repair', 'Other Question'] },
  { id: 'f_message', label: 'Message Details', name: 'message', type: 'textarea', placeholder: 'Describe your device model, fault, or query in detail...', required: true, width: 'full' },
];

export const ContactFormWidget: React.FC<WidgetRenderProps> = ({ settings }) => {
  const { showNotification } = useApp();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fields: FieldDef[] = Array.isArray(settings.fields) && settings.fields.length > 0
    ? settings.fields
    : DEFAULT_FIELDS;

  // Initialize state dictionary
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      const key = f.name || f.id;
      if (f.type === 'checkbox') {
        initial[key] = false;
      } else if (f.type === 'select') {
        const opts = Array.isArray(f.options)
          ? f.options
          : typeof f.options === 'string'
            ? f.options.split(',').map((s) => s.trim()).filter(Boolean)
            : [];
        initial[key] = opts[0] || '';
      } else {
        initial[key] = '';
      }
    });
    return initial;
  });

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    // Format submitted fields payload
    const submissionFields = fields.map((f) => {
      const key = f.name || f.id;
      return {
        label: f.label || key,
        name: key,
        type: f.type,
        value: formData[key] !== undefined ? formData[key] : '',
      };
    });

    try {
      const res = await fetch('/api/cms/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: settings.id || 'contact_form_widget',
          formTitle: settings.title || 'Get In Touch With Our Team',
          toEmail: settings.toEmail || '',
          subject: settings.subject || `Inquiry: ${settings.title || 'Website Contact Form'}`,
          fields: submissionFields,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        showNotification(
          data.message || 'Thank you! Your message has been received.',
          'success'
        );
      } else {
        setSubmitError(data.error || 'Failed to send inquiry. Please try again.');
        showNotification(data.error || 'Failed to send inquiry', 'error');
      }
    } catch (err: any) {
      const msg = err.message || 'Network error occurred. Please try again.';
      setSubmitError(msg);
      showNotification(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmitted(false);
    setSubmitError(null);
    const resetVals: Record<string, any> = {};
    fields.forEach((f) => {
      const key = f.name || f.id;
      resetVals[key] = f.type === 'checkbox' ? false : '';
    });
    setFormData(resetVals);
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {settings.title || 'Get In Touch With Our Team'}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            {settings.subtitle || 'Have questions about a repair, quotation, or warranty? Our support desk is here to help.'}
          </p>
        </div>

        <div className="max-w-3xl mx-auto bg-slate-50 rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm">
          {submitted ? (
            <div className="text-center py-12 space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Message Received!</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                {settings.successMessage ||
                  'Thank you for contacting iRepair Mobiles. A customer support representative will review your inquiry and reply within 2 business hours.'}
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm hover:shadow-md"
                >
                  Send Another Message
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map((f, idx) => {
                  const key = f.name || f.id || `field_${idx}`;
                  const isFull = f.width === 'full' || f.type === 'textarea';
                  const gridClass = isFull ? 'sm:col-span-2' : 'sm:col-span-1';

                  const parsedOptions = Array.isArray(f.options)
                    ? f.options
                    : typeof f.options === 'string'
                      ? f.options.split(',').map((s) => s.trim()).filter(Boolean)
                      : [];

                  return (
                    <div key={key} className={gridClass}>
                      {/* Checkbox layout */}
                      {f.type === 'checkbox' ? (
                        <div className="pt-2">
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              required={Boolean(f.required)}
                              checked={Boolean(formData[key])}
                              onChange={(e) => handleInputChange(key, e.target.checked)}
                              className="mt-0.5 w-4 h-4 rounded text-[#DF0C88] focus:ring-[#DF0C88] border-slate-300"
                            />
                            <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 leading-snug">
                              {f.label}
                              {f.required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                            </span>
                          </label>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            {f.label}
                            {f.required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                          </label>

                          {/* Dropdown Select */}
                          {f.type === 'select' ? (
                            <select
                              required={Boolean(f.required)}
                              value={formData[key] || ''}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                            >
                              {f.placeholder && <option value="">{f.placeholder}</option>}
                              {parsedOptions.map((opt, oIdx) => (
                                <option key={oIdx} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : f.type === 'textarea' ? (
                            /* Textarea */
                            <textarea
                              rows={4}
                              required={Boolean(f.required)}
                              value={formData[key] || ''}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              placeholder={f.placeholder || 'Type your message...'}
                              className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                            />
                          ) : (
                            /* Standard Input (text, email, tel, number) */
                            <input
                              type={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'number' ? 'number' : 'text'}
                              required={Boolean(f.required)}
                              value={formData[key] || ''}
                              onChange={(e) => handleInputChange(key, e.target.value)}
                              placeholder={f.placeholder || ''}
                              className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Your Inquiry...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{settings.submitButtonText || 'Send Message'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
