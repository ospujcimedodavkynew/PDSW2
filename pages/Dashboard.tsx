import React from 'react';
import { Vehicle, Reservation } from '../types.ts';
import { Car, CheckCircle, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Fix: Added props interface to accept data from App.tsx.
interface DashboardProps {
    vehicles: Vehicle[];
    reservations: Reservation[];
    dataLoading: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ vehicles, reservations, dataLoading }) => {
    // Fix: Removed internal state and useEffect for data fetching. Data is now passed via props.
    if (dataLoading) {
        return <div className="text-center p-8">Načítám data...</div>;
    }

    const availableVehicles = vehicles.filter(v => v.status === 'available').length;
    const rentedVehicles = vehicles.filter(v => v.status === 'rented').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
    
    const fleetStatusData = [
        { name: 'Dostupné', value: availableVehicles },
        { name: 'Pronajaté', value: rentedVehicles },
        { name: 'V servisu', value: maintenanceVehicles },
    ];
    const COLORS = ['#16A34A', '#F97316', '#64748B'];

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    const todaysDepartures = reservations.filter(r => {
        const startDate = new Date(r.start_date);
        return startDate >= todayStart && startDate <= todayEnd && r.status === 'scheduled';
    });

    const activeReservations = reservations.filter(r => r.status === 'active');

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow flex items-center">
                    <Car className="w-10 h-10 text-primary mr-4" />
                    <div>
                        <h2 className="text-lg font-semibold text-gray-600">Celkem vozidel</h2>
                        <p className="text-3xl font-bold text-primary mt-1">{vehicles.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow flex items-center">
                    <CheckCircle className="w-10 h-10 text-green-600 mr-4" />
                    <div>
                        <h2 className="text-lg font-semibold text-gray-600">Dostupných</h2>
                        <p className="text-3xl font-bold text-green-600 mt-1">{availableVehicles}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow flex items-center">
                    <Clock className="w-10 h-10 text-orange-500 mr-4" />
                    <div>
                        <h2 className="text-lg font-semibold text-gray-600">Pronajatých</h2>
                        <p className="text-3xl font-bold text-orange-500 mt-1">{rentedVehicles}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow flex items-center">
                    <p className="text-3xl font-bold text-red-600 mt-2">{todaysDepartures.length}</p>
                    <h2 className="text-lg font-semibold text-gray-600 ml-3">Dnešních odjezdů</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-bold mb-4 text-center">Stav flotily</h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={fleetStatusData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name" label={(entry) => `${entry.name}: ${entry.value}`}>
                                {fleetStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
                     <h2 className="text-xl font-bold mb-4">Probíhající pronájmy</h2>
                     <div className="overflow-y-auto h-64">
                        {activeReservations.length > 0 ? (
                             <ul className="space-y-3">
                                {activeReservations.map(res => (
                                    <li key={res.id} className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{res.vehicles?.name} ({res.vehicles?.license_plate})</p>
                                            <p className="text-sm text-gray-600">{res.customers?.first_name} {res.customers?.last_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm">Návrat:</p>
                                            <p className="font-medium">{new Date(res.end_date).toLocaleDateString('cs-CZ')}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 pt-10 text-center">Aktuálně nejsou žádné probíhající pronájmy.</p>
                        )}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;