import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Key, ArrowRight, CornerDownLeft, Gauge } from 'lucide-react';
import { Reservation } from '../types.ts';
import { updateReservationStatus, completeReservation } from '../services/api.ts';

interface ReservationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    reservation: Reservation | null;
}

const ReservationDetailModal: React.FC<ReservationDetailModalProps> = ({ isOpen, onClose, onSave, reservation }) => {
    const [startMileage, setStartMileage] = useState('');
    const [endMileage, setEndMileage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        setStartMileage(reservation?.start_mileage?.toString() || '');
        setEndMileage(reservation?.end_mileage?.toString() || '');
    }, [reservation]);

    const handleHandover = async () => {
        if (!startMileage) {
            alert('Zadejte počáteční stav tachometru.');
            return;
        }
        setIsSaving(true);
        try {
            await updateReservationStatus(reservation!.id, 'active', { start_mileage: parseInt(startMileage) });
            onSave();
        } catch (error) {
            console.error(error);
            alert('Předání se nezdařilo.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const { totalDays, allowedMileage, drivenMileage, overageMileage, mileageFee } = useMemo(() => {
        if (!reservation || !endMileage) return {};
        const start = new Date(reservation.start_date);
        const end = new Date(reservation.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const allowedMileage = totalDays * 300;
        const drivenMileage = parseInt(endMileage) - (reservation.start_mileage || 0);
        const overageMileage = Math.max(0, drivenMileage - allowedMileage);
        const mileageFee = overageMileage * 3;
        return { totalDays, allowedMileage, drivenMileage, overageMileage, mileageFee };
    }, [reservation, endMileage]);


    const handleReturn = async () => {
        if (!endMileage) {
            alert('Zadejte konečný stav tachometru.');
            return;
        }
        setIsSaving(true);
        try {
            await completeReservation(reservation!, parseInt(endMileage), mileageFee || 0);
            onSave();
        } catch (error) {
            console.error(error);
            alert('Vrácení se nezdařilo.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !reservation) return null;

    const isScheduled = reservation.status === 'scheduled';
    const isActive = reservation.status === 'active';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Detail rezervace</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                
                <div className="space-y-3 text-gray-700">
                    <p><strong>Vozidlo:</strong> {reservation.vehicles?.name} ({reservation.vehicles?.license_plate})</p>
                    <p><strong>Zákazník:</strong> {reservation.customers?.first_name} {reservation.customers?.last_name}</p>
                    <p><strong>Od:</strong> {new Date(reservation.start_date).toLocaleString('cs-CZ')}</p>
                    <p><strong>Do:</strong> {new Date(reservation.end_date).toLocaleString('cs-CZ')}</p>
                    <p><strong>Stav:</strong> <span className="font-semibold">{reservation.status}</span></p>
                </div>
                
                {(isScheduled || isActive) && <hr className="my-6" />}

                {isScheduled && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">Protokol o předání</h3>
                        <div className="relative">
                            <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="number" placeholder="Počáteční stav tachometru" value={startMileage} onChange={e => setStartMileage(e.target.value)} className="w-full p-2 pl-10 border rounded" />
                        </div>
                        <button onClick={handleHandover} disabled={isSaving} className="w-full py-2 px-4 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 disabled:bg-gray-400 flex items-center justify-center">
                            {isSaving ? <Loader2 className="animate-spin" /> : <><Key className="mr-2"/> Potvrdit předání</>}
                        </button>
                    </div>
                )}
                
                {isActive && (
                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">Protokol o vrácení</h3>
                         <div className="relative">
                            <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="number" placeholder="Konečný stav tachometru" value={endMileage} onChange={e => setEndMileage(e.target.value)} className="w-full p-2 pl-10 border rounded" />
                        </div>
                        {endMileage && mileageFee !== undefined && (
                             <div className="bg-gray-100 p-3 rounded-lg text-sm space-y-1">
                                <p>Povolený nájezd: <strong>{allowedMileage} km</strong> ({totalDays} dní)</p>
                                <p>Ujeto: <strong>{drivenMileage} km</strong></p>
                                <p>Překročeno o: <strong>{overageMileage} km</strong></p>
                                <p className="font-bold">Poplatek za km: <span className="text-red-600">{mileageFee.toLocaleString('cs-CZ')} Kč</span></p>
                            </div>
                        )}
                        <button onClick={handleReturn} disabled={isSaving} className="w-full py-2 px-4 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center">
                            {isSaving ? <Loader2 className="animate-spin" /> : <><CornerDownLeft className="mr-2"/> Potvrdit vrácení</>}
                        </button>
                    </div>
                )}


                 <div className="mt-8 flex justify-end">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zavřít</button>
                </div>
            </div>
        </div>
    );
};

export default ReservationDetailModal;
