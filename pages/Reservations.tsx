import React, { useState, useMemo } from 'react';
import { Vehicle, Reservation, ReservationStatus } from '../types.ts';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface ReservationsPageProps {
    vehicles: Vehicle[];
    reservations: Reservation[];
    dataLoading: boolean;
    onNewReservation: (prefillData: Partial<Reservation>) => void;
    onShowDetail: (reservation: Reservation) => void;
}

const statusColors: Record<ReservationStatus, string> = {
    'pending-customer': 'bg-yellow-200 border-yellow-400',
    scheduled: 'bg-blue-200 border-blue-400',
    active: 'bg-orange-300 border-orange-500',
    completed: 'bg-green-200 border-green-400',
    cancelled: 'bg-gray-200 border-gray-400 line-through',
};

const ReservationsPage: React.FC<ReservationsPageProps> = ({ vehicles, reservations, dataLoading, onNewReservation, onShowDetail }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = endOfMonth.getDate();

    const days = Array.from({ length: daysInMonth }, (_, i) => new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), i + 1));

    const vehicleReservations = useMemo(() => {
        const map = new Map<string, Reservation[]>();
        reservations.forEach(res => {
            const list = map.get(res.vehicle_id) || [];
            list.push(res);
            map.set(res.vehicle_id, list);
        });
        return map;
    }, [reservations]);

    const getReservationForDay = (vehicleId: string, day: Date): Reservation | undefined => {
        const dayStart = day.getTime();
        const dayEnd = new Date(day).setHours(23, 59, 59, 999);
        return vehicleReservations.get(vehicleId)?.find(res => {
            const resStart = new Date(res.start_date).getTime();
            const resEnd = new Date(res.end_date).getTime();
            return (dayStart >= resStart && dayStart <= resEnd) || (dayEnd >= resStart && dayEnd <= resEnd) || (resStart >= dayStart && resEnd <= dayEnd);
        });
    };
    
    const changeMonth = (offset: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    if (dataLoading) return <div>Načítání kalendáře...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft /></button>
                    <h2 className="text-xl font-bold w-48 text-center">{currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' })}</h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRight /></button>
                </div>
                <button onClick={() => onNewReservation({start_date: new Date().toISOString()})} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-hover flex items-center">
                    <Plus className="w-5 h-5 mr-2" /> Nová rezervace
                </button>
            </div>
            <div className="flex-1 overflow-auto">
                <div className="grid" style={{ gridTemplateColumns: `150px repeat(${daysInMonth}, minmax(40px, 1fr))` }}>
                    <div className="sticky left-0 bg-white z-10 border-r border-b font-bold p-2">Vozidlo</div>
                    {days.map(day => (
                        <div key={day.toISOString()} className={`text-center p-2 border-b ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-gray-50' : ''}`}>
                            <span className="text-xs">{day.toLocaleString('cs-CZ', { weekday: 'short' })}</span><br />
                            <span className="font-bold">{day.getDate()}</span>
                        </div>
                    ))}

                    {vehicles.map(vehicle => (
                        <React.Fragment key={vehicle.id}>
                            <div className="sticky left-0 bg-white z-10 border-r p-2 font-semibold flex items-center">{vehicle.name}</div>
                            {days.map(day => {
                                const reservation = getReservationForDay(vehicle.id, day);
                                if (reservation) {
                                    return (
                                        <div key={day.toISOString()} onClick={() => onShowDetail(reservation)} className={`p-1 m-1 rounded cursor-pointer ${statusColors[reservation.status]}`}>
                                            <p className="text-xs truncate font-semibold">{reservation.customers?.first_name} {reservation.customers?.last_name}</p>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={day.toISOString()} onClick={() => onNewReservation({ vehicle_id: vehicle.id, start_date: day.toISOString() })} className={`hover:bg-green-100 cursor-pointer ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-gray-50' : ''}`}></div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReservationsPage;
