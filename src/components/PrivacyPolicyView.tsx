import React from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from './PageHeader';
import { Mail, Calendar, ShieldCheck } from 'lucide-react';

export const PrivacyPolicyView: React.FC = () => {
  const { setCurrentPage } = useApp();

  return (
    <div className="w-full bg-white text-slate-900">
      
      {/* Reusable Page Header Banner */}
      <PageHeader
        title="Privacy Policy"
        breadcrumbs={[
          { label: 'Home', onClick: () => setCurrentPage('home') },
          { label: 'Privacy Policy' }
        ]}
      />

      {/* Main Privacy Policy Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 md:p-12 space-y-8">
          
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Calendar className="w-4 h-4 text-[#DF0C88]" />
              <span>Effective Date: <strong className="text-slate-800">27-02-2025</strong></span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-[#DF0C88] text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>UK GDPR Compliant</span>
            </div>
          </div>

          {/* Introductory Statements */}
          <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            <p>
              At iRepair, we are committed to protecting your privacy and ensuring transparency in how we handle your personal data. As a part of Phone Fresh UK Limited (Company Number 03133908), a trusted name in the tech repair industry since July 16, 2014, we uphold the highest standards in data protection and customer trust.
            </p>
            <p>
              By accessing or using our website{' '}
              <a 
                href="https://irepair-mobiles.co.uk/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#DF0C88] font-semibold hover:underline"
              >
                https://irepair-mobiles.co.uk/
              </a>{' '}
              (the “Website”), you agree to the practices outlined in this Privacy Policy.
            </p>
          </div>

          <div className="space-y-8 text-sm sm:text-base text-slate-700 leading-relaxed pt-2">
            
            {/* Section 1 */}
            <div className="space-y-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                1. Information We Collect
              </h2>
              
              <div className="space-y-2 pl-1 sm:pl-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  1.1 Personal Information
                </h3>
                <p className="text-slate-600">
                  We may collect and process the following personal details:
                </p>
                <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                  <li><strong className="text-slate-800">Identity Information:</strong> Name, email address, phone number, and postal address.</li>
                  <li><strong className="text-slate-800">Payment Information:</strong> Billing details (processed securely via third-party payment providers).</li>
                  <li><strong className="text-slate-800">Order & Transaction Details:</strong> Purchase history, repair service records, and warranty claims.</li>
                  <li><strong className="text-slate-800">Communication Data:</strong> Customer support inquiries, feedback, and emails.</li>
                </ul>
              </div>

              <div className="space-y-2 pl-1 sm:pl-3 pt-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  1.2 Technical Data & Cookies
                </h3>
                <p className="text-slate-600">
                  When you visit our Website, we may automatically collect:
                </p>
                <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                  <li><strong className="text-slate-800">Device Information:</strong> IP address, browser type, operating system, and access times.</li>
                  <li><strong className="text-slate-800">Usage Data:</strong> Pages visited, time spent on the Website, and referral sources.</li>
                  <li><strong className="text-slate-800">Cookies & Tracking Technologies:</strong> These enhance your browsing experience and help analyze site traffic. You can modify cookie preferences in your browser settings.</li>
                </ul>
              </div>
            </div>

            {/* Section 2 */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                2. How We Use Your Information
              </h2>
              <p className="text-slate-600">
                We use the collected data to:
              </p>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>Process orders and service requests efficiently.</li>
                <li>Provide customer support and respond to inquiries.</li>
                <li>Enhance and personalize your Website experience.</li>
                <li>Send important updates related to your orders or account.</li>
                <li>Comply with legal obligations and prevent fraud.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                3. Sharing of Information
              </h2>
              
              <div className="space-y-2 pl-1 sm:pl-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  3.1 Trusted Third-Party Service Providers
                </h3>
                <p className="text-slate-600">
                  We share necessary data with:
                </p>
                <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                  <li>Payment processors (e.g., Stripe, PayPal) to facilitate transactions.</li>
                  <li>Delivery and logistics partners for shipping services.</li>
                  <li>Analytics and security services to improve our Website and protect user data.</li>
                </ul>
                <p className="text-xs sm:text-sm text-slate-600 italic pt-1">
                  These providers are contractually bound to protect your data.
                </p>
              </div>

              <div className="space-y-2 pl-1 sm:pl-3 pt-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  3.2 Legal Compliance & Security
                </h3>
                <p className="text-slate-600">
                  We may disclose your information:
                </p>
                <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                  <li>If required by law, court order, or government authority.</li>
                  <li>To protect our business, customers, and website security.</li>
                </ul>
              </div>

              <div className="space-y-2 pl-1 sm:pl-3 pt-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  3.3 Business Transfers
                </h3>
                <p className="text-slate-600">
                  If iRepair or Phone Fresh UK Limited undergoes a business sale or merger, customer data may be transferred as part of the transaction.
                </p>
              </div>
            </div>

            {/* Section 4 */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                4. Third-Party Links & External Sites
              </h2>
              <p className="text-slate-600">
                Our Website may include links to external websites. We are not responsible for their privacy policies, so we encourage you to review their terms before sharing any information.
              </p>
            </div>

            {/* Section 5 */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                5. Data Security
              </h2>
              <p className="text-slate-600">
                We implement strict security measures to protect your personal data. However, no online system is completely secure, and we cannot guarantee absolute protection against cyber threats.
              </p>
            </div>

            {/* Section 6 */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                6. Your Rights & Choices
              </h2>
              <p className="text-slate-600">
                You have the right to:
              </p>
              <ul className="list-disc list-outside pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
                <li>Access, update, or delete your personal information.</li>
                <li>Request data portability where applicable.</li>
                <li>Opt out of marketing communications at any time.</li>
              </ul>
              <div className="pt-2">
                <p className="text-slate-700 font-medium">To exercise these rights, contact us at:</p>
                <a 
                  href="mailto:support@irepair-mobiles.co.uk" 
                  className="inline-flex items-center gap-1.5 text-[#DF0C88] font-bold hover:underline mt-1 text-sm sm:text-base"
                >
                  <Mail className="w-4 h-4" />
                  <span>support@irepair-mobiles.co.uk</span>
                </a>
              </div>
            </div>

            {/* Section 7 */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                7. Children’s Privacy
              </h2>
              <p className="text-slate-600">
                Our Website is not intended for users under 13 years old. We do not knowingly collect data from children. If we discover such data, we will delete it immediately.
              </p>
            </div>

            {/* Section 8 */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                8. Updates to This Privacy Policy
              </h2>
              <p className="text-slate-600">
                We may revise this Privacy Policy periodically. Changes will take effect upon posting on our Website. We encourage you to review this page regularly.
              </p>
              <div className="pt-2">
                <p className="text-slate-700 font-medium">For further inquiries, contact us at:</p>
                <a 
                  href="mailto:support@irepair-mobiles.co.uk" 
                  className="inline-flex items-center gap-1.5 text-[#DF0C88] font-bold hover:underline mt-1 text-sm sm:text-base"
                >
                  <Mail className="w-4 h-4" />
                  <span>support@irepair-mobiles.co.uk</span>
                </a>
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
