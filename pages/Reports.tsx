import React, { useMemo } from 'react';
import { Vehicle, Customer, Reservation, FinancialTransaction, EXPENSE_CATEGORIES } from '../types.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Car } from 'lucide-react';

interface ReportsPageProps {
    vehicles: Vehicle[];
    customers: Customer[];
    reservations: Reservation[];
    dataLoading: boolean;
}

const ReportsPage: React.FC<ReportsPageProps> = ({ vehicles, customers, reservations, dataLoading }) => {

    const vehicleUsageData = useMemo(() => {
        return vehicles.map(vehicle => {
            const totalDaysRented = reservations
                .filter(r => r.vehicle_id === vehicle.id && (r.status === 'active' || r.status === 'completed'))
                .reduce((total, r) => {
                    const start = new Date(r.start_date);
                    const end = new Date(r.end_date);
                    const diffTime = Math.abs(end.getTime() - start.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return total + diffDays;
                }, 0);
            return { name: vehicle.name, "Dní pronajato": totalDaysRented };
        });
    }, [vehicles, reservations]);

    const topCustomersData = useMemo(() => {
        const customerSpending = new Map<string, { customer: Customer, total: number }>();
        reservations
            .filter(r => r.customer_id && r.total_price && (r.status === 'active' || r.status === 'completed'))
            .forEach(r => {
                const customer = customers.find(c => c.id === r.customer_id);
                if (customer) {
                    const current = customerSpending.get(customer.id) || { customer, total: 0 };
                    current.total += r.total_price!;
                    customerSpending.set(customer.id, current);
                }
            });
        
        return Array.from(customerSpending.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [customers, reservations]);
    
    // Note: Expense data is fetched in Financials page. A real app might use a global state (context/redux).
    // For this component, we'll assume we can't show expense chart.
    // A placeholder will be shown.

    if (dataLoading) return <div>Načítání reportů...</div>;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4 text-gray-700 flex items-center"><Car className="mr-2" /> Vytíženost vozidel</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={vehicleUsageData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={80} />
                            <Tooltip formatter={(value: number) => `${value} dní`} />
                            <Legend />
                            <Bar dataKey="Dní pronajato" fill="#1E40AF" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4 text-gray-700 flex items-center"><Users className="mr-2" /> TOP 5 Zákazníků</h2>
                    <ul className="space-y-4">
                        {topCustomersData.map(({customer, total}) => (
                            <li key={customer.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                                <p className="font-semibold">{customer.first_name} {customer.last_name}</p>
                                <p className="font-bold text-primary">{total.toLocaleString('cs-CZ')} Kč</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-gray-700 flex items-center"><TrendingUp className="mr-2" /> Analýza výdajů</h2>
                 <div className="flex items-center justify-center h-64 text-gray-500">
                    <p>Data o výdajích jsou dostupná na stránce Finance.</p>
                 </div>
            </div>
        </div>
    );
};

export default ReportsPage;
