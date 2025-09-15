import React from 'react';
import { Vehicle } from '../types.ts';
import { Plus, Car, Wrench, CheckCircle2 } from 'lucide-react';

interface VehiclesPageProps {
    vehicles: Vehicle[];
    dataLoading: boolean;
    onNewVehicle: () => void;
    onEditVehicle: (vehicle: Vehicle) => void;
}

const statusConfig = {
    available: { icon: CheckCircle2, color: 'text-green-600', label: 'Dostupné' },
    rented: { icon: Car, color: 'text-orange-600', label: 'Půjčené' },
    maintenance: { icon: Wrench, color: 'text-yellow-600', label: 'V servisu' }
};

const VehicleCard: React.FC<{ vehicle: Vehicle; onEdit: (vehicle: Vehicle) => void }> = ({ vehicle, onEdit }) => {
    const StatusIcon = statusConfig[vehicle.status].icon;
    const statusColor = statusConfig[vehicle.status].color;
    const statusLabel = statusConfig[vehicle.status].label;

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-primary">{vehicle.name}</h3>
                    <span className={`text-sm font-semibold flex items-center ${statusColor}`}>
                        <StatusIcon className="w-4 h-4 mr-1" /> {statusLabel}
                    </span>
                </div>
                <p className="text-gray-600 font-mono">{vehicle.license_plate}</p>
                <div className="text-gray-500 mt-2 text-sm space-y-1">
                    <p><strong>Denní sazba:</strong> {vehicle.daily_rate.toLocaleString('cs-CZ')} Kč</p>
                    <p><strong>Stav km:</strong> {vehicle.current_mileage.toLocaleString('cs-CZ')} km</p>
                </div>
            </div>
            <button onClick={() => onEdit(vehicle)} className="text-sm text-primary hover:underline mt-4 text-right">
                Upravit
            </button>
        </div>
    );
};

const VehiclesPage: React.FC<VehiclesPageProps> = ({ vehicles, dataLoading, onNewVehicle, onEditVehicle }) => {
    if (dataLoading) return <div>Načítání vozidel...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button onClick={onNewVehicle} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Přidat vozidlo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {vehicles.map(vehicle => (
                    <VehicleCard key={vehicle.id} vehicle={vehicle} onEdit={onEditVehicle} />
                ))}
            </div>
             {vehicles.length === 0 && (
                 <div className="text-center py-12 bg-white rounded-lg shadow-md">
                    <p className="text-gray-500">Zatím nebyla přidána žádná vozidla.</p>
                </div>
            )}
        </div>
    );
};

export default VehiclesPage;
