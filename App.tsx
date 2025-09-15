import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/api.ts';
import { User, Page, Vehicle, Customer, Reservation, Notification as NotificationType } from './types.ts';

import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import Dashboard from './pages/Dashboard.tsx';
import ReservationsPage from './pages/Reservations.tsx';
import VehiclesPage from './pages/Vehicles.tsx';
import CustomersPage from './pages/Customers.tsx';
import Contracts from './pages/Contracts.tsx';
import Financials from './pages/Financials.tsx';
import ReportsPage from './pages/Reports.tsx';
import Login from './pages/Login.tsx';
import CustomerPortal from './pages/CustomerPortal.tsx';
import VehicleFormModal from './components/VehicleFormModal.tsx';
import CustomerFormModal from './components/CustomerFormModal.tsx';
import ReservationFormModal from './components/ReservationFormModal.tsx';
import ReservationDetailModal from './components/ReservationDetailModal.tsx';
import SelfServiceModal from './components/SelfServiceModal.tsx';

import { 
    getVehicles, getCustomers, getReservations, getNotifications,
    markNotificationAsRead, markAllNotificationsAsRead 
} from './services/api.ts';

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);

    // Data states
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [notifications, setNotifications] = useState<NotificationType[]>([]);

    // Modal states
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [prefillReservation, setPrefillReservation] = useState<Partial<Reservation> | null>(null);
    const [isReservationDetailModalOpen, setIsReservationDetailModalOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
    const [isSelfServiceModalOpen, setIsSelfServiceModalOpen] = useState(false);

    const portalToken = new URLSearchParams(window.location.search).get('portal');
    
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setLoading(false);
        };
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setDataLoading(true);
        try {
            const [vehiclesData, customersData, reservationsData, notificationsData] = await Promise.all([
                getVehicles(),
                getCustomers(),
                getReservations(),
                getNotifications(),
            ]);
            setVehicles(vehiclesData);
            setCustomers(customersData);
            setReservations(reservationsData);
            setNotifications(notificationsData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setDataLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, fetchData]);

    const handleNotificationClick = (notification: NotificationType) => {
        if (notification.related_entity?.type === 'reservation') {
            const reservation = reservations.find(r => r.id === notification.related_entity?.id);
            if (reservation) {
                setSelectedReservation(reservation);
                setIsReservationDetailModalOpen(true);
                setCurrentPage(Page.RESERVATIONS);
            }
        }
    };
    
    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id);
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const handleMarkAllAsRead = async () => {
        await markAllNotificationsAsRead();
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    };
    
    const openNewVehicleModal = () => { setEditingVehicle(null); setIsVehicleModalOpen(true); };
    const openEditVehicleModal = (v: Vehicle) => { setEditingVehicle(v); setIsVehicleModalOpen(true); };
    const openNewCustomerModal = () => { setEditingCustomer(null); setIsCustomerModalOpen(true); };
    const openEditCustomerModal = (c: Customer) => { setEditingCustomer(c); setIsCustomerModalOpen(true); };
    const openNewReservationModal = (prefill?: Partial<Reservation>) => { setPrefillReservation(prefill || null); setIsReservationModalOpen(true); };
    const openReservationDetailModal = (r: Reservation) => { setSelectedReservation(r); setIsReservationDetailModalOpen(true); };

    const pageTitles: Record<Page, string> = {
        [Page.DASHBOARD]: "Přehled",
        [Page.RESERVATIONS]: "Kalendář rezervací",
        [Page.VEHICLES]: "Vozový park",
        [Page.CUSTOMERS]: "Zákazníci",
        [Page.CONTRACTS]: "Smlouvy",
        [Page.FINANCIALS]: "Finance",
        [Page.REPORTS]: "Reporty",
    };

    const renderPage = () => {
        switch (currentPage) {
            case Page.DASHBOARD:
                return <Dashboard 
                    reservations={reservations} 
                    vehicles={vehicles} 
                    dataLoading={dataLoading} 
                    onShowReservation={openReservationDetailModal}
                    onNewReservation={openNewReservationModal}
                    onNewCustomer={openNewCustomerModal}
                    onNewVehicle={openNewVehicleModal}
                />;
            case Page.RESERVATIONS:
                return <ReservationsPage vehicles={vehicles} reservations={reservations} dataLoading={dataLoading} onNewReservation={openNewReservationModal} onShowDetail={openReservationDetailModal} />;
            case Page.VEHICLES:
                return <VehiclesPage vehicles={vehicles} dataLoading={dataLoading} onNewVehicle={openNewVehicleModal} onEditVehicle={openEditVehicleModal} />;
            case Page.CUSTOMERS:
                return <CustomersPage customers={customers} dataLoading={dataLoading} onNewCustomer={openNewCustomerModal} onEditCustomer={openEditCustomerModal} />;
            case Page.CONTRACTS:
                return <Contracts />;
            case Page.FINANCIALS:
                return <Financials />;
            case Page.REPORTS:
                return <ReportsPage vehicles={vehicles} customers={customers} reservations={reservations} dataLoading={dataLoading} />;
            default:
                return <Dashboard reservations={reservations} vehicles={vehicles} dataLoading={dataLoading} onShowReservation={openReservationDetailModal} onNewReservation={openNewReservationModal} onNewCustomer={openNewCustomerModal} onNewVehicle={openNewVehicleModal}/>;
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Načítání...</div>;
    }
    
    if (portalToken) {
        return <CustomerPortal token={portalToken} />;
    }

    if (!user) {
        return <Login />;
    }

    return (
        <div className="flex h-screen bg-light-bg">
            <VehicleFormModal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} onSave={fetchData} vehicle={editingVehicle} />
            <CustomerFormModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} onSave={fetchData} customer={editingCustomer} />
            <ReservationFormModal isOpen={isReservationModalOpen} onClose={() => setIsReservationModalOpen(false)} onSave={fetchData} vehicles={vehicles} customers={customers} onNewCustomer={() => { setIsReservationModalOpen(false); openNewCustomerModal(); }} prefillData={prefillReservation}/>
            <ReservationDetailModal isOpen={isReservationDetailModalOpen} onClose={() => setIsReservationDetailModalOpen(false)} onSave={fetchData} reservation={selectedReservation} />
            <SelfServiceModal isOpen={isSelfServiceModalOpen} onClose={() => setIsSelfServiceModalOpen(false)} onLinkGenerated={fetchData} availableVehicles={vehicles.filter(v => v.status === 'available')} />
            
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <main className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    title={pageTitles[currentPage]}
                    notifications={notifications}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    onNotificationClick={handleNotificationClick}
                />
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    {renderPage()}
                </div>
            </main>
        </div>
    );
}

export default App;
