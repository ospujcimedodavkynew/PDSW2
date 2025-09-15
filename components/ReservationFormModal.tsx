import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { Reservation, Vehicle, Customer } from '../types.ts';
import { createReservationWithContract } from '../services/api.ts';

interface ReservationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    onNewCustomer: () => void;
    reservation?: Reservation | null;
    prefillData?: Partial<Reservation> | null;
    vehicles: Vehicle[];
    customers: Customer[];
}

const ReservationFormModal: React.FC<ReservationFormModalProps> = ({ isOpen, onClose, onSave, onNewCustomer, reservation, prefillData, vehicles, customers }) => {
    const [vehicleId, setVehicleId] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [totalPrice, setTotalPrice] = useState(0);
    const [agreed, setAgreed] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableVehicles = useMemo(() => vehicles.filter(v => v.status === 'available'), [vehicles]);

    useEffect(() => {
        if (isOpen) {
            const initialStartDate = prefillData?.start_date ? new Date(prefillData.start_date) : new Date();
            setStartDate(initialStartDate);
            setEndDate(new Date(initialStartDate.getTime() + 24 * 60 * 60 * 1000)); // Default to 1 day
            setVehicleId(prefillData?.vehicle_id || '');
            setCustomerId('');
            setAgreed(false);
            setError(null);
        }
    }, [isOpen, prefillData]);
    
    useEffect(() => {
        // Recalculate price when vehicle or dates change
        const selectedVehicle = vehicles.find(v => v.id === vehicleId);
        if (selectedVehicle) {
            const diffTime = endDate.getTime() - startDate.getTime();
            const diffHours = diffTime / (1000 * 60 * 60);
            
            if (diffHours <= 4) setTotalPrice(selectedVehicle.rate4h);
            else if (diffHours <= 12) setTotalPrice(selectedVehicle.rate12h);
            else {
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                setTotalPrice(diffDays * selectedVehicle.daily_rate);
            }
        } else {
            setTotalPrice(0);
        }
    }, [vehicleId, startDate, endDate, vehicles]);

    const setRentalDuration = (type: 'hours' | 'days', value: number) => {
        const newEndDate = new Date(startDate);
        if (type === 'hours') {
            newEndDate.setHours(newEndDate.getHours() + value);
        } else {
            newEndDate.setDate(newEndDate.getDate() + value);
        }
        setEndDate(newEndDate);
    };

    const getContractText = () => {
        const customer = customers.find(c => c.id === customerId);
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!customer || !vehicle) return "Chybí údaje pro generování smlouvy.";
        // Simple template
        return `
SMLOUVA O PRONÁJMU VOZIDLA

Pronajímatel: Van Rental Pro
Nájemce: ${customer.first_name} ${customer.last_name}, Adresa: ${customer.address}, ŘP: ${customer.driver_license_number}
Vozidlo: ${vehicle.name}, SPZ: ${vehicle.license_plate}

Datum a čas pronájmu: od ${startDate.toLocaleString('cs-CZ')} do ${endDate.toLocaleString('cs-CZ')}
Cena: ${totalPrice.toLocaleString('cs-CZ')} Kč
Denní limit: 300 km. Poplatek za překročení: 3 Kč/km.

Podpisem nájemce souhlasí s obchodními podmínkami.
Digitálně podepsáno dne: ${new Date().toLocaleString('cs-CZ')}
        `;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerId || !vehicleId || !agreed) {
            setError("Vyplňte všechna pole a potvrďte souhlas.");
            return;
        }
        setIsSaving(true);
        setError(null);

        const customer = customers.find(c => c.id === customerId);
        const vehicle = vehicles.find(v => v.id === vehicleId);

        try {
            await createReservationWithContract(
                {
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    vehicle_id: vehicleId,
                    customer_id: customerId,
                    total_price: totalPrice
                },
                getContractText(),
                customer!,
                vehicle!
            );
            onSave();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Vytvoření rezervace se nezdařilo.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Nová rezervace</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium">Zákazník</label>
                             <div className="flex items-center gap-2">
                                <select value={customerId} onChange={e => setCustomerId(e.target.value)} required className="w-full p-2 border rounded bg-white">
                                    <option value="">-- Vybrat zákazníka --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                                </select>
                                <button type="button" onClick={onNewCustomer} className="p-2 bg-gray-200 rounded hover:bg-gray-300"><Plus/></button>
                             </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Vozidlo</label>
                            <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required className="w-full p-2 border rounded bg-white">
                                <option value="">-- Vybrat vozidlo --</option>
                                {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.license_plate})</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Začátek pronájmu</label>
                        <input type="datetime-local" value={startDate.toISOString().substring(0, 16)} onChange={e => setStartDate(new Date(e.target.value))} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Délka pronájmu</label>
                        <div className="flex space-x-2 mt-1">
                            <button type="button" onClick={() => setRentalDuration('hours', 4)} className="px-3 py-1 bg-gray-200 rounded">4 hod</button>
                            <button type="button" onClick={() => setRentalDuration('hours', 12)} className="px-3 py-1 bg-gray-200 rounded">12 hod</button>
                            <input type="number" min="1" max="30" onChange={e => setRentalDuration('days', parseInt(e.target.value))} placeholder="Dny" className="p-1 border rounded w-20" />
                        </div>
                        <p className="text-sm mt-2">Konec pronájmu: <strong>{endDate.toLocaleString('cs-CZ')}</strong></p>
                    </div>
                     <div className="bg-blue-50 p-4 rounded-lg text-right">
                        <span className="text-lg font-bold">Celková cena: {totalPrice.toLocaleString('cs-CZ')} Kč</span>
                    </div>

                    <div>
                        <h3 className="font-bold mb-2">Náhled smlouvy</h3>
                        <div className="bg-gray-100 p-2 rounded max-h-24 overflow-y-auto text-xs">
                            <pre className="whitespace-pre-wrap">{getContractText()}</pre>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input type="checkbox" id="agree" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="h-4 w-4" />
                        <label htmlFor="agree" className="ml-2">Souhlasím s podmínkami a digitálně podepisuji smlouvu.</label>
                    </div>
                    
                    {error && <p className="text-red-500">{error}</p>}
                    
                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button type="submit" disabled={isSaving || !agreed} className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400 flex items-center">
                            {isSaving && <Loader2 className="animate-spin mr-2" />}
                            Vytvořit rezervaci
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReservationFormModal;
