import React, { useState, useEffect, useCallback } from 'react';
import { Page, User, Notification, Vehicle, Customer, Reservation } from './types.ts';
import { onAuthStateChange, getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getVehicles, getCustomers, getReservations } from './services/api.ts';

import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import Login from './pages/Login.tsx';
import CustomerPortal from './pages/CustomerPortal.tsx';

// Import pages
import Dashboard from './pages/Dashboard.tsx';
import ReservationsPage from './pages/Reservations.tsx';
import VehiclesPage from './pages/Vehicles.tsx';
import CustomersPage from './pages/Customers.tsx';
import ContractsPage from './pages/Contracts.tsx';
import FinancialsPage from './pages/Financials.tsx';
import ReportsPage from './pages/Reports.tsx';

// Import modals
import ReservationFormModal from './components/ReservationFormModal.tsx';
import CustomerFormModal from './components/CustomerFormModal.tsx';
import ReservationDetailModal from './components/ReservationDetailModal.tsx';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    
    // Global data state
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    // Modal states
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [prefilledReservation, setPrefilledReservation] = useState<Partial<Reservation> | null>(null);

    const portalToken = new URLSearchParams(window.location.search).get('portal');

    const loadAllData = useCallback(async () => {
        setDataLoading(true);
        try {
            const [vehiclesData, customersData, reservationsData] = await Promise.all([
                getVehicles(),
                getCustomers(),
                getReservations(),
            ]);
            setVehicles(vehiclesData);
            setCustomers(customersData);
            setReservations(reservationsData);
        } catch (error) {
            console.error("Failed to load app data:", error);
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChange((user) => {
            setUser(user);
            setLoading(false);
            if (user) {
                fetchNotifications();
                loadAllData();
            }
        });
        return () => unsubscribe();
    }, [loadAllData]);

    const fetchNotifications = async () => {
        const notifs = await getNotifications();
        setNotifications(notifs);
    };

    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const handleMarkAllAsRead = async () => {
        await markAllNotificationsAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };
    
    // --- Modal Handlers ---
    const openNewReservationModal = (prefillData: Partial<Reservation> = {}) => {
        setEditingReservation(null);
        setPrefilledReservation(prefillData);
        setIsReservationModalOpen(true);
    };

    const openEditReservationModal = (reservation: Reservation) => {
        setEditingReservation(reservation);
        setPrefilledReservation(null);
        setIsReservationModalOpen(true);
    };

    const openDetailModal = (reservation: Reservation) => {
        setEditingReservation(reservation);
        setIsDetailModalOpen(true);
    };
    
    const openNewCustomerModal = () => {
        setEditingCustomer(null);
        setIsCustomerModalOpen(true);
    };
    
    const openEditCustomerModal = (customer: Customer) => {
        setEditingCustomer(customer);
        setIsCustomerModalOpen(true);
    };

    const handleSave = () => {
        loadAllData();
        setIsReservationModalOpen(false);
        setIsCustomerModalOpen(false);
        setIsDetailModalOpen(false);
    };
    
    const handleCustomerSaveSuccess = (newCustomer: Customer) => {
        loadAllData(); // Reload all data to get the new customer
        setIsCustomerModalOpen(false);
        // If reservation modal is open, we might want to select this new customer
        // This logic can be enhanced if needed
    };


    const renderPage = () => {
        const pageProps = {
            vehicles, customers, reservations, dataLoading,
            onNewReservation: openNewReservationModal,
            onEditReservation: openEditReservationModal,
            onShowDetail: openDetailModal,
            onNewCustomer: openNewCustomerModal,
            onEditCustomer: openEditCustomerModal,
            refreshData: loadAllData,
        };
        switch (currentPage) {
            case Page.DASHBOARD: return <Dashboard {...pageProps} />;
            case Page.RESERVATIONS: return <ReservationsPage {...pageProps} />;
            case Page.VEHICLES: return <VehiclesPage {...pageProps} />;
            case Page.CUSTOMERS: return <CustomersPage {...pageProps} />;
            case Page.CONTRACTS: return <ContractsPage />;
            case Page.FINANCIALS: return <FinancialsPage />;
            case Page.REPORTS: return <ReportsPage {...pageProps}/>;
            default: return <Dashboard {...pageProps} />;
        }
    };
    
    const pageTitles: Record<Page, string> = {
        [Page.DASHBOARD]: 'Přehled',
        [Page.RESERVATIONS]: 'Kalendář rezervací',
        [Page.VEHICLES]: 'Vozový park',
        [Page.CUSTOMERS]: 'Zákazníci',
        [Page.CONTRACTS]: 'Smlouvy',
        [Page.FINANCIALS]: 'Finance',
        [Page.REPORTS]: 'Reporty',
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">Načítání...</div>;
    if (portalToken) return <CustomerPortal token={portalToken} />;
    if (!user) return <Login />;

    return (
        <div className="flex h-screen bg-light-bg">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    title={pageTitles[currentPage]} 
                    notifications={notifications}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    onNotificationClick={(n) => {}}
                />
                <main className="flex-1 overflow-y-auto p-6">
                    {renderPage()}
                </main>
            </div>
            
            <ReservationFormModal
                isOpen={isReservationModalOpen}
                onClose={() => setIsReservationModalOpen(false)}
                onSave={handleSave}
                reservation={editingReservation}
                prefillData={prefilledReservation}
                vehicles={vehicles}
                customers={customers}
                onNewCustomer={openNewCustomerModal}
            />

            <CustomerFormModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSave={handleCustomerSaveSuccess}
                customer={editingCustomer}
            />

            <ReservationDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                onSave={handleSave}
                reservation={editingReservation}
            />

        </div>
    );
};

export default App;
