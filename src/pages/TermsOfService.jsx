import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../components/ui/Logo';
import LandingFooter from '../components/landing/LandingFooter';

export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>

          <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-gray-600">
              <strong>Effective Date:</strong> September 4, 2026<br />
              <strong>Company:</strong> UFriends Information Technology ("UFriends", "we", "our", "us")<br />
              <strong>Website:</strong> https://ufriends.com.ng
            </div>

            <p>
              These Terms of Service govern your use of UFriends' identity verification and digital services. By accessing or using our website and services, you agree to these Terms.
            </p>

            <Section title="1. Acceptance of Terms">
              <p>By accessing UFriends, you agree to comply with these Terms and applicable Nigerian laws. If you do not agree, do not use our services.</p>
            </Section>

            <Section title="2. Services Provided">
              <p className="mb-3">We provide lawful services including (but not limited to):</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>BVN &amp; NIN verification and enrollment</li>
                <li>CAC registration and retrieval</li>
                <li>POS agent onboarding &amp; agency banking</li>
                <li>Airtime, data, and bill payments</li>
                <li>Education services (WAEC, NECO, JAMB, etc.)</li>
                <li>Software development &amp; integration</li>
                <li>Customer identity and compliance verification</li>
              </ul>
            </Section>

            <Section title="3. User Eligibility">
              <ul className="list-disc pl-5 space-y-1">
                <li>You must be at least 18 years old.</li>
                <li>Services must only be used for lawful and authorized purposes.</li>
              </ul>
            </Section>

            <Section title="4. User Consent">
              <p>Verification requires explicit and informed consent of the individual. Users must confirm they have obtained consent before initiating verification.</p>
            </Section>

            <Section title="5. Authorized Uses">
              <p className="mb-3">Services may only be used for:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Customer due diligence (KYC)</li>
                <li>Employment background checks (with consent)</li>
                <li>Financial onboarding and fraud prevention</li>
                <li>Regulatory compliance and lawful identity confirmation</li>
              </ul>
            </Section>

            <Section title="6. Prohibited Uses">
              <p className="mb-3">You must not:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Verify individuals without consent</li>
                <li>Misrepresent verification results as government-issued documents</li>
                <li>Attempt to verify PEPs without lawful justification</li>
                <li>Use services for fraud, harassment, or unlawful activity</li>
              </ul>
            </Section>

            <Section title="7. Payments & Refunds">
              <ul className="list-disc pl-5 space-y-1">
                <li>Payments must be made via approved methods.</li>
                <li>Refunds are not guaranteed once a service request has been processed, except in cases of system error.</li>
                <li>Failed transactions will be reviewed and resolved within 7 business days.</li>
              </ul>
            </Section>

            <Section title="8. Service Availability">
              <p>We strive for uptime but services may be unavailable due to maintenance, third-party downtime, or regulatory updates.</p>
            </Section>

            <Section title="9. Accuracy of Information">
              <p>You are responsible for providing accurate and lawful information. UFriends will not be liable for errors arising from false or incomplete data.</p>
            </Section>

            <Section title="10. Data Protection & Privacy">
              <p>We process all data lawfully under NDPR and the Nigeria Data Protection Act 2023. See our{' '}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for details.
              </p>
            </Section>

            <Section title="11. Security Obligations">
              <p>You must not tamper with, hack, or misuse UFriends' systems. Any breach may result in suspension and reporting to authorities.</p>
            </Section>

            <Section title="12. User Accounts">
              <ul className="list-disc pl-5 space-y-1">
                <li>Keep login credentials secure.</li>
                <li>You are responsible for all activities under your account.</li>
              </ul>
            </Section>

            <Section title="13. Intellectual Property">
              <p>All content, branding, software, and logos on UFriends are the property of UFriends Information Technology. Unauthorized use is prohibited.</p>
            </Section>

            <Section title="14. Indemnity">
              <p>You agree to indemnify and hold harmless UFriends, its directors, and affiliates against claims or damages from misuse of services.</p>
            </Section>

            <Section title="15. Limitation of Liability">
              <p>UFriends is not liable for indirect, incidental, or consequential damages arising from use of its services.</p>
            </Section>

            <Section title="16. Suspension or Termination">
              <p>We may suspend or terminate your access if you violate these Terms, engage in fraud, or breach laws.</p>
            </Section>

            <Section title="17. Dispute Resolution">
              <p>Any dispute shall first be settled amicably. If unresolved, disputes shall be referred to arbitration under Nigerian law.</p>
            </Section>

            <Section title="18. Governing Law">
              <p>These Terms are governed by the laws of the Federal Republic of Nigeria.</p>
            </Section>

            <Section title="19. Updates to Terms">
              <p>We may revise these Terms periodically. Updates will be posted on our website.</p>
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
