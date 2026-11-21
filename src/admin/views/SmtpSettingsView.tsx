import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import {
  Mail,
  Server,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
  Clock,
  Check,
  Shield,
  Inbox,
  ExternalLink,
  ChevronRight,
  Info,
  X
} from 'lucide-react';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  hasPassword?: boolean;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

interface FormSubmission {
  id: string;
  formId: string;
  formTitle: string;
  recipients: string[];
  fields: { label?: string; name?: string; value: any; type?: string }[];
  emailStatus: 'sent' | 'logged' | 'failed';
  emailError?: string;
  ip?: string;
  createdAt: string;
}

const PRESETS = [
  {
    name: 'Gmail / Google Workspace',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    hint: 'Use a Google App Password (not your primary password) with 2-Step Verification enabled.',
  },
  {
    name: 'Microsoft 365 / Outlook',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    hint: 'Requires SMTP AUTH enabled on the Microsoft 365 mailbox.',
  },
  {
    name: 'SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    hint: 'Set username to "apikey" and password to your SendGrid API key.',
  },
  {
    name: 'Amazon SES',
    host: 'email-smtp.eu-west-1.amazonaws.com',
    port: 587,
    secure: false,
    hint: 'Use your dedicated Amazon SES SMTP IAM user credentials.',
  },
  {
    name: 'Mailgun',
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false,
    hint: 'Use postmaster@yourdomain or dedicated Mailgun SMTP login.',
  },
];

export const SmtpSettingsView: React.FC = () => {
  const { adminUser } = useAdmin();
  const [activeTab, setActiveTab] = useState<'config' | 'inbox'>('config');

  // SMTP Settings State
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    hasPassword: false,
    fromEmail: 'info@irepair-mobiles.co.uk',
    fromName: 'iRepair Mobiles UK',
    enabled: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Test Email State
  const [testEmailTarget, setTestEmailTarget] = useState(adminUser?.email || 'admin@irepair-mobiles.co.uk');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
  } | null>(null);

  // Form Submissions Inbox State
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch SMTP Settings
  const fetchSmtpSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cms/smtp', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSmtpConfig(data);
      }
    } catch (err) {
      console.error('Failed to load SMTP settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Submissions
  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch('/api/admin/cms/form-submissions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchSmtpSettings();
    fetchSubmissions();
  }, []);

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setSmtpConfig((prev) => ({
      ...prev,
      host: preset.host,
      port: preset.port,
      secure: preset.secure,
    }));
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/cms/smtp', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify(smtpConfig),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        await fetchSmtpSettings();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save SMTP settings');
      }
    } catch (err: any) {
      alert(err.message || 'Connection failure');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTarget) {
      alert('Please enter a recipient email address to test.');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/cms/smtp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
        },
        body: JSON.stringify({
          targetEmail: testEmailTarget,
          customConfig: smtpConfig,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult({
          success: true,
          message: data.message || `Test verification email dispatched to ${testEmailTarget}!`,
          messageId: data.messageId,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to send test email. Please check your credentials.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error during SMTP test dispatch.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cms/form-submissions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}` },
      });
      if (res.ok) {
        setSubmissions(submissions.filter((s) => s.id !== id));
        if (selectedSubmission?.id === id) {
          setSelectedSubmission(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete submission:', err);
    }
  };

  const filteredSubmissions = submissions.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.formTitle?.toLowerCase().includes(q) ||
      s.recipients?.some((r) => r.toLowerCase().includes(q)) ||
      s.fields?.some((f) => String(f.value || '').toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">SMTP Module &amp; Form Notifications</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              smtpConfig.enabled && smtpConfig.host
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {smtpConfig.enabled && smtpConfig.host ? 'Active' : 'Disabled / Needs Setup'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure outgoing SMTP mail server credentials to deliver website form inquiries with branded email headers &amp; logos.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'config'
                ? 'bg-[#DF0C88] text-white shadow-sm'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>SMTP Server Details</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('inbox');
              fetchSubmissions();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'inbox'
                ? 'bg-[#DF0C88] text-white shadow-sm'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Form Inquiries ({submissions.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SMTP CONFIGURATION & TESTER */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Quick Provider Presets */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">1-Click Provider Presets</h3>
                <p className="text-xs text-slate-500">Auto-fill recommended host, port, and security settings</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
              {PRESETS.map((p) => {
                const isSelected = smtpConfig.host === p.host;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#DF0C88] bg-pink-50/70 text-slate-900 font-bold shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{p.host}:{p.port}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form & Settings */}
          <form onSubmit={handleSaveSmtp} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Outbound Mail Server Credentials</h3>
                <p className="text-xs text-slate-500">Used by Nodemailer to dispatch form widget notifications</p>
              </div>

              {/* Enabled Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={smtpConfig.enabled}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#DF0C88]" />
                <span className="ml-3 text-xs font-bold text-slate-700">
                  {smtpConfig.enabled ? 'Delivery Enabled' : 'Delivery Disabled'}
                </span>
              </label>
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SMTP Host / Server Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. smtp.gmail.com or mail.yourserver.co.uk"
                  value={smtpConfig.host}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Port Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder="587 or 465"
                  value={smtpConfig.port}
                  onChange={(e) => {
                    const port = parseInt(e.target.value, 10) || 587;
                    setSmtpConfig({
                      ...smtpConfig,
                      port,
                      secure: port === 465,
                    });
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SMTP Username / Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. info@irepair-mobiles.co.uk"
                  value={smtpConfig.user}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SMTP Password / App Secret <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={smtpConfig.hasPassword ? '•••••••• (Leave blank to keep current)' : 'Enter SMTP password'}
                    value={smtpConfig.pass}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {smtpConfig.hasPassword && (
                  <span className="text-[11px] text-emerald-600 mt-1 inline-flex items-center gap-1 font-semibold">
                    <Check className="w-3 h-3" /> Password is saved in database
                  </span>
                )}
              </div>
            </div>

            {/* Sender Identification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sender "From" Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. info@irepair-mobiles.co.uk"
                  value={smtpConfig.fromEmail}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                />
                <p className="text-[11px] text-slate-400 mt-1">This email address will appear in the "From" header.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sender "From" Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. iRepair Mobiles Support Desk"
                  value={smtpConfig.fromName}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                />
                <p className="text-[11px] text-slate-400 mt-1">Friendly brand name visible in email clients.</p>
              </div>
            </div>

            {/* Security Options */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-[#DF0C88] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Transport Layer Security (TLS/SSL)</span>
                  <span className="text-[11px] text-slate-500">
                    {smtpConfig.secure
                      ? 'Direct SSL/TLS encryption on Port 465.'
                      : 'Opportunistic STARTTLS encryption on Port 587 (Standard).'}
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={smtpConfig.secure}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, secure: e.target.checked })}
                  className="rounded text-[#DF0C88] focus:ring-[#DF0C88] w-4 h-4"
                />
                <span>Enforce Direct SSL (Port 465)</span>
              </label>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Settings Saved!</span>
                  </>
                ) : (
                  <span>Save SMTP Configuration</span>
                )}
              </button>
            </div>
          </form>

          {/* Real-time Connection & Delivery Tester */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 border border-slate-700/80 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#DF0C88] flex items-center justify-center text-white">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Live SMTP Connection &amp; Delivery Tester</h3>
                  <p className="text-xs text-slate-400">Send an official test email featuring the website logo and header</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Send Test Email To:
                  </label>
                  <input
                    type="email"
                    value={testEmailTarget}
                    onChange={(e) => setTestEmailTarget(e.target.value)}
                    placeholder="Enter email e.g. technician@gmail.com"
                    className="w-full text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testing}
                  className="sm:self-end px-5 py-2.5 rounded-xl bg-[#DF0C88] hover:bg-[#C50875] text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {testing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying &amp; Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Test Email</span>
                    </>
                  )}
                </button>
              </div>

              {/* Test Result Message Box */}
              {testResult && (
                <div
                  className={`p-4 rounded-2xl border flex items-start gap-3 text-xs animate-in fade-in duration-200 ${
                    testResult.success
                      ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/70 border-rose-800 text-rose-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <span className="font-bold block text-sm">
                      {testResult.success ? 'SMTP Connection Succeeded!' : 'SMTP Connection Failed'}
                    </span>
                    <p className="leading-relaxed">{testResult.message}</p>
                    {testResult.messageId && (
                      <span className="text-[10px] font-mono text-emerald-400 block pt-1">
                        Message ID: {testResult.messageId}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                <Info className="w-3.5 h-3.5 text-[#DF0C88]" />
                <span>
                  The test email demonstrates the complete HTML layout sent to form recipients, including the header logo, store support telephone, and verified styling.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INBOX & SUBMISSIONS HISTORY */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search inquiries by name, email, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-3.5 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#DF0C88]"
              />
            </div>

            <button
              onClick={fetchSubmissions}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer self-start transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSubmissions ? 'animate-spin' : ''}`} />
              <span>Refresh Inquiries</span>
            </button>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#DF0C88] flex items-center justify-center mx-auto">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">No Inquiries Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When visitors submit contact forms or repair inquiry widgets on your pages, submissions will be logged here and dispatched via SMTP.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Form Title</th>
                      <th className="py-3 px-4">Recipients</th>
                      <th className="py-3 px-4">Sender Details</th>
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Email Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((sub) => {
                      const nameField = sub.fields.find((f) => f.name === 'name' || f.label?.toLowerCase().includes('name'));
                      const emailField = sub.fields.find((f) => f.name === 'email' || f.label?.toLowerCase().includes('email'));
                      const messageField = sub.fields.find((f) => f.name === 'message' || f.label?.toLowerCase().includes('message'));

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div>{sub.formTitle}</div>
                            <span className="text-[10px] font-mono text-slate-400">{sub.id}</span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {sub.recipients?.map((r, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-medium">
                                  {r}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{nameField?.value || 'Anonymous visitor'}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{emailField?.value || 'No email provided'}</div>
                            {messageField && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                "{String(messageField.value)}"
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(sub.createdAt).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                sub.emailStatus === 'sent'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {sub.emailStatus === 'sent' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Dispatched (Sent)</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Logged in DB</span>
                                </>
                              )}
                            </span>
                            {sub.emailError && (
                              <div className="text-[10px] text-rose-500 truncate max-w-[140px] mt-0.5" title={sub.emailError}>
                                {sub.emailError}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedSubmission(sub)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => handleDeleteSubmission(sub.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete submission log"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Submission Inspection Details */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  {selectedSubmission.formTitle}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  Submission ID: {selectedSubmission.id} · {new Date(selectedSubmission.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Routing Info */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">Dispatched To (Recipients):</span>
                  <span className="font-bold text-emerald-700">
                    {selectedSubmission.emailStatus === 'sent' ? 'Delivered via SMTP' : 'Recorded in Database'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSubmission.recipients?.map((r, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-pink-50 border border-pink-200 text-[#DF0C88] font-bold text-xs font-mono">
                      {r}
                    </span>
                  ))}
                </div>
                {selectedSubmission.emailError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mt-2">
                    <strong>SMTP Notice:</strong> {selectedSubmission.emailError}
                  </div>
                )}
              </div>

              {/* Submitted Fields */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Submitted Form Fields ({selectedSubmission.fields?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {selectedSubmission.fields?.map((f, idx) => (
                    <div key={idx} className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-700 sm:w-1/3">
                        {f.label || f.name || `Field #${idx + 1}`}
                      </span>
                      <span className="text-slate-900 sm:w-2/3 break-words font-medium">
                        {f.value === null || f.value === undefined ? (
                          <em className="text-slate-400">None</em>
                        ) : typeof f.value === 'boolean' ? (
                          f.value ? 'Yes' : 'No'
                        ) : (
                          String(f.value)
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Visitor IP: {selectedSubmission.ip || '127.0.0.1'}</span>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
