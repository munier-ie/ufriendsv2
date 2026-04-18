import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LayoutDashboard from 'lucide-react/dist/esm/icons/layout-dashboard';
import User from 'lucide-react/dist/esm/icons/user';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import Grid3X3 from 'lucide-react/dist/esm/icons/grid-3x3';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import Bank from 'lucide-react/dist/esm/icons/landmark'; // Alias for Bank usages
import Landmark from 'lucide-react/dist/esm/icons/landmark'; // For Landmark usages
import Signal from 'lucide-react/dist/esm/icons/signal';
import Ban from 'lucide-react/dist/esm/icons/ban';
import PhoneCall from 'lucide-react/dist/esm/icons/phone-call';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Crown from 'lucide-react/dist/esm/icons/crown';
import Users from 'lucide-react/dist/esm/icons/users';
import ShoppingBag from 'lucide-react/dist/esm/icons/shopping-bag';
import Bell from 'lucide-react/dist/esm/icons/bell';
import Send from 'lucide-react/dist/esm/icons/send';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import Megaphone from 'lucide-react/dist/esm/icons/megaphone';
import BarChart from 'lucide-react/dist/esm/icons/bar-chart-2';
import Tv from 'lucide-react/dist/esm/icons/tv';
import Zap from 'lucide-react/dist/esm/icons/zap';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Banknote from 'lucide-react/dist/esm/icons/banknote';
import Tag from 'lucide-react/dist/esm/icons/tag';
import Book from 'lucide-react/dist/esm/icons/book';
import Activity from 'lucide-react/dist/esm/icons/activity';
import Upload from 'lucide-react/dist/esm/icons/upload';
import CalculatorIcon from 'lucide-react/dist/esm/icons/calculator';
import Globe from 'lucide-react/dist/esm/icons/globe';
import ArrowRightLeft from 'lucide-react/dist/esm/icons/arrow-right-left';
import Smile from 'lucide-react/dist/esm/icons/smile';
import FileEdit from 'lucide-react/dist/esm/icons/file-edit';
import Menu from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';
import Code from 'lucide-react/dist/esm/icons/code';
import Bot from 'lucide-react/dist/esm/icons/bot';
import HelpCircle from 'lucide-react/dist/esm/icons/help-circle';
import Logo from '../ui/Logo';
import { motion } from 'framer-motion';

export default function DashboardLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [siteName, setSiteName] = useState('Ufriends');
    const [globalSettings, setGlobalSettings] = useState(null);

    useEffect(() => {
        const adminToken = localStorage.getItem('adminToken');
        const token = localStorage.getItem('token');

        fetchGlobalSettings();

        if (adminToken) {
            setIsAdmin(true);
            const adminUser = localStorage.getItem('adminUser');
            if (adminUser) setUser(JSON.parse(adminUser));
            fetchAdminProfile();
        } else if (token) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));
            fetchProfile();
            fetchUnreadCount();
        } else {
            navigate('/login');
        }
    }, [location.pathname]);

    const fetchGlobalSettings = async () => {
        try {
            // Use public settings endpoint for branding
            const res = await axios.get('/api/admin/config/public-settings');
            const { settings } = res.data;
            if (settings) {
                setGlobalSettings(settings);
                setSiteName(settings.siteName || 'Ufriends');
                // Apply visual theme
                if (settings.primaryColor) {
                    document.documentElement.style.setProperty('--primary', settings.primaryColor);
                }
                if (settings.secondaryColor) {
                    document.documentElement.style.setProperty('--secondary', settings.secondaryColor);
                }
                // Update branding
                if (settings.faviconUrl) {
                    const favicon = document.querySelector('link[rel="icon"]');
                    if (favicon) favicon.href = settings.faviconUrl;
                }
                // Dynamic page title per route could be done here too
                document.title = settings.siteName || 'Ufriends 2.0';
            }
        } catch (error) {
            console.error('Failed to fetch site settings', error);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadNotifications(res.data.unreadCount);
        } catch (error) {
            console.error('Failed to fetch unread count', error);
        }
    };

    const fetchAdminProfile = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) return;
            const res = await axios.get('/api/admin/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data.admin);
            localStorage.setItem('adminUser', JSON.stringify(res.data.admin));
        } catch (error) {
            console.error('Failed to fetch admin profile', error);
        }
    };

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get('/api/user/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
        } catch (error) {
            console.error('Failed to fetch profile', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate(isAdmin ? '/admin/login' : '/login');
    };

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const isActive = (path) => location.pathname === path;

    const userSidebarItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Banknote, label: 'Pricing', path: '/dashboard/pricing' },
        { icon: Crown, label: 'Upgrade Account', path: '/dashboard/upgrade' },
        { icon: Users, label: 'Referrals', path: '/dashboard/referrals' },
        { icon: Grid3X3, label: 'Services', path: '/dashboard/services' },
        { icon: Wallet, label: 'Transactions', path: '/dashboard/transactions' },
        { icon: ShieldCheck, label: 'Verification', path: '/dashboard/verify' },
        { icon: Bank, label: 'Virtual Accounts', path: '/dashboard/virtual-accounts' },
        { icon: Landmark, label: 'Banking & Finance', path: '/dashboard/banking-finance' },
        { icon: Landmark, label: 'Gov Services', path: '/dashboard/gov-services' },
        { icon: Tag, label: 'Data PINs', path: '/dashboard/data-pins' },
        { icon: ShoppingBag, label: 'Exam PINs', path: '/dashboard/exam-pins' },
        { icon: Smile, label: 'Smile Data', path: '/dashboard/smile-data' },
        { icon: MessageSquare, label: 'Bulk SMS', path: '/dashboard/bulk-sms' },
        { icon: ArrowRightLeft, label: 'Sell Airtime', path: '/dashboard/sell-pin' },
        { icon: CalculatorIcon, label: 'Calculator', path: '/dashboard/calculator' },
        { icon: Globe, label: 'Reseller Website', path: '/dashboard/reseller' },
        { icon: FileEdit, label: 'Manual Services', path: '/dashboard/manual-services' },
        { icon: GraduationCap, label: 'Academy', path: '/dashboard/academy' },
        { icon: HelpCircle, label: 'Support Center', path: '/dashboard/support' },
        { icon: User, label: 'Profile', path: '/dashboard/profile' },
    ];

    // Vendor-specific navigation items
    const vendorSidebarItems = [
        { icon: Book, label: 'API Docs', path: '/dashboard/api-docs' },
        { icon: Activity, label: 'Analytics', path: '/dashboard/vendor-analytics' },
        { icon: Upload, label: 'Bulk Transactions', path: '/dashboard/bulk-transactions' },
    ];

    const adminSidebarItems = [
        { icon: LayoutDashboard, label: 'Admin Home', path: '/admin/dashboard' },
        { icon: Users, label: 'Users', path: '/admin/dashboard/users', moduleId: 'users' },
        { icon: Grid3X3, label: 'Services', path: '/admin/dashboard/services', moduleId: 'services' },
        { icon: Bank, label: 'API Providers', path: '/admin/dashboard/providers', moduleId: 'providers' },
        { icon: Bot, label: 'Smart Bot Discovery', path: '/admin/dashboard/bot-plans', moduleId: 'services' },
        { icon: Wallet, label: 'Transactions', path: '/admin/dashboard/transactions', moduleId: 'transactions' },
        { icon: ShoppingBag, label: 'Sales Reports', path: '/admin/dashboard/reports/sales', moduleId: 'reports' },
        { icon: Globe, label: 'Homepage Editor', path: '/admin/dashboard/homepage', moduleId: 'settings' },
        { icon: ShieldCheck, label: 'Settings', path: '/admin/dashboard/settings', moduleId: 'settings' },
        { icon: Bank, label: 'Payment Gateways', path: '/admin/dashboard/settings/payments', moduleId: 'settings' },
        { icon: Signal, label: 'Network Config', path: '/admin/dashboard/settings/networks', moduleId: 'settings' },
        { icon: Ban, label: 'Blacklist', path: '/admin/dashboard/settings/blacklist', moduleId: 'settings' },
        { icon: Users, label: 'System Users', path: '/admin/dashboard/system-users', moduleId: 'system-users' },
        { icon: Wallet, label: 'API Wallets', path: '/admin/dashboard/api-wallets', moduleId: 'api-wallets' },
        { icon: PhoneCall, label: 'Airtime 2 Cash', path: '/admin/dashboard/airtime-cash', moduleId: 'services' },
        { icon: Crown, label: 'Alpha Topup', path: '/admin/dashboard/alpha-topup', moduleId: 'services' },
        { icon: FileText, label: 'CAC Registration', path: '/admin/dashboard/cac', moduleId: 'cac' },
        { icon: Send, label: 'Messages', path: '/admin/dashboard/contact', moduleId: 'contact' },
        { icon: Wifi, label: 'Smile Data', path: '/admin/dashboard/smile-plans', moduleId: 'services' },
        { icon: GraduationCap, label: 'Exam Pins', path: '/admin/dashboard/exam-pins', moduleId: 'services' },
        { icon: Tag, label: 'Pin Stock', path: '/admin/dashboard/pins', moduleId: 'services' },
        { icon: Users, label: 'Referrals', path: '/admin/dashboard/referrals', moduleId: 'users' },
        { icon: ShieldCheck, label: 'A. Upgrades', path: '/admin/dashboard/settings/upgrades', moduleId: 'settings' },
        { icon: Code, label: 'Software Options', path: '/admin/dashboard/settings/software', moduleId: 'settings' },
        { icon: ArrowRightLeft, label: 'Routing Switches', path: '/admin/dashboard/settings/routing', moduleId: 'settings' },
        { icon: Megaphone, label: 'Broadcast', path: '/admin/dashboard/broadcast', moduleId: 'contact' },
        { icon: BarChart, label: 'Analytics', path: '/admin/dashboard/reports', moduleId: 'reports' },
        { icon: Tv, label: 'Cable TV', path: '/admin/dashboard/cable', moduleId: 'services' },
        { icon: Zap, label: 'Electricity', path: '/admin/dashboard/electricity', moduleId: 'services' },
        { icon: MessageSquare, label: 'Bulk SMS', path: '/admin/dashboard/sms', moduleId: 'services' },
        { icon: Landmark, label: 'Virtual Accts', path: '/admin/dashboard/virtual-accounts', moduleId: 'users' },
        { icon: FileEdit, label: 'Manual Services', path: '/admin/dashboard/manual-services', moduleId: 'manual-services' },
        { icon: GraduationCap, label: 'Academy', path: '/admin/dashboard/academy', moduleId: 'services' },
        { icon: User, label: 'My Account', path: '/admin/dashboard/profile' },
    ];

    const getFilteredAdminItems = () => {
        let perms = {};
        if (user?.permissions) {
            if (typeof user.permissions === 'string') {
                try { perms = JSON.parse(user.permissions); } catch (e) { }
            } else {
                perms = user.permissions;
            }
        }

        return adminSidebarItems.filter(item => {
            if (user?.role === 1) return true; // Super Admin sees all

            if (item.moduleId === 'system-users') return false; // Hidden for non-super admins
            
            if (item.moduleId && perms[item.moduleId] === false) {
                return false;
            }

            return true;
        });
    };

    const sidebarItems = isAdmin
        ? getFilteredAdminItems()
        : (user?.accountType === 'vendor' ? [...userSidebarItems, ...vendorSidebarItems] : userSidebarItems);

    return (
        <div className="flex h-[100dvh] bg-tertiary overflow-hidden">
            {/* Mobile Sidebar Overlay — must sit above topbar (z-30) but managed with sidebar */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar — z-40 so it sits above the overlay on mobile and above topbar always */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col md:relative md:translate-x-0 md:z-auto ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Logo className="w-8 h-8" />
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            {siteName}
                        </span>
                    </div>
                    {/* Close button for mobile inside sidebar */}
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 md:hidden"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto no-scrollbar">
                    {sidebarItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive(item.path)
                                ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25'
                                : 'text-gray-600 hover:bg-primary/5 hover:text-primary'
                                } `}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100 bg-white">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative">
                {/* Background Pattern - Crosshatch Art */}
                <div
                    className="fixed inset-0 -z-10 pointer-events-none"
                    style={{
                        backgroundImage: `
repeating - linear - gradient(22.5deg, transparent, transparent 2px, rgba(75, 85, 99, 0.06) 2px, rgba(75, 85, 99, 0.06) 3px, transparent 3px, transparent 8px),
    repeating - linear - gradient(67.5deg, transparent, transparent 2px, rgba(107, 114, 128, 0.05) 2px, rgba(107, 114, 128, 0.05) 3px, transparent 3px, transparent 8px),
    repeating - linear - gradient(112.5deg, transparent, transparent 2px, rgba(55, 65, 81, 0.04) 2px, rgba(55, 65, 81, 0.04) 3px, transparent 3px, transparent 8px),
    repeating - linear - gradient(157.5deg, transparent, transparent 2px, rgba(31, 41, 55, 0.03) 2px, rgba(31, 41, 55, 0.03) 3px, transparent 3px, transparent 8px)
        `,
                    }}
                />

                {/* Topbar — z-20 keeps it above page content when scrolling, but below modal overlays (z-50) */}
                <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 p-4 sticky top-0 z-20 flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100 md:hidden transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        <Logo className="w-8 h-8 md:hidden" />
                        <span className="text-xl font-bold text-primary md:hidden">{siteName}</span>
                        <div className="hidden md:block">
                            <h2 className="text-lg font-bold text-gray-800">Welcome back, {user?.firstName || 'User'}!</h2>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <Link to="/dashboard/notifications" className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                            <Bell size={24} />
                            {unreadNotifications > 0 && (
                                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                </span>
                            )}
                        </Link>
                    </div>
                </header>
                <div className="p-3 sm:p-6 max-w-7xl mx-auto">
                    <Outlet context={{ globalSettings }} />
                </div>
                
                {/* Floating WhatsApp Group Icon */}
                {globalSettings?.whatsappGroupLink && !isAdmin && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50 }}
                        className="flex items-center justify-center group cursor-grab active:cursor-grabbing"
                    >
                        <a
                            href={globalSettings.whatsappGroupLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            draggable={false}
                            className="bg-green-500 text-white p-4 rounded-full shadow-2xl hover:bg-green-600 transition-all flex items-center justify-center pointer-events-auto"
                            title="Join our WhatsApp Group"
                        >
                            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                            </svg>
                        </a>
                        <span className="absolute right-full mr-4 bg-gray-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Join our community
                        </span>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
