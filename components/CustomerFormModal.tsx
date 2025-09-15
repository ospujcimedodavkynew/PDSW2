import React, { useState, useEffect, FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Customer } from '../types.ts';
import { addCustomer, updateCustomer } from '../services/api.ts';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Customer) => void;
    customer?: Customer | null;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, onSave, customer }) => {
    const [formData, setFormData] = useState<Omit<Customer, 'id'>>({
        first_name: '', last_name: '', email: '', phone: '', address: '', driver_license_number: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (customer) {
            setFormData(customer);
        } else {
            setFormData({ first_name: '', last_name: '', email: '', phone: '', address: '', driver_license_number: '' });
        }
    }, [customer, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
            let savedCustomer;
            if (customer) {
                savedCustomer = await updateCustomer(customer.id, formData);
            } else {
                savedCustomer = await addCustomer(formData);
            }
            onSave(savedCustomer);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Uložení se nezdařilo.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{customer ? 'Upravit zákazníka' : 'Nový zákazník'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input name="first_name" placeholder="Jméno" value={formData.first_name} onChange={handleChange} required className="p-2 border rounded" />
                        <input name="last_name" placeholder="Příjmení" value={formData.last_name} onChange={handleChange} required className="p-2 border rounded" />
                    </div>
                    <input name="email" type="email" placeholder="E-mail" value={formData.email} onChange={handleChange} required className="p-2 border rounded" />
                    <input name="phone" placeholder="Telefon" value={formData.phone} onChange={handleChange} required className="p-2 border rounded" />
                    <input name="address" placeholder="Adresa" value={formData.address} onChange={handleChange} className="p-2 border rounded" />
                    <input name="driver_license_number" placeholder="Číslo ŘP" value={formData.driver_license_number} onChange={handleChange} className="p-2 border rounded" />
                    
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

export default CustomerFormModal;
