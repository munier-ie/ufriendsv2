import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { isCacheable, getCache, setCache } from './lib/apiCache';

// ─── Session Expiry: 401 Interceptor ─────────────────────────────────────────
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const currentPath = window.location.pathname;
            const isAdminRoute = currentPath.startsWith('/admin');

            // Clear all stored session data
            localStorage.removeItem('token');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('user');
            localStorage.removeItem('adminUser');

            // Redirect to the correct login page (only if not already on a login page)
            if (isAdminRoute && !currentPath.includes('/admin/login')) {
                window.location.href = '/admin/login';
            } else if (!isAdminRoute && !currentPath.includes('/login') && !currentPath.includes('/register') && !currentPath.includes('/forgot-password') && !currentPath.includes('/reset-password')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ─── Frontend GET Cache Interceptors ─────────────────────────────────────────
// REQUEST: If the URL is whitelisted and we have a fresh cached entry,
//          swap the adapter so Axios returns the cached data immediately
//          (zero network round-trip, zero latency).
axios.interceptors.request.use((config) => {
    if (config.method === 'get') {
        const url = config.url || '';
        if (isCacheable(url)) {
            const cached = getCache(url);
            if (cached !== null) {
                // Override the adapter: return cached data without hitting the network
                config.adapter = () =>
                    Promise.resolve({
                        data: cached,
                        status: 200,
                        statusText: 'OK (cached)',
                        headers: { 'x-cache': 'HIT' },
                        config,
                        request: {},
                    });
            }
        }
    }
    return config;
});

// RESPONSE: Store successful whitelisted GET responses in the cache.
axios.interceptors.response.use(
    (response) => {
        if (
            response.config.method === 'get' &&
            response.status === 200 &&
            response.headers?.['x-cache'] !== 'HIT' // don't re-store already-cached responses
        ) {
            const url = response.config.url || '';
            if (isCacheable(url)) {
                setCache(url, response.data);
            }
        }
        return response;
    },
    (error) => Promise.reject(error)
);
import DashboardLayout from './components/layout/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/dashboard/Home';
import Profile from './pages/dashboard/Profile';
import Services from './pages/dashboard/Services';
import Verify from './pages/dashboard/Verify';
import VirtualAccounts from './pages/dashboard/VirtualAccounts';
import Upgrade from './pages/dashboard/Upgrade';
import Referrals from './pages/dashboard/Referrals';
import AirtimeToCash from './pages/dashboard/AirtimeToCash';
import Pins from './pages/dashboard/Pins';
import Transactions from './pages/dashboard/Transactions';
import Transfer from './pages/dashboard/Transfer';
import Notifications from './pages/dashboard/Notifications';
import Pricing from './pages/dashboard/Pricing';
import GovServices from './pages/dashboard/GovServices';
import ApiDocs from './pages/dashboard/ApiDocs';
import VendorAnalytics from './pages/dashboard/VendorAnalytics';
import BulkTransactions from './pages/dashboard/BulkTransactions';
import Calculator from './pages/dashboard/Calculator';
import SmileData from './pages/dashboard/SmileData';
import RechargeCards from './pages/dashboard/RechargeCards';
import BulkSMS from './pages/dashboard/BulkSMS';

import ResellerPage from './pages/ResellerPage';
import Support from './pages/dashboard/Support';

import BankingFinance from './pages/dashboard/BankingFinance';
import NotFound from './pages/NotFound';
import LandingPage from './pages/LandingPage';
const AboutPage   = React.lazy(() => import('./pages/AboutPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import HomepageEditor from './pages/dashboard/admin/HomepageEditor';

// ─── SEO Service Landing Pages — code-split per page via React.lazy ──────────
// Each page gets its own JS chunk at build time (Vite splits on dynamic import).
// React.Suspense at route level shows nothing while chunk loads (near-instant for SSR/prerender).
const PrintNinSlipPage   = React.lazy(() => import('./pages/seo/PrintNinSlipPage'));
const PrintBvnSlipPage   = React.lazy(() => import('./pages/seo/PrintBvnSlipPage'));
const NinModificationPage = React.lazy(() => import('./pages/seo/NinModificationPage'));
const BvnModificationPage = React.lazy(() => import('./pages/seo/BvnModificationPage'));
const BuyDataPage        = React.lazy(() => import('./pages/seo/BuyDataPage'));
const BuyAirtimePage     = React.lazy(() => import('./pages/seo/BuyAirtimePage'));
const PayElectricityPage = React.lazy(() => import('./pages/seo/PayElectricityPage'));
const CableTvPage        = React.lazy(() => import('./pages/seo/CableTvPage'));
const ExamPinsPage       = React.lazy(() => import('./pages/seo/ExamPinsPage'));
const CacRegistrationPage = React.lazy(() => import('./pages/seo/CacRegistrationPage'));
const BlogIndex          = React.lazy(() => import('./pages/blog/BlogIndex'));
const BlogPost           = React.lazy(() => import('./pages/blog/BlogPost'));

import AdminDashboard from './pages/dashboard/admin/AdminDashboard';
import UserManagement from './pages/dashboard/admin/UserManagement';
import AdminTransactions from './pages/dashboard/admin/AdminTransactions';
import ServiceManagement from './pages/dashboard/admin/ServiceManagement';
import ProviderManagement from './pages/dashboard/admin/ProviderManagement';
import SalesReport from './pages/dashboard/admin/SalesReport';
import SiteSettings from './pages/dashboard/admin/SiteSettings';
import PaymentGatewaySettings from './pages/dashboard/admin/PaymentGatewaySettings';
import NetworkSettings from './pages/dashboard/admin/NetworkSettings';
import BlacklistManagement from './pages/dashboard/admin/BlacklistManagement';
import SystemUsers from './pages/dashboard/admin/SystemUsers';
import ApiWalletMonitor from './pages/dashboard/admin/ApiWalletMonitor';
import AirtimeToCashDashboard from './pages/dashboard/admin/AirtimeToCashDashboard';
import AlphaTopupDashboard from './pages/dashboard/admin/AlphaTopupDashboard';
import CacDashboard from './pages/dashboard/admin/CacDashboard';
import ContactMessages from './pages/dashboard/admin/ContactMessages';
import SmilePlanDashboard from './pages/dashboard/admin/SmilePlanDashboard';
import ExamPinDashboard from './pages/dashboard/admin/ExamPinDashboard';
import PinStockManagement from './pages/dashboard/admin/PinStockManagement';
import AdminProfile from './pages/dashboard/admin/AdminProfile';
import BroadcastMessage from './pages/dashboard/admin/BroadcastMessage';
import CableTvDashboard from './pages/dashboard/admin/CableTvDashboard';
import ElectricityDashboard from './pages/dashboard/admin/ElectricityDashboard';
import BulkSmsDashboard from './pages/dashboard/admin/BulkSmsDashboard';
import VirtualAccountManagement from './pages/dashboard/admin/VirtualAccountManagement';
import ReferralDashboard from './pages/dashboard/admin/ReferralDashboard';
import VerificationSettings from './pages/dashboard/admin/VerificationSettings';
import ManualServicesDashboard from './pages/dashboard/admin/ManualServicesDashboard';
import ManualPricingSettings from './pages/dashboard/admin/ManualPricingSettings';
import UpgradePlanManagement from './pages/dashboard/admin/UpgradePlanManagement';
import ManualServices from './pages/dashboard/ManualServices';
import Academy from './pages/dashboard/Academy';
import AcademyDashboard from './pages/dashboard/admin/AcademyDashboard';
import AdminResellerRequests from './pages/dashboard/admin/AdminResellerRequests';
import ResellerPricingManagement from './pages/dashboard/admin/ResellerPricingManagement';
import SoftwareOptionManagement from './pages/dashboard/admin/SoftwareOptionManagement';
import ProviderSwitch from './pages/dashboard/admin/ProviderSwitch';
import BotDiscoveredPlans from './pages/dashboard/admin/BotDiscoveredPlans';
import ResellerStatusPage from './pages/ResellerStatusPage';
import ResellerCallback from './pages/ResellerCallback';

export default function App() {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/admin/login" element={<AdminLogin />} />

                {/* Protected User Routes */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<Home />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="services" element={<Services />} />
                    <Route path="verify" element={<Verify />} />
                    <Route path="upgrade" element={<Upgrade />} />
                    <Route path="referrals" element={<Referrals />} />
                    <Route path="airtime2cash" element={<AirtimeToCash />} />
                    <Route path="pins" element={<Pins />} />
                    <Route path="virtual-accounts" element={<VirtualAccounts />} />
                    <Route path="transactions" element={<Transactions />} />
                    {/* <Route path="transfer" element={<Transfer />} /> */}
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="pricing" element={<Pricing />} />
                    <Route path="gov-services" element={<GovServices />} />
                    <Route path="data-pins" element={<Services />} />
                    <Route path="exam-pins" element={<Services />} />
                    <Route path="api-docs" element={<ApiDocs />} />
                    <Route path="vendor-analytics" element={<VendorAnalytics />} />
                    <Route path="bulk-transactions" element={<BulkTransactions />} />

                    {/* Phase 8: Additional Services */}
                    <Route path="calculator" element={<Calculator />} />
                    <Route path="smile-data" element={<SmileData />} />
                    <Route path="bulk-sms" element={<BulkSMS />} />

                    <Route path="manual-services" element={<ManualServices />} />
                    <Route path="recharge-cards" element={<RechargeCards />} />

                    <Route path="academy" element={<Academy />} />
                    <Route path="support" element={<Support />} />

                    <Route path="banking-finance" element={<BankingFinance />} />
                </Route>

                {/* Protected Admin Routes */}
                <Route path="/admin/dashboard" element={<DashboardLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="transactions" element={<AdminTransactions />} />
                    <Route path="services" element={<ServiceManagement />} />
                    <Route path="providers" element={<ProviderManagement />} />
                    <Route path="reports/sales" element={<SalesReport />} />
                    <Route path="settings" element={<SiteSettings />} />
                    <Route path="settings/payments" element={<PaymentGatewaySettings />} />
                    <Route path="settings/verification" element={<VerificationSettings />} />
                    <Route path="settings/networks" element={<NetworkSettings />} />
                    <Route path="settings/blacklist" element={<BlacklistManagement />} />
                    <Route path="system-users" element={<SystemUsers />} />
                    <Route path="api-wallets" element={<ApiWalletMonitor />} />
                    <Route path="airtime-cash" element={<AirtimeToCashDashboard />} />
                    <Route path="alpha-topup" element={<AlphaTopupDashboard />} />
                    <Route path="cac" element={<CacDashboard />} />
                    <Route path="contact" element={<ContactMessages />} />
                    <Route path="smile-plans" element={<SmilePlanDashboard />} />
                    <Route path="exam-pins" element={<ExamPinDashboard />} />
                    <Route path="pins" element={<PinStockManagement />} />
                    <Route path="profile" element={<AdminProfile />} />
                    <Route path="broadcast" element={<BroadcastMessage />} />
                    <Route path="reports" element={<SalesReport />} />
                    <Route path="cable" element={<CableTvDashboard />} />
                    <Route path="electricity" element={<ElectricityDashboard />} />
                    <Route path="sms" element={<BulkSmsDashboard />} />
                    <Route path="virtual-accounts" element={<VirtualAccountManagement />} />
                    <Route path="referrals" element={<ReferralDashboard />} />
                    <Route path="manual-services" element={<ManualServicesDashboard />} />
                    <Route path="manual-services/pricing" element={<ManualPricingSettings />} />
                    <Route path="settings/upgrades" element={<UpgradePlanManagement />} />
                    <Route path="settings/software" element={<SoftwareOptionManagement />} />
                    <Route path="settings/reseller-pricing" element={<ResellerPricingManagement />} />
                    <Route path="settings/routing" element={<ProviderSwitch />} />
                    <Route path="bot-plans" element={<BotDiscoveredPlans />} />
                    <Route path="academy" element={<AcademyDashboard />} />
                    <Route path="reseller-requests" element={<AdminResellerRequests />} />
                    <Route path="homepage" element={<HomepageEditor />} />
                </Route>

                {/* ─── SEO Service Pages — each is its own lazy-loaded chunk ─── */}
                <Route path="/print-nin-slip-nigeria"    element={<React.Suspense fallback={null}><PrintNinSlipPage /></React.Suspense>} />
                <Route path="/print-bvn-slip-nigeria"    element={<React.Suspense fallback={null}><PrintBvnSlipPage /></React.Suspense>} />
                <Route path="/nin-modification-nigeria"  element={<React.Suspense fallback={null}><NinModificationPage /></React.Suspense>} />
                <Route path="/bvn-modification-nigeria"  element={<React.Suspense fallback={null}><BvnModificationPage /></React.Suspense>} />
                <Route path="/cac-registration-nigeria"  element={<React.Suspense fallback={null}><CacRegistrationPage /></React.Suspense>} />
                <Route path="/buy-data-nigeria"          element={<React.Suspense fallback={null}><BuyDataPage /></React.Suspense>} />
                <Route path="/buy-airtime-nigeria"       element={<React.Suspense fallback={null}><BuyAirtimePage /></React.Suspense>} />
                <Route path="/pay-electricity-bill-nigeria" element={<React.Suspense fallback={null}><PayElectricityPage /></React.Suspense>} />
                <Route path="/subscribe-cable-tv-nigeria"   element={<React.Suspense fallback={null}><CableTvPage /></React.Suspense>} />
                <Route path="/buy-exam-pins-nigeria"        element={<React.Suspense fallback={null}><ExamPinsPage /></React.Suspense>} />

                {/* ─── Blog — lazy-loaded ─── */}
                <Route path="/blog"       element={<React.Suspense fallback={null}><BlogIndex /></React.Suspense>} />
                <Route path="/blog/:slug" element={<React.Suspense fallback={null}><BlogPost /></React.Suspense>} />

                {/* ─── Static public pages ─── */}
                <Route path="/"        element={<LandingPage />} />
                <Route path="/reseller" element={<ResellerPage />} />
                <Route path="/reseller/callback" element={<ResellerCallback />} />
                <Route path="/reseller/status/:reference" element={<ResellerStatusPage />} />
                <Route path="/about"   element={<React.Suspense fallback={null}><AboutPage /></React.Suspense>} />
                <Route path="/contact" element={<React.Suspense fallback={null}><ContactPage /></React.Suspense>} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms"   element={<TermsOfService />} />
                <Route path="*"        element={<NotFound />} />
            </Routes>

        </Router>
    );
}
