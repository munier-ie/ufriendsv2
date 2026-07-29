import { LayoutDashboard, User, Wallet, ShieldCheck, DollarSign, Grid3x3 as Grid3X3, LogOut, Landmark as Bank, Landmark, Signal, Smartphone, Ban, PhoneCall, FileText, Crown, Users, ShoppingBag, Bell, Send, Wifi, GraduationCap, Megaphone, BarChart2 as BarChart, Tv, Zap, MessageSquare, Banknote, Tag, Book, Activity, Upload, Calculator as CalculatorIcon, Globe, ArrowRightLeft, Smile, FileEdit, Search, Menu, X, Code, Bot, HelpCircle, Printer, ChevronDown, ChevronRight, Shield } from 'lucide-react';
/* eslint-disable */
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PageMeta from '../seo/PageMeta';

import Logo from '../ui/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import ChatConsultant from '../dashboard/ChatConsultant';

export default function DashboardLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [siteName, setSiteName] = useState('Ufriends');
    const [globalSettings, setGlobalSettings] = useState(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState({
        'Overview': true
    });

    const hasInitializedRef = useRef(false);

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
            if (!hasInitializedRef.current) {
                // Regular users: also open Services by default on first load
                setExpandedCategories(prev => ({ ...prev, 'Services': true }));
                hasInitializedRef.current = true;
            }
            const storedUser = localStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));
            fetchProfile();
            fetchUnreadCount();
        } else {
            navigate('/login');
        }
    }, []);

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
                // Note: page title is now managed by react-helmet-async (PageMeta with noIndex)
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

    // Auto-scroll main content area to top on route change
    useEffect(() => {
        const timer = setTimeout(() => {
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                // Use 'auto' (instant) instead of 'smooth' to prevent jank on page load
                // and timeout to ensure the new page's DOM has fully painted.
                mainContent.scrollTo({ top: 0, behavior: 'auto' });
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [location.pathname, location.search]);

    const isActive = (path) => {
        if (path.includes('?')) {
            const [pathname, search] = path.split('?');
            return location.pathname === pathname && location.search.includes(search);
        }
        return location.pathname === path;
    };

    // Categorized configuration for regular users
    const userCategoriesConfig = [
        {
            title: 'Overview',
            items: [
                { icon: Crown, label: 'Upgrade Account', path: '/dashboard/upgrade' },
                { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
                { icon: User, label: 'Profile', path: '/dashboard/profile' },
            ]
        },
        {
            title: 'Services',
            items: [
                { icon: Wifi, label: 'Data', path: '/dashboard/services?type=data' },
                { icon: PhoneCall, label: 'Airtime', path: '/dashboard/services?type=airtime' },
                { icon: ArrowRightLeft, label: 'Airtime2Cash', path: '/dashboard/airtime2cash' },
                { icon: FileEdit, label: 'BVN Modification', path: '/dashboard/manual-services?tab=BVN_MODIFICATION' },
                { icon: Search, label: 'BVN Retrieval', path: '/dashboard/manual-services?tab=BVN_RETRIEVAL' },
                { icon: FileEdit, label: 'NIN Modification', path: '/dashboard/manual-services?tab=NIN_MODIFICATION' },
                { icon: ShieldCheck, label: 'NIN Validation', path: '/dashboard/manual-services?tab=NIN_VALIDATION' },
                { icon: Shield, label: 'IPE Clearance', path: '/dashboard/manual-services?tab=IPE_CLEARANCE' },
                { icon: Send, label: 'VNIN -> NIBS', path: '/dashboard/manual-services?tab=VNIN_NIBSS' },
                { icon: ShoppingBag, label: 'Exam Pins', path: '/dashboard/exam-pins' },
                { icon: Tag, label: 'Data Pins', path: '/dashboard/data-pins' },
                { icon: Smile, label: 'Smile Data', path: '/dashboard/smile-data' },
            ]
        },
        {
            title: 'Printing Services',
            items: [
                { icon: Printer, label: 'NIN Slip', path: '/dashboard/gov-services?tab=nin' },
                { icon: Printer, label: 'BVN Slip', path: '/dashboard/gov-services?tab=bvn' },
            ]
        },
        {
            title: 'Finance Section',
            items: [
                { icon: Wallet, label: 'Transactions', path: '/dashboard/transactions' },
                { icon: Banknote, label: 'Pricing', path: '/dashboard/pricing' },
                { icon: Landmark, label: 'Banking & Finance', path: '/dashboard/banking-finance' },
                { icon: Bank, label: 'Virtual Account', path: '/dashboard/virtual-accounts' },
            ]
        },
        {
            title: 'Developer Tools',
            items: [
                { icon: Book, label: 'API Docs', path: '/dashboard/api-docs', isVendorOnly: true },
                { icon: Activity, label: 'Analytics', path: '/dashboard/vendor-analytics', isVendorOnly: true },
                { icon: Upload, label: 'Bulk Transactions', path: '/dashboard/bulk-transactions', isVendorOnly: true },
            ]
        },
        {
            title: 'Education & Tools',
            items: [
                { icon: MessageSquare, label: 'Bulk SMS', path: '/dashboard/bulk-sms' },
                { icon: CalculatorIcon, label: 'Calculator', path: '/dashboard/calculator' },
                { icon: Users, label: 'Referrals', path: '/dashboard/referrals' },
                { icon: GraduationCap, label: 'Academy', path: '/dashboard/academy' },
                { icon: Globe, label: 'Become a Reseller', path: '/reseller' },
            ]
        },
        {
            title: 'Support',
            items: [
                { icon: HelpCircle, label: 'Support Center', path: '/dashboard/support' },
            ]
        }
    ];

    // Categorized configuration for Admin users
    const adminCategoriesConfig = [
        {
            title: 'Overview',
            items: [
                { icon: LayoutDashboard, label: 'Admin Home', path: '/admin/dashboard' },
                { icon: BarChart, label: 'Analytics', path: '/admin/dashboard/reports', moduleId: 'reports' },
                { icon: ShoppingBag, label: 'Sales Reports', path: '/admin/dashboard/reports/sales', moduleId: 'reports' },
                { icon: User, label: 'My Account', path: '/admin/dashboard/profile' },
            ]
        },
        {
            title: 'User Management',
            items: [
                { icon: Users, label: 'Users', path: '/admin/dashboard/users', moduleId: 'users' },
                { icon: Wallet, label: 'Transactions', path: '/admin/dashboard/transactions', moduleId: 'transactions' },
                { icon: Users, label: 'System Users', path: '/admin/dashboard/system-users', moduleId: 'system-users' },
                { icon: Smartphone, label: 'Reseller Requests', path: '/admin/dashboard/reseller-requests', moduleId: 'settings' },
                { icon: Landmark, label: 'Virtual Accts', path: '/admin/dashboard/virtual-accounts', moduleId: 'users' },
            ]
        },
        {
            title: 'Routing & Providers',
            items: [
                { icon: Bank, label: 'API Providers', path: '/admin/dashboard/providers', moduleId: 'providers' },
                { icon: Wallet, label: 'API Wallets', path: '/admin/dashboard/api-wallets', moduleId: 'api-wallets' },
                { icon: Bank, label: 'Payment Gateways', path: '/admin/dashboard/settings/payments', moduleId: 'settings' },
                { icon: Bot, label: 'Smart Bot Discovery', path: '/admin/dashboard/bot-plans', moduleId: 'services' },
                { icon: ArrowRightLeft, label: 'Routing Switches', path: '/admin/dashboard/settings/routing', moduleId: 'settings' },
            ]
        },
        {
            title: 'Telecom & Utilities',
            items: [
                { icon: Grid3X3, label: 'Services', path: '/admin/dashboard/services', moduleId: 'services' },
                { icon: Tv, label: 'Cable TV', path: '/admin/dashboard/cable', moduleId: 'services' },
                { icon: Zap, label: 'Electricity', path: '/admin/dashboard/electricity', moduleId: 'services' },
                { icon: Wifi, label: 'Smile Data', path: '/admin/dashboard/smile-plans', moduleId: 'services' },
                { icon: Tag, label: 'Pin Stock', path: '/admin/dashboard/pins', moduleId: 'services' },
            ]
        },
        {
            title: 'Special Services',
            items: [
                { icon: PhoneCall, label: 'Airtime 2 Cash', path: '/admin/dashboard/airtime-cash', moduleId: 'services' },
                { icon: Crown, label: 'Alpha Topup', path: '/admin/dashboard/alpha-topup', moduleId: 'services' },
                { icon: FileText, label: 'CAC Registration', path: '/admin/dashboard/cac', moduleId: 'cac' },
                { icon: FileEdit, label: 'Manual Services', path: '/admin/dashboard/manual-services', moduleId: 'manual-services' },
                { icon: GraduationCap, label: 'Academy', path: '/admin/dashboard/academy', moduleId: 'services' },
            ]
        },
        {
            title: 'Portal & Comms',
            items: [
                { icon: Globe, label: 'Homepage Editor', path: '/admin/dashboard/homepage', moduleId: 'settings' },
                { icon: Send, label: 'Messages', path: '/admin/dashboard/contact', moduleId: 'contact' },
                { icon: Megaphone, label: 'Broadcast', path: '/admin/dashboard/broadcast', moduleId: 'contact' },
            ]
        },
        {
            title: 'System Settings',
            items: [
                { icon: ShieldCheck, label: 'Settings', path: '/admin/dashboard/settings', moduleId: 'settings' },
                { icon: Signal, label: 'Network Config', path: '/admin/dashboard/settings/networks', moduleId: 'settings' },
                { icon: Ban, label: 'Blacklist', path: '/admin/dashboard/settings/blacklist', moduleId: 'settings' },
                { icon: ShieldCheck, label: 'A. Upgrades', path: '/admin/dashboard/settings/upgrades', moduleId: 'settings' },
                { icon: Code, label: 'Software Options', path: '/admin/dashboard/settings/software', moduleId: 'settings' },
                { icon: DollarSign, label: 'Reseller Pricing', path: '/admin/dashboard/settings/reseller-pricing', moduleId: 'settings' },
            ]
        }
    ];

    const toggleCategory = (title) => {
        setExpandedCategories(prev => {
            const nextState = { ...prev };
            const current = Reflect.get(prev, title);
            const willOpen = !current;

            if (willOpen && title !== 'Overview') {
                // Close all other categories except 'Overview' and the clicked title
                Object.keys(nextState).forEach(key => {
                    if (key !== 'Overview' && key !== title) {
                        nextState[key] = false;
                    }
                });
            }

            nextState[title] = willOpen;
            return nextState;
        });
    };

    // Filter and build visible category objects
    const getFilteredCategories = () => {
        let perms = {};
        if (user?.permissions) {
            if (typeof user.permissions === 'string') {
                try { perms = JSON.parse(user.permissions); } catch (e) { }
            } else {
                perms = user.permissions;
            }
        }

        const rawCategories = isAdmin ? adminCategoriesConfig : userCategoriesConfig;

        return rawCategories.map(category => {
            const filteredItems = category.items.filter(item => {
                if (!isAdmin) {
                    if (item.isVendorOnly && user?.accountType !== 'vendor') {
                        return false;
                    }
                    return true;
                }

                if (user?.role === 1) return true; // Super Admin sees all
                if (item.moduleId === 'system-users') return false; // Hidden for non-super admins
                if (item.moduleId && Reflect.get(perms, item.moduleId) === false) {
                    return false;
                }
                return true;
            });

            return {
                ...category,
                items: filteredItems
            };
        }).filter(cat => cat.items.length > 0);
    };

    const categories = getFilteredCategories();

    // Auto-expand active category
    useEffect(() => {
        const activeCat = categories.find(cat =>
            cat.items.some(item => isActive(item.path))
        );
        if (activeCat) {
            setExpandedCategories(prev => {
                const nextState = { ...prev, [activeCat.title]: true };
                if (activeCat.title !== 'Overview') {
                    Object.keys(nextState).forEach(key => {
                        if (key !== 'Overview' && key !== activeCat.title) {
                            nextState[key] = false;
                        }
                    });
                }
                return nextState;
            });
        }
    }, [location.pathname, user]);

    return (
        <div className="flex h-[100dvh] bg-tertiary overflow-hidden">
            {/* noindex: all dashboard/admin pages should not be indexed by search engines */}
            <PageMeta noIndex={true} />
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

                <nav className="flex-1 px-4 space-y-3 mt-4 overflow-y-auto no-scrollbar pb-6">
                    {categories.map((category) => {
                        const isExpanded = !!Reflect.get(expandedCategories, category.title);
                        return (
                            <div key={category.title} className="space-y-1">
                                <button
                                    onClick={() => toggleCategory(category.title)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-primary transition-colors focus:outline-none"
                                >
                                    <span>{category.title}</span>
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>

                                <AnimatePresence initial={false}>
                                    {isExpanded && (
                                        <motion.div
                                            initial="collapsed"
                                            animate="open"
                                            exit="collapsed"
                                            variants={{
                                                open: { opacity: 1, height: "auto" },
                                                collapsed: { opacity: 0, height: 0 }
                                            }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                            className="overflow-hidden space-y-1 pl-2 border-l border-gray-100 ml-2.5"
                                        >
                                            {category.items.map((item) => (
                                                <Link
                                                    key={item.path}
                                                    to={item.path}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${isActive(item.path)
                                                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/25 font-semibold'
                                                        : 'text-gray-600 hover:bg-primary/5 hover:text-primary'
                                                        } `}
                                                >
                                                    <item.icon size={18} />
                                                    <span className="text-sm font-medium">{item.label}</span>
                                                </Link>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100 bg-white">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium"
                    >
                        <LogOut size={20} />
                        <span>{'Logout'}</span>
                    </button>
                </div>
            </aside>

            {/* Main Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                {/* Background Pattern - Crosshatch Art */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        zIndex: -1,
                        backgroundImage: `
repeating-linear-gradient(22.5deg, transparent, transparent 2px, rgba(75, 85, 99, 0.06) 2px, rgba(75, 85, 99, 0.06) 3px, transparent 3px, transparent 8px),
repeating-linear-gradient(67.5deg, transparent, transparent 2px, rgba(107, 114, 128, 0.05) 2px, rgba(107, 114, 128, 0.05) 3px, transparent 3px, transparent 8px),
repeating-linear-gradient(112.5deg, transparent, transparent 2px, rgba(55, 65, 81, 0.04) 2px, rgba(55, 65, 81, 0.04) 3px, transparent 3px, transparent 8px),
repeating-linear-gradient(157.5deg, transparent, transparent 2px, rgba(31, 41, 55, 0.03) 2px, rgba(31, 41, 55, 0.03) 3px, transparent 3px, transparent 8px)
`
                    }}
                />

                {/* Topbar — now separated from scrolling content */}
                <header className="bg-white/80 backdrop-blur-xl border-b border-white/20 p-4 z-10 sticky top-0 flex items-center justify-between shadow-sm shrink-0">
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
                            <h2 className="text-lg font-bold text-gray-800">{'Welcome back, '} {user?.firstName || 'User'}{'!'}</h2>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => setIsChatOpen(true)} 
                            className="relative p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                            title="Chat with Ufriends Assistant"
                        >
                            <Bot size={24} />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full pointer-events-none animate-pulse"></span>
                        </button>
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

                {/* Main Scrolling Content */}
                <main id="main-content" className="flex-1 overflow-auto">

                <div className="p-3 sm:p-6 max-w-7xl mx-auto">
                    <Suspense fallback={
                        <div className="flex items-center justify-center min-h-[300px]">
                            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    }>
                        <Outlet context={{ globalSettings, isChatOpen, setIsChatOpen }} />
                    </Suspense>
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
                            {'Join our community'}
                        </span>
                    </motion.div>
                )}
                </main>
            </div>

            {/* Global AI Consultant Modal */}
            <ChatConsultant
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                whatsappNumber={globalSettings?.contactPhone || '2347026417709'}
            />
        </div>
    );
}
