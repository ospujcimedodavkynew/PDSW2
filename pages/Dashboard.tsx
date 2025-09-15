import React, { useMemo } from 'react';
import { Reservation, Vehicle } from '../types.ts';
import { Car, Calendar, Clock, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
    reservations: Reservation[];
    vehicles: Vehicle[];
    dataLoading: boolean;
    onShowReservation: (reservation: Reservation) => void;
    onNewReservation: () => void;
    onNewCustomer: () => void;
    onNewVehicle: () => void;
}

const StatCard: React.FC<{ icon: React.ElementType, title: string, value: string | number, color: string }> = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
        <div className={`p-4 rounded-full ${color}`}>
            <Icon className="w-8 h-8 text-white" />
        </div>
        <div className="ml-4">
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ reservations, vehicles, dataLoading, onShowReservation, onNewReservation, onNewCustomer, onNewVehicle }) => {
    const stats = useMemo(() => {
        const now = new Date();
        const activeRentals = reservations.filter(r => r.status === 'active').length;
        const availableVehicles = vehicles.filter(v => v.status === 'available').length;
        const upcomingReservations = reservations.filter(r => r.status === 'scheduled' && new Date(r.start_date) > now).length;
        return { activeRentals, availableVehicles, upcomingReservations, totalVehicles: vehicles.length };
    }, [reservations, vehicles]);

    const upcomingEvents = useMemo(() => {
        return reservations
            .filter(r => ['scheduled', 'active'].includes(r.status))
            .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
            .slice(0, 5);
    }, [reservations]);
    
    if (dataLoading) {
        return <div>Načítání přehledu...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Car} title="Aktivní pronájmy" value={stats.activeRentals} color="bg-orange-500" />
                <StatCard icon={CheckCircle2} title="Dostupná vozidla" value={`${stats.availableVehicles} / ${stats.totalVehicles}`} color="bg-green-500" />
                <StatCard icon={Calendar} title="Nadcházející rezervace" value={stats.upcomingReservations} color="bg-blue-500" />
                <StatCard icon={Clock} title="Čeká na zákazníka" value={reservations.filter(r => r.status === 'pending-customer').length} color="bg-yellow-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4 text-gray-700">Nadcházející události</h2>
                    <div className="space-y-3">
                        {upcomingEvents.length > 0 ? (
                            upcomingEvents.map(r => (
                                <div key={r.id} onClick={() => onShowReservation(r)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg flex justify-between items-center cursor-pointer">
                                    <div>
                                        <p className="font-semibold">{r.vehicles?.name}</p>
                                        <p className="text-sm text-gray-600">{r.customers?.first_name} {r.customers?.last_name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold text-sm ${r.status === 'active' ? 'text-orange-600' : 'text-blue-600'}`}>{new Date(r.start_date).toLocaleDateString('cs-CZ')} - {new Date(r.end_date).toLocaleDateString('cs-CZ')}</p>
                                        <p className="text-xs text-gray-500">{new Date(r.start_date).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit'})} &rarr; {new Date(r.end_date).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">Žádné nadcházející události.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4 text-gray-700">Rychlé akce</h2>
                    <div className="space-y-3">
                        <button onClick={() => onNewReservation()} className="w-full text-left p-3 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold">Nová rezervace</button>
                        <button onClick={onNewVehicle} className="w-full text-left p-3 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold">Přidat vozidlo</button>
                        <button onClick={onNewCustomer} className="w-full text-left p-3 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold">Přidat zákazníka</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
