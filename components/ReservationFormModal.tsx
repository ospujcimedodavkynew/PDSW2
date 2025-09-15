
import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Customer, Vehicle, Reservation } from '../types';
import { createReservationWithContract } from '../services/api';
import { GoogleGenAI } from '@google/genai';

interface ReservationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    customers: Customer[];
    vehicles: Vehicle[];
    prefillData?: Partial<Reservation> | null;
}

const ReservationFormModal: React.FC<ReservationFormModalProps> = ({ isOpen, onClose, onSave, customers, vehicles, prefillData }) => {
    const [customerId, setCustomerId] = useState('');
    const [vehicleId, setVehicleId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [totalPrice, setTotalPrice] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const availableVehicles = useMemo(() => vehicles.filter(v => v.status === 'available'), [vehicles]);

    const resetForm = () => {
        setCustomerId(prefillData?.customer_id || '');
        setVehicleId(prefillData?.vehicle_id || '');
        setStartDate(prefillData?.start_date ? new Date(prefillData.start_date).toISOString().slice(0, 16) : '');
        setEndDate(prefillData?.end_date ? new Date(prefillData.end_date).toISOString().slice(0, 16) : '');
        setTotalPrice(0);
        setIsSaving(false);
        setError(null);
        setStatusMessage('');
    };

    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [isOpen, prefillData]);

    useEffect(() => {
        if (vehicleId && startDate && endDate) {
            const vehicle = vehicles.find(v => v.id === vehicleId);
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (vehicle && end > start) {
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
                
                if (diffHours <= 4 && vehicle.rate4h > 0) {
                     setTotalPrice(vehicle.rate4h);
                } else if (diffHours <= 12 && vehicle.rate12h > 0) {
                     setTotalPrice(vehicle.rate12h);
                } else {
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    setTotalPrice(diffDays * vehicle.daily_rate);
                }
            } else {
                setTotalPrice(0);
            }
        }
    }, [vehicleId, startDate, endDate, vehicles]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!customerId || !vehicleId || !startDate || !endDate || totalPrice <= 0) {
            setError("Vyplňte prosím všechna pole a zkontrolujte cenu.");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            // AI Contract Generation
            setStatusMessage('Generuji text smlouvy...');
            // Correct: Initialize GoogleGenAI with the apiKey in an object.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const customer = customers.find(c => c.id === customerId)!;
            const vehicle = vehicles.find(v => v.id === vehicleId)!;
            
            const prompt = `
Vytvoř jednoduchou smlouvu o pronájmu dodávky.
Nájemce: ${customer.first_name} ${customer.last_name}, email: ${customer.email}, telefon: ${customer.phone}, adresa: ${customer.address}, číslo ŘP: ${customer.driver_license_number}.
Vozidlo: ${vehicle.name}, SPZ: ${vehicle.license_plate}.
Doba pronájmu od: ${new Date(startDate).toLocaleString('cs-CZ')} do: ${new Date(endDate).toLocaleString('cs-CZ')}.
Cena pronájmu: ${totalPrice.toLocaleString('cs-CZ')} Kč.
Limit najetých kilometrů je 300 km na den. Překročení limitu je zpoplatněno sazbou 3 Kč za každý kilometr navíc.
Vozidlo se předává s plnou nádrží a vrací se s plnou nádrží.
Zahrň standardní klauzule o odpovědnosti za škody a pokuty.`;

            // Correct: Use ai.models.generateContent with the required model and contents.
            const result = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });
            // Correct: Extract text directly from the response object.
            const contractText = result.text;
            
            setStatusMessage('Ukládám rezervaci a smlouvu...');
            await createReservationWithContract(
                {
                    start_date: new Date(startDate).toISOString(),
                    end_date: new Date(endDate).toISOString(),
                    vehicle_id: vehicle.id,
                    customer_id: customer.id,
                    total_price: totalPrice,
                },
                contractText,
                customer,
                vehicle
            );

            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Vytvoření rezervace se nezdařilo.');
        } finally {
            setIsSaving(false);
            setStatusMessage('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Nová rezervace</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <select value={customerId} onChange={e => setCustomerId(e.target.value)} required className="p-2 border rounded w-full bg-white">
                        <option value="">-- Vybrat zákazníka --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                    </select>
                    <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required className="p-2 border rounded w-full bg-white">
                        <option value="">-- Vybrat vozidlo --</option>
                        {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.license_plate})</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} required className="p-2 border rounded" />
                        <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} required className="p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Celková cena</label>
                        <input type="number" value={totalPrice} onChange={e => setTotalPrice(parseFloat(e.target.value) || 0)} required className="p-2 border rounded w-full bg-gray-100" />
                    </div>

                    {error && <p className="text-red-500">{error}</p>}
                    {isSaving && <p className="text-blue-500 flex items-center"><Loader2 className="animate-spin mr-2" /> {statusMessage}</p>}

                    <div className="flex justify-end space-x-3 pt-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zrušit</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:bg-gray-400 flex items-center">
                            {isSaving ? 'Zpracovávám...' : 'Vytvořit rezervaci a smlouvu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReservationFormModal;
