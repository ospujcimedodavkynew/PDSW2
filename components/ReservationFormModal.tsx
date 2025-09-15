import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import type { Customer, Reservation, Vehicle } from '../types';
import { X, Trash, Clock, Calendar, Hash, ArrowRight, DollarSign, Edit, Check } from 'lucide-react';
import { createReservationWithContract, updateReservation, deleteReservation } from '../services/api';

interface ReservationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    reservationData: Partial<Reservation> & { initialDate?: Date } | null;
    vehicles: Vehicle[];
    customers: Customer[];
}

// Helper to generate contract text
const generateContractText = (customer: Customer, vehicle: Vehicle, details: { startDate: Date, endDate: Date, totalPrice: number }): string => {
    return `
-------------------------------------------
SMLOUVA O NÁJMU DOPRAVNÍHO PROSTŘEDKU
-------------------------------------------

Číslo smlouvy: [Bude doplněno po uložení]
Datum uzavření: ${new Date().toLocaleDateString('cs-CZ')}

PRONAJÍMATEL:
Van Rental Pro
IČO: 12345678
Adresa: Vzorová 1, 110 00 Praha 1

NÁJEMCE:
Jméno: ${customer.firstName} ${customer.lastName}
Adresa: ${customer.address}
Email: ${customer.email}
Telefon: ${customer.phone}
Číslo ŘP: ${customer.driver_license_number}

PŘEDMĚT NÁJMU:
Vozidlo: ${vehicle.name}
Model: ${vehicle.make} ${vehicle.model}
SPZ: ${vehicle.licensePlate}
Rok výroby: ${vehicle.year}

DOBA NÁJMU:
Od: ${details.startDate.toLocaleString('cs-CZ')}
Do: ${details.endDate.toLocaleString('cs-CZ')}

CENA NÁJMU:
Celková cena: ${details.totalPrice.toLocaleString('cs-CZ')} Kč
(Cena zahrnuje limit 300 km/den. Překročení limitu je zpoplatněno sazbou 3 Kč/km.)

PODMÍNKY:
1. Nájemce je povinen užívat vozidlo s péčí řádného hospodáře.
2. Veškeré škody způsobené na vozidle je nájemce povinen neprodleně hlásit pronajímateli.
3. Nájemce je povinen vrátit vozidlo ve stejném stavu, v jakém jej převzal, s přihlédnutím k běžnému opotřebení.

Tato smlouva byla vygenerována elektronicky a je platná bez fyzického podpisu.
Zaškrtnutím souhlasu ve formuláři nájemce potvrzuje, že se seznámil s podmínkami a souhlasí s nimi.
`;
};


const ReservationFormModal: React.FC<ReservationFormModalProps> = ({ isOpen, onClose, onSave, reservationData, vehicles, customers }) => {
    
    // Form state
    const [customerId, setCustomerId] = useState('');
    const [vehicleId, setVehicleId] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('days');
    const [durationValue, setDurationValue] = useState<number>(1);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    
    // Other state
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const isEditing = !!(reservationData && reservationData.id);

    useEffect(() => {
        if (isOpen && reservationData) {
            const defaultStartTime = new Date(reservationData.initialDate || new Date());
            defaultStartTime.setHours(9, 0, 0, 0);
            
            setCustomerId(reservationData.customerId || '');
            setVehicleId(reservationData.vehicleId || '');
            setStartDate(reservationData.startDate ? new Date(reservationData.startDate) : defaultStartTime);
            
            // Logic to calculate duration from existing start/end dates for editing
            if (reservationData.startDate && reservationData.endDate) {
                const start = new Date(reservationData.startDate);
                const end = new Date(reservationData.endDate);
                const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                if (diffHours <= 12) {
                    setDurationUnit('hours');
                    setDurationValue(diffHours);
                } else {
                    setDurationUnit('days');
                    setDurationValue(Math.ceil(diffHours / 24));
                }
            } else {
                setDurationUnit('days');
                setDurationValue(1);
            }
            setAgreedToTerms(isEditing); // Assume agreement for existing reservations
            setError(null);
        }
    }, [reservationData, isOpen]);
    
    // --- DERIVED STATE & MEMOS ---
    const { endDate, totalPrice, isValid } = useMemo(() => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!vehicle || !startDate) return { endDate: null, totalPrice: 0, isValid: false };

        const newEndDate = new Date(startDate);
        let price = 0;
        
        if (durationUnit === 'hours') {
            newEndDate.setHours(newEndDate.getHours() + durationValue);
            if (durationValue === 4) price = vehicle.rate4h;
            else if (durationValue === 12) price = vehicle.rate12h;
            else price = vehicle.dailyRate; // Fallback for custom hour values if ever implemented
        } else {
            newEndDate.setDate(newEndDate.getDate() + durationValue);
            price = vehicle.dailyRate * durationValue;
        }

        return { endDate: newEndDate, totalPrice: price, isValid: true };
    }, [vehicleId, startDate, durationUnit, durationValue, vehicles]);

    const { customer, vehicle, contractText } = useMemo(() => {
        const c = customers.find(cust => cust.id === customerId);
        const v = vehicles.find(veh => veh.id === vehicleId);
        if (c && v && endDate) {
            const text = generateContractText(c, v, { startDate, endDate, totalPrice });
            return { customer: c, vehicle: v, contractText: text };
        }
        return { customer: null, vehicle: null, contractText: 'Vyberte zákazníka a vozidlo pro vygenerování smlouvy.'};
    }, [customerId, vehicleId, customers, vehicles, startDate, endDate, totalPrice]);

    const formatDateForInput = (date: Date) => {
        const d = new Date(date);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // --- ACTIONS ---
    const handleDurationChange = (unit: 'hours' | 'days', value: number) => {
        setDurationUnit(unit);
        setDurationValue(value);
    };

    const resetForm = () => {
        setCustomerId('');
        setVehicleId('');
        setStartDate(new Date());
        setDurationUnit('days');
        setDurationValue(1);
        setAgreedToTerms(false);
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!customerId || !vehicleId || !endDate) {
            setError('Zákazník, vozidlo a platný termín jsou povinné.');
            return;
        }
        if (!agreedToTerms) {
            setError('Je nutné souhlasit s podmínkami a digitálně podepsat smlouvu.');
            return;
        }

        setIsSaving(true);
        try {
            if (isEditing && reservationData?.id) {
                // Update existing reservation (contract text is not updated in this simplified flow)
                await updateReservation(reservationData.id, {
                    customerId, vehicleId, startDate, endDate, status: 'scheduled'
                });
            } else {
                // Create new reservation and contract
                await createReservationWithContract(
                    { customerId, vehicleId, startDate, endDate, status: 'scheduled' },
                    contractText
                );
            }
            onSave();
            handleClose();
        } catch (err) {
            console.error("Failed to save reservation:", err);
            setError(err instanceof Error ? err.message : 'Uložení rezervace se nezdařilo.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (isEditing && reservationData?.id && window.confirm('Opravdu si přejete smazat tuto rezervaci?')) {
            setIsSaving(true);
            setError(null);
            try {
                await deleteReservation(reservationData.id);
                onSave();
                handleClose();
            } catch (err) {
                 setError(err instanceof Error ? err.message : 'Smazání rezervace se nezdařilo.');
            } finally {
                setIsSaving(false);
            }
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-full">
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-bold">{isEditing ? 'Upravit rezervaci' : 'Nová rezervace'}</h2>
                    <button type="button" onClick={handleClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>

                {/* Body */}
                <div className="p-6 flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Form Inputs */}
                    <div className="space-y-6">
                        <fieldset>
                            <legend className="text-lg font-semibold mb-2">1. Zákazník a vozidlo</legend>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Zákazník</label>
                                    <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full p-2 border rounded-md" required>
                                        <option value="">-- Vyberte zákazníka --</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Vozidlo</label>
                                    <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className="w-full p-2 border rounded-md" required>
                                        <option value="">-- Vyberte vozidlo --</option>
                                        {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend className="text-lg font-semibold mb-2">2. Termín a délka pronájmu</legend>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Začátek pronájmu</label>
                                <input type="datetime-local" value={formatDateForInput(startDate)} onChange={e => setStartDate(new Date(e.target.value))} className="w-full p-2 border rounded-md" required />
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Délka pronájmu</label>
                                <div className="flex space-x-2">
                                    <button type="button" onClick={() => handleDurationChange('hours', 4)} className={`px-4 py-2 rounded-md font-semibold ${durationUnit === 'hours' && durationValue === 4 ? 'bg-primary text-white' : 'bg-gray-200'}`}>4 hod</button>
                                    <button type="button" onClick={() => handleDurationChange('hours', 12)} className={`px-4 py-2 rounded-md font-semibold ${durationUnit === 'hours' && durationValue === 12 ? 'bg-primary text-white' : 'bg-gray-200'}`}>12 hod</button>
                                </div>
                                <div className="flex items-center space-x-2 mt-2">
                                    <input type="range" min="1" max="30" value={durationUnit === 'days' ? durationValue : 1} onChange={e => handleDurationChange('days', parseInt(e.target.value))} className="w-full accent-primary" />
                                    <span className="font-bold text-lg w-24 text-center">{durationUnit === 'days' ? `${durationValue} ${durationValue > 4 ? 'dní' : (durationValue > 1 ? 'dny' : 'den')}` : ''}</span>
                                </div>
                            </div>
                        </fieldset>
                        
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-blue-800">Cenová rekapitulace</h3>
                            <div className="mt-2 space-y-1 text-gray-700">
                                <p className="flex justify-between"><span>Začátek:</span> <strong>{startDate.toLocaleString('cs-CZ')}</strong></p>
                                <p className="flex justify-between"><span>Konec:</span> <strong>{endDate ? endDate.toLocaleString('cs-CZ') : '...'}</strong></p>
                                <hr className="my-2"/>
                                <p className="flex justify-between text-xl"><span>Celková cena:</span> <strong className="text-primary">{totalPrice.toLocaleString('cs-CZ')} Kč</strong></p>
                            </div>
                        </div>

                    </div>
                    
                    {/* Right Column: Contract Preview */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">3. Náhled smlouvy a podpis</h3>
                        <div className="bg-gray-100 p-4 rounded-md border h-96 overflow-y-auto text-sm font-mono whitespace-pre-wrap">
                            {contractText}
                        </div>
                         <div className="flex items-start">
                            <input
                                id="terms"
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={e => setAgreedToTerms(e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary mt-1"
                                required
                            />
                            <label htmlFor="terms" className="ml-3 text-sm text-gray-700">
                                Souhlasím s nájemními podmínkami a <span className="font-bold">digitálně podepisuji smlouvu</span>.
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t flex justify-between items-center flex-shrink-0">
                    <div>
                        {isEditing && (
                            <button type="button" onClick={handleDelete} className="py-2 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center disabled:bg-gray-400" disabled={isSaving}>
                                <Trash className="w-4 h-4 mr-2" /> Smazat
                            </button>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                         {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}
                        <button type="button" onClick={handleClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button type="submit" disabled={isSaving || !agreedToTerms} className="py-2 px-6 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400 font-semibold text-lg">
                            {isSaving ? 'Ukládám...' : (isEditing ? 'Uložit změny' : 'Vytvořit rezervaci')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ReservationFormModal;