import React, { useEffect, useState, useMemo } from 'react';
import { getVehicles, getCustomers, getReservations, getFinancials } from '../services/api';
import { Vehicle, Customer, Reservation, FinancialTransaction, EXPENSE_CATEGORIES } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Crown, Loader, PieChart as PieChartIcon, BarChart3, Users } from 'lucide-react';

const COLORS = ['#1E40AF', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA'];

const Reports: React.FC = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [financials, setFinancials] = useState<FinancialTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [vehData, custData, resData, finData] = await Promise.all([
                    getVehicles(),
                    getCustomers(),
                    getReservations(),
                    getFinancials()
                ]);
                setVehicles(vehData);
                setCustomers(custData);
                setReservations(resData);
                setFinancials(finData);
            } catch (error) {
                console.error("Failed to load report data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const vehicleUtilizationData = useMemo(() => {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        return vehicles.map(vehicle => {
            const relevantReservations = reservations.filter(r => 
                r.vehicleId === vehicle.id &&
                (r.status === 'active' || r.status === 'completed') &&
                new Date(r.startDate) < today &&
                new Date(r.endDate) > thirtyDaysAgo
            );

            let rentedDays = 0;
            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                if (relevantReservations.some(r => d >= new Date(r.startDate) && d <= new Date(r.endDate))) {
                    rentedDays++;
                }
            }

            return { name: vehicle.name, 'Dny v pronájmu': rentedDays };
        });
    }, [vehicles, reservations]);

    const topCustomersData = useMemo(() => {
        const customerSpending: { [customerId: string]: number } = {};
        
        const incomeTransactions = financials.filter(f => f.type === 'income' && f.reservationId);
        
        incomeTransactions.forEach(transaction => {
            const reservation = reservations.find(r => r.id === transaction.reservationId);
            if (reservation) {
                customerSpending[reservation.customerId] = (customerSpending[reservation.customerId] || 0) + transaction.amount;
            }
        });

        return Object.entries(customerSpending)
            .map(([customerId, total]) => {
                const customer = customers.find(c => c.id === customerId);
                return {
                    name: customer ? `${customer.first_name} ${customer.last_name}` : 'Neznámý zákazník',
                    total: total
                };
            })
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

    }, [financials, reservations, customers]);

    const expenseAnalysisData = useMemo(() => {
        const expenseByCategory: { [category: string]: number } = {};
        const expenses = financials.filter(f => f.type === 'expense' && f.category);

        expenses.forEach(expense => {
            const categoryKey = expense.category!;
            expenseByCategory[categoryKey] = (expenseByCategory[categoryKey] || 0) + expense.amount;
        });
        
        return Object.entries(expenseByCategory).map(([category, value]) => ({
            name: EXPENSE_CATEGORIES[category as keyof typeof EXPENSE_CATEGORIES] || category,
            value
        }));
    }, [financials]);

    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader className="w-8 h-8 animate-spin" /> Načítání reportů...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Vehicle Utilization */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center"><BarChart3 className="mr-2" /> Vytíženost vozidel (posledních 30 dní)</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={vehicleUtilizationData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="name" width={120} />
                            <Tooltip formatter={(value: number) => `${value} dní`}/>
                            <Legend />
                            <Bar dataKey="Dny v pronájmu" fill="#1E40AF" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                
                {/* Expense Analysis */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center"><PieChartIcon className="mr-2" /> Analýza výdajů</h2>
                     {expenseAnalysisData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={expenseAnalysisData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {expenseAnalysisData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `${value.toLocaleString('cs-CZ')} Kč`}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">Nebyly nalezeny žádné kategorizované výdaje.</div>
                    )}
                </div>
            </div>

            {/* Top Customers */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-700 mb-4 flex items-center"><Users className="mr-2" /> Nejlepší zákazníci</h2>
                {topCustomersData.length > 0 ? (
                    <ul className="space-y-4">
                        {topCustomersData.map((customer, index) => (
                            <li key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-dark-text font-bold text-lg mr-4">
                                    {index === 0 ? <Crown className="w-6 h-6" /> : index + 1}
                                </div>
                                <div className="flex-grow">
                                    <p className="font-semibold text-gray-800">{customer.name}</p>
                                </div>
                                <div className="text-lg font-bold text-primary">
                                    {customer.total.toLocaleString('cs-CZ')} Kč
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-8 text-gray-500">Nebyly nalezeny žádné dokončené transakce pro sestavení žebříčku.</div>
                )}
            </div>
        </div>
    );
};

export default Reports;