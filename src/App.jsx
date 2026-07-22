import React, { Suspense, useEffect } from 'react';
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

import LandingPage from './pages/LandingPage';
import DashboardLayout from './components/layout/DashboardLayout';

// ─── Public Pages (lazy-loaded) ─────────────────────────────────────────────
const Login             = React.lazy(() => import('./pages/Login'));
const Register          = React.lazy(() => import('./pages/Register'));
const AdminLogin        = React.lazy(() => import('./pages/AdminLogin'));
const ForgotPassword    = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword     = React.lazy(() => import('./pages/ResetPassword'));
const AboutPage         = React.lazy(() => import('./pages/AboutPage'));
const ContactPage       = React.lazy(() => import('./pages/ContactPage'));
const PrivacyPolicy     = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService    = React.lazy(() => import('./pages/TermsOfService'));
const NotFound          = React.lazy(() => import('./pages/NotFound'));
const ResellerPage      = React.lazy(() => import('./pages/ResellerPage'));
const ResellerStatusPage = React.lazy(() => import('./pages/ResellerStatusPage'));
const ResellerCallback  = React.lazy(() => import('./pages/ResellerCallback'));

// ─── User Dashboard Pages (lazy-loaded) ─────────────────────────────────────
const Home              = React.lazy(() => import('./pages/dashboard/Home'));
const Profile           = React.lazy(() => import('./pages/dashboard/Profile'));
const Services          = React.lazy(() => import('./pages/dashboard/Services'));
const Verify            = React.lazy(() => import('./pages/dashboard/Verify'));
const VirtualAccounts   = React.lazy(() => import('./pages/dashboard/VirtualAccounts'));
const Upgrade           = React.lazy(() => import('./pages/dashboard/Upgrade'));
const Referrals         = React.lazy(() => import('./pages/dashboard/Referrals'));
const AirtimeToCash     = React.lazy(() => import('./pages/dashboard/AirtimeToCash'));
const Pins              = React.lazy(() => import('./pages/dashboard/Pins'));
const Transactions      = React.lazy(() => import('./pages/dashboard/Transactions'));
const Transfer          = React.lazy(() => import('./pages/dashboard/Transfer'));
const Notifications     = React.lazy(() => import('./pages/dashboard/Notifications'));
const Pricing           = React.lazy(() => import('./pages/dashboard/Pricing'));
const GovServices       = React.lazy(() => import('./pages/dashboard/GovServices'));
const ApiDocs           = React.lazy(() => import('./pages/dashboard/ApiDocs'));
const VendorAnalytics   = React.lazy(() => import('./pages/dashboard/VendorAnalytics'));
const BulkTransactions  = React.lazy(() => import('./pages/dashboard/BulkTransactions'));
const Calculator        = React.lazy(() => import('./pages/dashboard/Calculator'));
const SmileData         = React.lazy(() => import('./pages/dashboard/SmileData'));
const RechargeCards     = React.lazy(() => import('./pages/dashboard/RechargeCards'));
const BulkSMS           = React.lazy(() => import('./pages/dashboard/BulkSMS'));
const ManualServices    = React.lazy(() => import('./pages/dashboard/ManualServices'));
const Academy           = React.lazy(() => import('./pages/dashboard/Academy'));
const Support           = React.lazy(() => import('./pages/dashboard/Support'));
const BankingFinance    = React.lazy(() => import('./pages/dashboard/BankingFinance'));

// ─── Admin Dashboard Pages (lazy-loaded) ────────────────────────────────────
const AdminDashboard          = React.lazy(() => import('./pages/dashboard/admin/AdminDashboard'));
const UserManagement          = React.lazy(() => import('./pages/dashboard/admin/UserManagement'));
const AdminTransactions       = React.lazy(() => import('./pages/dashboard/admin/AdminTransactions'));
const ServiceManagement       = React.lazy(() => import('./pages/dashboard/admin/ServiceManagement'));
const ProviderManagement      = React.lazy(() => import('./pages/dashboard/admin/ProviderManagement'));
const SalesReport             = React.lazy(() => import('./pages/dashboard/admin/SalesReport'));
const SiteSettings            = React.lazy(() => import('./pages/dashboard/admin/SiteSettings'));
const PaymentGatewaySettings  = React.lazy(() => import('./pages/dashboard/admin/PaymentGatewaySettings'));
const NetworkSettings         = React.lazy(() => import('./pages/dashboard/admin/NetworkSettings'));
const BlacklistManagement     = React.lazy(() => import('./pages/dashboard/admin/BlacklistManagement'));
const SystemUsers             = React.lazy(() => import('./pages/dashboard/admin/SystemUsers'));
const ApiWalletMonitor        = React.lazy(() => import('./pages/dashboard/admin/ApiWalletMonitor'));
const AirtimeToCashDashboard  = React.lazy(() => import('./pages/dashboard/admin/AirtimeToCashDashboard'));
const AlphaTopupDashboard     = React.lazy(() => import('./pages/dashboard/admin/AlphaTopupDashboard'));
const CacDashboard            = React.lazy(() => import('./pages/dashboard/admin/CacDashboard'));
const ContactMessages         = React.lazy(() => import('./pages/dashboard/admin/ContactMessages'));
const SmilePlanDashboard      = React.lazy(() => import('./pages/dashboard/admin/SmilePlanDashboard'));
const ExamPinDashboard        = React.lazy(() => import('./pages/dashboard/admin/ExamPinDashboard'));
const PinStockManagement      = React.lazy(() => import('./pages/dashboard/admin/PinStockManagement'));
const AdminProfile            = React.lazy(() => import('./pages/dashboard/admin/AdminProfile'));
const BroadcastMessage        = React.lazy(() => import('./pages/dashboard/admin/BroadcastMessage'));
const CableTvDashboard        = React.lazy(() => import('./pages/dashboard/admin/CableTvDashboard'));
const ElectricityDashboard    = React.lazy(() => import('./pages/dashboard/admin/ElectricityDashboard'));
const BulkSmsDashboard        = React.lazy(() => import('./pages/dashboard/admin/BulkSmsDashboard'));
const VirtualAccountManagement = React.lazy(() => import('./pages/dashboard/admin/VirtualAccountManagement'));
const ReferralDashboard       = React.lazy(() => import('./pages/dashboard/admin/ReferralDashboard'));
const VerificationSettings    = React.lazy(() => import('./pages/dashboard/admin/VerificationSettings'));
const ManualServicesDashboard = React.lazy(() => import('./pages/dashboard/admin/ManualServicesDashboard'));
const ManualPricingSettings   = React.lazy(() => import('./pages/dashboard/admin/ManualPricingSettings'));
const UpgradePlanManagement   = React.lazy(() => import('./pages/dashboard/admin/UpgradePlanManagement'));
const AcademyDashboard        = React.lazy(() => import('./pages/dashboard/admin/AcademyDashboard'));
const AdminResellerRequests   = React.lazy(() => import('./pages/dashboard/admin/AdminResellerRequests'));
const ResellerPricingManagement = React.lazy(() => import('./pages/dashboard/admin/ResellerPricingManagement'));
const SoftwareOptionManagement = React.lazy(() => import('./pages/dashboard/admin/SoftwareOptionManagement'));
const ProviderSwitch          = React.lazy(() => import('./pages/dashboard/admin/ProviderSwitch'));
const BotDiscoveredPlans      = React.lazy(() => import('./pages/dashboard/admin/BotDiscoveredPlans'));
const HomepageEditor          = React.lazy(() => import('./pages/dashboard/admin/HomepageEditor'));

// ─── SEO & Blog (lazy-loaded) ───────────────────────────────────────────────
const SeoPageDynamic = React.lazy(() => import('./pages/seo/SeoPageDynamic'));
const BlogIndex      = React.lazy(() => import('./pages/blog/BlogIndex'));
const BlogPost       = React.lazy(() => import('./pages/blog/BlogPost'));

const PageLoader = () => (
    <div className="initial-loader-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', backgroundColor: '#f3fcfd', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div className="spinner" style={{ width: '48px', height: '48px', border: '4px solid rgba(30, 144, 255, 0.2)', borderTopColor: '#004687', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <div className="loading-phrases" style={{ position: 'relative', height: '24px', width: '100%', marginTop: '20px', overflow: 'hidden' }}>
        <div className="phrase" style={{ position: 'absolute', top: 0, left: 0, width: '100%', textAlign: 'center', color: '#004687', fontWeight: 600, fontSize: '15px', letterSpacing: '0.5px', opacity: 0, animation: 'cycle-phrases 8s infinite', animationDelay: '0s' }}>Securing your connection...</div>
        <div className="phrase" style={{ position: 'absolute', top: 0, left: 0, width: '100%', textAlign: 'center', color: '#004687', fontWeight: 600, fontSize: '15px', letterSpacing: '0.5px', opacity: 0, animation: 'cycle-phrases 8s infinite', animationDelay: '2s' }}>Fetching the best data deals...</div>
        <div className="phrase" style={{ position: 'absolute', top: 0, left: 0, width: '100%', textAlign: 'center', color: '#004687', fontWeight: 600, fontSize: '15px', letterSpacing: '0.5px', opacity: 0, animation: 'cycle-phrases 8s infinite', animationDelay: '4s' }}>Preparing your dashboard...</div>
        <div className="phrase" style={{ position: 'absolute', top: 0, left: 0, width: '100%', textAlign: 'center', color: '#004687', fontWeight: 600, fontSize: '15px', letterSpacing: '0.5px', opacity: 0, animation: 'cycle-phrases 8s infinite', animationDelay: '6s' }}>Almost ready...</div>
      </div>
    </div>
);

import ScrollToTop from './components/ScrollToTop';

export default function App() {
    useEffect(() => {
        // Smart Prefetching: Download heavy routes in the background after initial render
        const prefetchRoutes = () => {
            setTimeout(() => {
                import('./pages/dashboard/Home').catch(()=>{});
                import('./pages/dashboard/admin/AdminDashboard').catch(()=>{});
                import('./components/layout/DashboardLayout').catch(()=>{});
                import('./pages/LandingPage').catch(()=>{});
                import('./pages/Login').catch(()=>{});
            }, 2000);
        };
        
        if (window.requestIdleCallback) {
            window.requestIdleCallback(prefetchRoutes);
        } else {
            prefetchRoutes();
        }
    }, []);

    return (
        <Router>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
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

                    {/* ─── SEO Service Pages — handled by dynamic component ─── */}
                    <Route path="/print-nin-slip-nigeria"    element={<SeoPageDynamic />} />
                    <Route path="/print-bvn-slip-nigeria"    element={<SeoPageDynamic />} />
                    <Route path="/nin-modification-nigeria"  element={<SeoPageDynamic />} />
                    <Route path="/bvn-modification-nigeria"  element={<SeoPageDynamic />} />
                    <Route path="/cac-registration-nigeria"  element={<SeoPageDynamic />} />
                    <Route path="/buy-data-nigeria"          element={<SeoPageDynamic />} />
                    <Route path="/buy-airtime-nigeria"       element={<SeoPageDynamic />} />
                    <Route path="/pay-electricity-bill-nigeria" element={<SeoPageDynamic />} />
                    <Route path="/subscribe-cable-tv-nigeria"   element={<SeoPageDynamic />} />
                    <Route path="/buy-exam-pins-nigeria"        element={<SeoPageDynamic />} />

                    {/* ─── Blog — lazy-loaded ─── */}
                    <Route path="/blog"       element={<BlogIndex />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />

                    {/* ─── Static public pages ─── */}
                    <Route path="/"        element={<LandingPage />} />
                    <Route path="/reseller" element={<ResellerPage />} />
                    <Route path="/reseller/callback" element={<ResellerCallback />} />
                    <Route path="/reseller/status/:reference" element={<ResellerStatusPage />} />
                    <Route path="/about"   element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms"   element={<TermsOfService />} />
                    <Route path="*"        element={<NotFound />} />
                </Routes>
            </Suspense>
        </Router>
    );
}
