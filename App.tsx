
import React, { useState, useEffect } from 'react';
import { supabase } from './services/api';
import { User, Page, Vehicle, Customer, Reservation, Notification } from './types';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import VehiclesPage from './pages/Vehicles';
import CustomersPage from './pages/Customers';
import ReservationsPage from './pages/Reservations';
import Contracts from './pages/Contracts';
import Financials from './pages/Financials';
import ReportsPage from './pages/Reports';
import CustomerPortal from './pages/CustomerPortal';
import VehicleFormModal from './components/VehicleFormModal';
import CustomerFormModal from './components/CustomerFormModal';
import ReservationFormModal from './components/ReservationFormModal';
import ReservationDetailModal from './components/ReservationDetailModal';
import { getVehicles, getCustomers, getReservations, getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from './services/api';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
    
    // Data state
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Modal state
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [prefilledReservation, setPrefilledReservation] = useState<Partial<Reservation> | null>(null);
    const [isReservationDetailOpen, setIsReservationDetailOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

    // Check for customer portal link
    const portalToken = new URLSearchParams(window.location.search).get('portal');
    if (portalToken) {
        return <CustomerPortal token={portalToken} />;
    }

    const fetchData = async () => {
        setDataLoading(true);
        try {
            const [vehiclesData, customersData, reservationsData, notificationsData] = await Promise.all([
                getVehicles(),
                getCustomers(),
                getReservations(),
                getNotifications()
            ]);
            setVehicles(vehiclesData);
            setCustomers(customersData);
            setReservations(reservationsData);
            setNotifications(notificationsData);
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
            // Handle error (e.g., show a toast notification)
        } finally {
            setDataLoading(false);
        }
    };
    
    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setLoading(false);
            if(session?.user) {
                fetchData();
            }
        };

        checkUser();
        
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser as User | null);
            if (currentUser) {
                fetchData();
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const handleOpenVehicleModal = (vehicle: Vehicle | null = null) => {
        setEditingVehicle(vehicle);
        setIsVehicleModalOpen(true);
    };

    const handleOpenCustomerModal = (customer: Customer | null = null) => {
        setEditingCustomer(customer);
        setIsCustomerModalOpen(true);
    };
    
    const handleOpenReservationModal = (prefillData: Partial<Reservation> = {}) => {
        setPrefilledReservation(prefillData);
        setIsReservationModalOpen(true);
    };

    const handleShowReservationDetail = (reservation: Reservation) => {
        setSelectedReservation(reservation);
        setIsReservationDetailOpen(true);
    };

    const handleSave = () => {
        fetchData(); // Refetch all data on any save
    };
    
    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id);
        setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const handleMarkAllAsRead = async () => {
        await markAllNotificationsAsRead();
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    };
    
    const handleNotificationClick = (notification: Notification) => {
        if (notification.related_entity?.type === 'reservation') {
            const reservation = reservations.find(r => r.id === notification.related_entity?.id);
            if (reservation) {
                setCurrentPage(Page.RESERVATIONS);
                handleShowReservationDetail(reservation);
            }
        } else if (notification.related_entity?.type === 'vehicle') {
            setCurrentPage(Page.VEHICLES);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="w-12 h-12 animate-spin"/></div>;
    }

    if (!user) {
        return <Login />;
    }

    const pageTitles: Record<Page, string> = {
        [Page.DASHBOARD]: 'Přehled',
        [Page.RESERVATIONS]: 'Kalendář rezervací',
        [Page.VEHICLES]: 'Vozový park',
        [Page.CUSTOMERS]: 'Zákazníci',
        [Page.CONTRACTS]: 'Smlouvy',
        [Page.FINANCIALS]: 'Finance',
        [Page.REPORTS]: 'Reporty',
    };

    const renderPage = () => {
        switch (currentPage) {
            case Page.DASHBOARD: return <Dashboard vehicles={vehicles} reservations={reservations} customers={customers} dataLoading={dataLoading} onNewReservation={handleOpenReservationModal} onShowReservation={handleShowReservationDetail} />;
            case Page.VEHICLES: return <VehiclesPage vehicles={vehicles} dataLoading={dataLoading} onNewVehicle={() => handleOpenVehicleModal()} onEditVehicle={handleOpenVehicleModal} />;
            case Page.CUSTOMERS: return <CustomersPage customers={customers} dataLoading={dataLoading} onNewCustomer={() => handleOpenCustomerModal()} onEditCustomer={handleOpenCustomerModal} />;
            case Page.RESERVATIONS: return <ReservationsPage vehicles={vehicles} reservations={reservations} dataLoading={dataLoading} onNewReservation={handleOpenReservationModal} onShowDetail={handleShowReservationDetail}/>;
            case Page.CONTRACTS: return <Contracts />;
            case Page.FINANCIALS: return <Financials />;
            case Page.REPORTS: return <ReportsPage vehicles={vehicles} customers={customers} reservations={reservations} dataLoading={dataLoading} />;
            default: return <Dashboard vehicles={vehicles} reservations={reservations} customers={customers} dataLoading={dataLoading} onNewReservation={handleOpenReservationModal} onShowReservation={handleShowReservationDetail}/>;
        }
    };

    return (
        <div className="flex h-screen bg-light-bg">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    title={pageTitles[currentPage]} 
                    notifications={notifications} 
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    onNotificationClick={handleNotificationClick}
                />
                <main className="flex-1 overflow-y-auto p-6">
                    {renderPage()}
                </main>
            </div>
            
            <VehicleFormModal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} onSave={handleSave} vehicle={editingVehicle} />
            <CustomerFormModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} onSave={handleSave} customer={editingCustomer} />
            <ReservationFormModal isOpen={isReservationModalOpen} onClose={() => setIsReservationModalOpen(false)} onSave={handleSave} vehicles={vehicles} customers={customers} prefillData={prefilledReservation}/>
            <ReservationDetailModal isOpen={isReservationDetailOpen} onClose={() => setIsReservationDetailOpen(false)} onSave={handleSave} reservation={selectedReservation} />
        </div>
    );
};

export default App;
