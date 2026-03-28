import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import BulkSMS from './pages/dashboard/BulkSMS';
import SellPin from './pages/dashboard/SellPin';
import Reseller from './pages/dashboard/Reseller';
import NotFound from './pages/NotFound';

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
import SoftwareOptionManagement from './pages/dashboard/admin/SoftwareOptionManagement';
import ProviderSwitch from './pages/dashboard/admin/ProviderSwitch';

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
                    <Route path="airtime-cash" element={<SellPin />} />
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
                    <Route path="sell-pin" element={<SellPin />} />
                    <Route path="reseller" element={<Reseller />} />
                    <Route path="manual-services" element={<ManualServices />} />
                    <Route path="academy" element={<Academy />} />
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
                    <Route path="settings/routing" element={<ProviderSwitch />} />
                    <Route path="academy" element={<AcademyDashboard />} />
                </Route>

                {/* Default Redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
}
