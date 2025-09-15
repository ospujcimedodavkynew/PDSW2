import React, { useState, useEffect, FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
// Fix: Import VehicleStatus to use for type casting.
import { Vehicle, VehicleStatus } from '../types.ts';
import { addVehicle, updateVehicle } from '../services/api.ts';

interface VehicleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (vehicle: Vehicle) => void;
    vehicle?: Vehicle | null;
}

const VehicleFormModal: React.FC<VehicleFormModalProps> = ({ isOpen, onClose, onSave, vehicle }) => {
    const [formData, setFormData] = useState({
        name: '',
        license_plate: '',
        daily_rate: 0,
        rate4h: 0,
        rate12h: 0,
        current_mileage: 0,
        // Fix: Cast the initial status value to VehicleStatus to prevent the type from being inferred as the literal 'available'.
        status: 'available' as VehicleStatus,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (vehicle) {
            setFormData({
                name: vehicle.name,
                license_plate: vehicle.license_plate,
                daily_rate: vehicle.daily_rate,
                rate4h: vehicle.rate4h,
                rate12h: vehicle.rate12h,
                current_mileage: vehicle.current_mileage,
                status: vehicle.status,
            });
        } else {
            setFormData({
                name: '',
                license_plate: '',
                daily_rate: 0,
                rate4h: 0,
                rate12h: 0,
                current_mileage: 0,
                // Fix: Ensure the reset state also has the correct type for status.
                status: 'available' as VehicleStatus,
            });
        }
    }, [vehicle, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: ['daily_rate', 'rate4h', 'rate12h', 'current_mileage'].includes(name) ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
            let savedVehicle;
            if (vehicle) {
                savedVehicle = await updateVehicle(vehicle.id, formData);
            } else {
                savedVehicle = await addVehicle(formData as Omit<Vehicle, 'id'>);
            }
            onSave(savedVehicle);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Uložení se nezdařilo.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{vehicle ? 'Upravit vozidlo' : 'Nové vozidlo'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input name="name" placeholder="Název vozidla" value={formData.name} onChange={handleChange} required className="p-2 border rounded" />
                        <input name="license_plate" placeholder="SPZ" value={formData.license_plate} onChange={handleChange} required className="p-2 border rounded" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <input name="daily_rate" type="number" placeholder="Sazba / den" value={formData.daily_rate} onChange={handleChange} required className="p-2 border rounded" />
                        <input name="rate4h" type="number" placeholder="Sazba / 4h" value={formData.rate4h} onChange={handleChange} required className="p-2 border rounded" />
                        <input name="rate12h" type="number" placeholder="Sazba / 12h" value={formData.rate12h} onChange={handleChange} required className="p-2 border rounded" />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <input name="current_mileage" type="number" placeholder="Stav tachometru" value={formData.current_mileage} onChange={handleChange} required className="p-2 border rounded" />
                        <select name="status" value={formData.status} onChange={handleChange} className="p-2 border rounded bg-white">
                            <option value="available">Dostupné</option>
                            <option value="rented">Půjčené</option>
                            <option value="maintenance">V servisu</option>
                        </select>
                    </div>
                    
                    {error && <p className="text-red-500">{error}</p>}

                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400 flex items-center">
                            {isSaving && <Loader2 className="animate-spin mr-2" />}
                            {isSaving ? 'Ukládám...' : 'Uložit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VehicleFormModal;