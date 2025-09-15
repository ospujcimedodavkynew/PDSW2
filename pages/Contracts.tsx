import React, { useEffect, useState, useMemo } from 'react';
import { getContracts } from '../services/api.ts';
import { Contract } from '../types.ts';
import { FileText, Search, X } from 'lucide-react';

const ContractDetailModal: React.FC<{ contract: Contract | null, onClose: () => void }> = ({ contract, onClose }) => {
    if (!contract) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-3xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Detail smlouvy</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><X /></button>
                </div>
                <div className="bg-gray-100 p-4 rounded max-h-[60vh] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">{contract.contract_text}</pre>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="py-2 px-4 rounded-lg bg-gray-200 hover:bg-gray-300">Zavřít</button>
                </div>
            </div>
        </div>
    );
};

const Contracts: React.FC = () => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getContracts();
                setContracts(data);
            } catch (error) {
                console.error("Failed to fetch contracts:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredContracts = useMemo(() => {
        return contracts.filter(contract => {
            const customerName = `${contract.customers?.first_name} ${contract.customers?.last_name}`.toLowerCase();
            const vehicleName = `${contract.vehicles?.name} ${contract.vehicles?.license_plate}`.toLowerCase();
            return customerName.includes(searchTerm.toLowerCase()) || vehicleName.includes(searchTerm.toLowerCase());
        });
    }, [contracts, searchTerm]);

    if (loading) return <div>Načítání smluv...</div>;

    return (
        <div className="space-y-6">
            <ContractDetailModal contract={selectedContract} onClose={() => setSelectedContract(null)} />
            <div className="bg-white p-4 rounded-lg shadow flex items-center">
                <Search className="text-gray-400 mr-3"/>
                <input
                    type="text"
                    placeholder="Hledat podle zákazníka nebo vozidla..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent focus:outline-none"
                />
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                            <tr>
                                <th className="px-6 py-3">Vytvořeno</th>
                                <th className="px-6 py-3">Zákazník</th>
                                <th className="px-6 py-3">Vozidlo</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContracts.map(contract => (
                                <tr key={contract.id} className="hover:bg-gray-50 border-t">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(contract.generated_at).toLocaleString('cs-CZ')}</td>
                                    <td className="px-6 py-4">{contract.customers?.first_name} {contract.customers?.last_name}</td>
                                    <td className="px-6 py-4">{contract.vehicles?.name} ({contract.vehicles?.license_plate})</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => setSelectedContract(contract)} className="text-primary hover:underline flex items-center">
                                            <FileText className="w-4 h-4 mr-1" /> Zobrazit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredContracts.length === 0 && (
                    <p className="text-center text-gray-500 py-8">Nebyly nalezeny žádné smlouvy.</p>
                )}
            </div>
        </div>
    );
};

export default Contracts;
