import React, { useState, useMemo } from 'react';
import { Customer } from '../types.ts';
import { User, Mail, Phone, Search, Plus } from 'lucide-react';

interface CustomersPageProps {
    customers: Customer[];
    dataLoading: boolean;
    onNewCustomer: () => void;
    onEditCustomer: (customer: Customer) => void;
}

const CustomerCard: React.FC<{ customer: Customer; onEdit: (customer: Customer) => void }> = ({ customer, onEdit }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col justify-between">
        <div>
            <h3 className="text-lg font-bold flex items-center"><User className="w-5 h-5 mr-2 text-primary" /> {customer.first_name} {customer.last_name}</h3>
            <div className="text-gray-600 mt-2 space-y-1 text-sm">
                <p className="flex items-center"><Mail className="w-4 h-4 mr-2" /> {customer.email}</p>
                <p className="flex items-center"><Phone className="w-4 h-4 mr-2" /> {customer.phone}</p>
            </div>
        </div>
        <button onClick={() => onEdit(customer)} className="text-sm text-primary hover:underline mt-4 text-right">
            Upravit
        </button>
    </div>
);

const CustomersPage: React.FC<CustomersPageProps> = ({ customers, dataLoading, onNewCustomer, onEditCustomer }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = useMemo(() => {
        return customers.filter(c =>
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [customers, searchTerm]);

    if (dataLoading) return <div>Načítání zákazníků...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative w-full md:w-1/3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Hledat zákazníka..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border rounded-md bg-white"
                    />
                </div>
                <button onClick={onNewCustomer} className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-hover transition-colors flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Přidat zákazníka
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCustomers.map(customer => (
                    <CustomerCard key={customer.id} customer={customer} onEdit={onEditCustomer} />
                ))}
            </div>
            {filteredCustomers.length === 0 && (
                 <div className="text-center py-12 bg-white rounded-lg shadow-md">
                    <p className="text-gray-500">Nebyly nalezeni žádní zákazníci.</p>
                </div>
            )}
        </div>
    );
};

export default CustomersPage;
