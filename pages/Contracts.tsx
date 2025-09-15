import React, { useEffect, useState, useMemo } from 'react';
import { getContracts } from '../services/api';
import type { Contract } from '../types';
import { Search } from 'lucide-react';

const Contracts: React.FC = () => {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    
    const ITEMS_PER_PAGE = 15;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
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
            const customerName = `${contract.customer?.firstName} ${contract.customer?.lastName}`.toLowerCase();
            const vehicleName = contract.vehicle?.name.toLowerCase() || '';
            const licensePlate = contract.vehicle?.licensePlate.toLowerCase() || '';
            const term = searchTerm.toLowerCase();

            return term === '' ||
                customerName.includes(term) ||
                vehicleName.includes(term) ||
                licensePlate.includes(term);
        });
    }, [contracts, searchTerm]);
    
    const pageCount = Math.ceil(filteredContracts.length / ITEMS_PER_PAGE);
    const paginatedContracts = filteredContracts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );
    
    useEffect(() => {
        // Reset to first page if filters change and current page is out of bounds
        if (currentPage > pageCount) {
            setCurrentPage(1);
        }
    }, [filteredContracts, currentPage, pageCount]);


    if (loading) return <div>Načítání smluv...</div>;
    
    if (selectedContract) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">Detail Smlouvy</h2>
                        <p className="text-gray-500">Číslo: {selectedContract.id}</p>
                    </div>
                    <button onClick={() => setSelectedContract(null)} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {selectedContract.customer && (
                        <div className="bg-gray-50 p-4 rounded-md">
                            <h3 className="font-bold text-lg mb-2">Nájemce</h3>
                            <p>{selectedContract.customer.firstName} {selectedContract.customer.lastName}</p>
                            <p>{selectedContract.customer.email}</p>
                            <p>{selectedContract.customer.phone}</p>
                        </div>
                    )}
                    {selectedContract.vehicle && (
                        <div className="bg-gray-50 p-4 rounded-md">
                            <h3 className="font-bold text-lg mb-2">Vozidlo</h3>
                            <p>{selectedContract.vehicle.name}</p>
                            <p>SPZ: {selectedContract.vehicle.licensePlate}</p>
                            <p>Rok: {selectedContract.vehicle.year}</p>
                        </div>
                    )}
                </div>

                <div className="mt-4">
                    <h3 className="font-bold text-lg mb-2">Plné znění smlouvy</h3>
                    <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded-md text-sm font-mono border overflow-auto max-h-96">
                        {selectedContract.contractText}
                    </pre>
                </div>

                <div className="mt-8 text-right">
                     <button onClick={() => window.print()} className="bg-primary text-white py-2 px-6 rounded-lg hover:bg-primary-hover">
                        Tisknout
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                 <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Hledat podle zákazníka nebo vozidla..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border rounded-md"
                    />
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full">
                    <thead className="bg-gray-50">
                        <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm">
                            <th className="px-5 py-3">ID Smlouvy</th>
                            <th className="px-5 py-3">Zákazník</th>
                            <th className="px-5 py-3">Vozidlo</th>
                            <th className="px-5 py-3">Datum vystavení</th>
                            <th className="px-5 py-3">Akce</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {paginatedContracts.length > 0 ? (
                            paginatedContracts.map(contract => (
                                <tr key={contract.id} className="hover:bg-gray-50">
                                    <td className="px-5 py-4 text-sm text-gray-500 font-mono">{contract.id.substring(0, 8)}...</td>
                                    <td className="px-5 py-4">{contract.customer?.firstName} {contract.customer?.lastName}</td>
                                    <td className="px-5 py-4">{contract.vehicle?.name}</td>
                                    <td className="px-5 py-4">{new Date(contract.generatedAt).toLocaleDateString('cs-CZ')}</td>
                                    <td className="px-5 py-4">
                                        <button onClick={() => setSelectedContract(contract)} className="text-primary hover:text-primary-hover font-semibold">Zobrazit</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">
                                    Nebyly nalezeny žádné smlouvy odpovídající hledání.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                 {pageCount > 1 && (
                    <div className="p-4 flex justify-between items-center">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
                        >
                            Předchozí
                        </button>
                        <span>Stránka {currentPage} z {pageCount}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))}
                            disabled={currentPage === pageCount}
                             className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
                        >
                            Následující
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Contracts;