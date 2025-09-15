import React, { useMemo, useState } from 'react';
import { Vehicle, Reservation, Customer } from '../types';
import { Car, Calendar, Users, Plus, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import SelfServiceModal from '../components/SelfServiceModal';

interface DashboardPageProps {
    vehicles: Vehicle[];
    reservations: Reservation[];
    customers: Customer[];
    dataLoading: boolean;
    onNewReservation: (prefillData: Partial<Reservation>) => void;
    onShowReservation: (reservation: Reservation) => void;
}

const Dashboard: React.FC<DashboardPageProps> = ({ vehicles, reservations, customers, dataLoading, onNewReservation, onShowReservation }) => {
    const [isSelfServiceModalOpen, setIsSelfServiceModalOpen] = useState(false);
    
    const stats = useMemo(() => {
        const availableVehicles = vehicles.filter(v => v.status === 'available').length;
        const activeReservations = reservations.filter(r => r.status === 'active').length;
        const customerCount = customers.length;
        return { availableVehicles, activeReservations, customerCount };
    }, [vehicles, reservations, customers]);

    const upcomingReservations = useMemo(() => {
        const now = new Date();
        return reservations
            .filter(r => (r.status === 'scheduled' || r.status === 'active') && new Date(r.start_date) >= now)
            .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
            .slice(0, 5);
    }, [reservations]);
    
    const vehiclesNeedingAttention = useMemo(() => {
        return vehicles.filter(v => v.status === 'maintenance');
    }, [vehicles]);


    if (dataLoading) {
        return <div>Načítání přehledu...</div>;
    }

    return (
        <div className="space-y-8">
            <SelfServiceModal 
                isOpen={isSelfServiceModalOpen}
                onClose={() => setIsSelfServiceModalOpen(false)}
                availableVehicles={vehicles.filter(v => v.status === 'available')}
                onLinkGenerated={() => { /* Could refetch data here if needed */ }}
            />
            {/* Quick Actions */}
            <div className="flex space-x-4">
                <button onClick={() => onNewReservation({})} className="flex-1 bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center">
                    <Plus className="w-5 h-5 mr-2" /> Vytvořit rezervaci
                </button>
                 <button onClick={() => setIsSelfServiceModalOpen(true)} className="flex-1 bg-secondary text-white font-bold py-3 px-4 rounded-lg hover:bg-secondary-hover transition-colors flex items-center justify-center">
                    <LinkIcon className="w-5 h-5 mr-2" /> Samoobslužný link
                </button>
            </div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 rounded-full bg-blue-100"><Car className="w-8 h-8 text-blue-700"/></div>
                    <div className="ml-4">
                        <p className="text-3xl font-bold text-gray-800">{stats.availableVehicles}</p>
                        <p className="text-sm text-gray-500 font-medium">Vozidel k dispozici</p>
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 rounded-full bg-orange-100"><Calendar className="w-8 h-8 text-orange-700"/></div>
                    <div className="ml-4">
                        <p className="text-3xl font-bold text-gray-800">{stats.activeReservations}</p>
                        <p className="text-sm text-gray-500 font-medium">Aktivních rezervací</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
                    <div className="p-4 rounded-full bg-green-100"><Users className="w-8 h-8 text-green-700"/></div>
                    <div className="ml-4">
                        <p className="text-3xl font-bold text-gray-800">{stats.customerCount}</p>
                        <p className="text-sm text-gray-500 font-medium">Zákazníků celkem</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upcoming Reservations */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4 text-gray-700">Nadcházející rezervace</h2>
                    <div className="space-y-3">
                        {upcomingReservations.length > 0 ? upcomingReservations.map(res => (
                            <div key={res.id} onClick={() => onShowReservation(res)} className="p-3 bg-gray-50 rounded-md flex justify-between items-center cursor-pointer hover:bg-gray-100">
                                <div>
                                    <p className="font-semibold">{res.customers?.first_name} {res.customers?.last_name}</p>
                                    <p className="text-sm text-gray-600">{res.vehicles?.name}</p>
                                </div>
                                <div className="text-right">
                                     <p className="font-semibold text-sm">{new Date(res.start_date).toLocaleDateString('cs-CZ')}</p>
                                     <p className="text-xs text-gray-500">{new Date(res.start_date).toLocaleTimeString('cs-CZ', {hour: '2-digit', minute:'2-digit'})}</p>
                                </div>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center py-4">Žádné nadcházející rezervace.</p>
                        )}
                    </div>
                </div>
                 {/* Attention Needed */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                     <h2 className="text-xl font-bold mb-4 text-gray-700 flex items-center"><AlertTriangle className="text-yellow-500 mr-2"/>Vyžaduje pozornost</h2>
                     <div className="space-y-3">
                         {vehiclesNeedingAttention.length > 0 ? vehiclesNeedingAttention.map(v => (
                            <div key={v.id} className="p-3 bg-yellow-50 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{v.name}</p>
                                    <p className="text-sm text-yellow-700">Vozidlo je ve stavu 'V servisu'</p>
                                </div>
                            </div>
                         )) : (
                             <p className="text-gray-500 text-center py-4">Žádné položky nevyžadují pozornost.</p>
                         )}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
