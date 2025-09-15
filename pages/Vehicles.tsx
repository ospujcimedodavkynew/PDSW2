import React, { useState, useMemo } from 'react';
import { Vehicle, VehicleStatus } from '../types.ts';
import { Car, Wrench, CheckCircle, Search } from 'lucide-react';

const statusConfig: Record<VehicleStatus, { text: string; color: string; icon: React.ElementType }> = {
    available: { text: 'K dispozici', color: 'text-green-600', icon: CheckCircle },
    rented: { text: 'Pronajato', color: 'text-orange-500', icon: Car },
    maintenance: { text: 'V servisu', color: 'text-gray-500', icon: Wrench },
};

const VehicleCard: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
    const { icon: Icon, text, color } = statusConfig[vehicle.status];
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105">
            <img src={vehicle.image_url || 'https://placehold.co/600x400/1E40AF/white?text=Vozidlo'} alt={vehicle.name} className="w-full h-48 object-cover" />
            <div className="p-4">
                <h3 className="text-xl font-bold">{vehicle.name}</h3>
                <p className="text-gray-500">{vehicle.license_plate}</p>
                <div className="flex justify-between items-center mt-4">
                    <span className={`flex items-center text-sm font-semibold ${color}`}>
                        <Icon className="w-4 h-4 mr-2" />
                        {text}
                    </span>
                    <span className="text-lg font-bold text-primary">{vehicle.daily_rate.toLocaleString('cs-CZ')} Kč/den</span>
                </div>
            </div>
        </div>
    );
};

interface VehiclesPageProps {
    vehicles: Vehicle[];
    dataLoading: boolean;
}

const VehiclesPage: React.FC<VehiclesPageProps> = ({ vehicles, dataLoading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all');

    const filteredVehicles = useMemo(() => {
        return vehicles.filter(v => {
            const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  v.license_plate.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = statusFilter === 'all' || v.status === statusFilter;
            return matchesSearch && matchesFilter;
        });
    }, [vehicles, searchTerm, statusFilter]);

    if (dataLoading) return <div>Načítání vozidel...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-1/3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Hledat podle názvu nebo SPZ..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border rounded-md"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 rounded-md text-sm ${statusFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-200'}`}>Vše</button>
                    <button onClick={() => setStatusFilter('available')} className={`px-4 py-2 rounded-md text-sm ${statusFilter === 'available' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>Dostupné</button>
                    <button onClick={() => setStatusFilter('rented')} className={`px-4 py-2 rounded-md text-sm ${statusFilter === 'rented' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}>Pronajaté</button>
                    <button onClick={() => setStatusFilter('maintenance')} className={`px-4 py-2 rounded-md text-sm ${statusFilter === 'maintenance' ? 'bg-gray-500 text-white' : 'bg-gray-200'}`}>V servisu</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredVehicles.map(vehicle => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
            </div>
            {filteredVehicles.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                    <p className="text-gray-500">Nebyly nalezeny žádné vozidla odpovídající filtrům.</p>
                </div>
            )}
        </div>
    );
};

export default VehiclesPage;
