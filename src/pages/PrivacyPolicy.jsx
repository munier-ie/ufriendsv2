import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../components/ui/Logo';
import LandingFooter from '../components/landing/LandingFooter';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-gray-500 hover:text-primary transition-colors mb-6 text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          <div className="flex items-center space-x-2 mb-2">
            <Logo className="w-8 h-8" />
            <span className="font-bold text-xl text-gray-900">UFriends IT</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>

          <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-600">
              <strong>Effective Date:</strong> September 4, 2025<br />
              <strong>Company:</strong> UFriends Information Technology<br />
              <strong>Website:</strong> https://ufriends.com.ng
            </div>

            <p>
              At UFriends Information Technology, we are committed to protecting the privacy and security of our customers, agents, and partners. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information in compliance with the Nigeria Data Protection Regulation (NDPR), the Nigeria Data Protection Act 2023, and all applicable laws.
            </p>

            <Section title="1. Information We Collect">
              <p className="mb-3">We may collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Identity Data:</strong> Name, date of birth, gender, NIN, BVN.</li>
                <li><strong>Corporate Data:</strong> CAC certificate, business name, RC/BN number.</li>
                <li><strong>Facial Data:</strong> Photos for onboarding and verification.</li>
                <li><strong>Contact Data:</strong> Phone number, email, address.</li>
                <li><strong>Usage Data:</strong> Transaction logs, dashboard activities.</li>
                <li><strong>Consent Records:</strong> User agreements and approvals.</li>
              </ul>
            </Section>

            <Section title="2. Purpose of Data Collection">
              <p className="mb-3">Your data is collected and processed for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Customer onboarding and identity verification</li>
                <li>BVN/NIN enrollment and modification</li>
                <li>POS and agent banking enrollment</li>
                <li>Corporate verification and CAC registration</li>
                <li>Fraud prevention and compliance reporting</li>
                <li>Service improvement and support</li>
              </ul>
            </Section>

            <Section title="3. Lawful Basis for Processing">
              <p className="mb-3">We process your personal data only:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>With your explicit consent</li>
                <li>To comply with legal and regulatory obligations</li>
                <li>To protect our business interests and prevent fraud</li>
                <li>To deliver services you request</li>
              </ul>
            </Section>

            <Section title="4. Restrictions and Prohibited Use">
              <ul className="list-disc pl-5 space-y-1">
                <li>Verifying an individual without their consent is strictly prohibited.</li>
                <li>Attempting to verify politically exposed persons (PEPs) without lawful grounds will be reported.</li>
                <li>UFriends services must only be used for lawful, authorized purposes.</li>
              </ul>
            </Section>

            <Section title="5. Data Security">
              <p>We implement strong safeguards (encryption, access controls, monitoring) to prevent unauthorized access, alteration, or disclosure of personal data.</p>
            </Section>

            <Section title="6. Data Retention">
              <p>We retain your personal information only as long as necessary for the stated purposes or as required by law.</p>
            </Section>

            <Section title="7. Disclosure of Information">
              <p className="mb-3">We do not sell or rent your personal data. Information may be disclosed:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>To regulators or law enforcement as required</li>
                <li>To trusted partners under confidentiality agreements</li>
                <li>In case of legal disputes or fraud investigation</li>
              </ul>
            </Section>

            <Section title="8. International Transfers">
              <p>If data is transferred outside Nigeria, we ensure safeguards aligned with GDPR and global best practices.</p>
            </Section>

            <Section title="9. Data Breach Protocol">
              <p>In the unlikely event of a breach, affected users will be notified within 72 hours with corrective actions.</p>
            </Section>

            <Section title="10. Children's Privacy">
              <p>Our services are not directed to individuals under 18. We do not knowingly collect data from children.</p>
            </Section>

            <Section title="11. Your Rights">
              <p className="mb-3">Under NDPR &amp; NDP Act, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Access your personal data</li>
                <li>Correct or update inaccurate data</li>
                <li>Withdraw consent at any time</li>
                <li>Request deletion of data</li>
                <li>Report misuse to the Nigeria Data Protection Bureau (NDPB)</li>
              </ul>
            </Section>

            <Section title="12. End-Product Disclaimer">
              <p>Verification slips or digital records generated from UFriends are <strong>not original government-issued documents</strong> and must not be used as such.</p>
            </Section>

            <Section title="13. Updates to this Policy">
              <p>We may update this Privacy Policy from time to time. Any changes will be communicated on our website.</p>
            </Section>

            <Section title="14. Contact Us">
              <p>For inquiries or data protection concerns, contact:<br />
                📧 <a href="mailto:support@ufriends.com.ng" className="text-primary hover:underline">support@ufriends.com.ng</a>
              </p>
            </Section>
          </div>
        </div>
      </div>
      <LandingFooter />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">{title}</h2>
      {children}
    </div>
  );
}
