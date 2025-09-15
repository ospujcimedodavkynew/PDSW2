import React, { useState, useEffect, FormEvent } from 'react';
import { supabase } from '../services/api.ts';
import { Reservation } from '../types.ts';
import { UploadCloud, Loader2 } from 'lucide-react';

interface CustomerPortalProps {
    token: string;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ token }) => {
    const [reservation, setReservation] = useState<Reservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        driver_license_number: '',
    });
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const fetchReservation = async () => {
            const { data, error } = await supabase
                .from('reservations')
                .select('*, vehicles(name)')
                .eq('portal_token', token)
                .single();

            if (error || !data) {
                setError('Tento odkaz pro rezervaci je neplatný nebo již vypršel.');
            } else if (data.status !== 'pending-customer') {
                setError('Tato rezervace již byla dokončena.');
            } else {
                setReservation(data as Reservation);
            }
            setLoading(false);
        };
        fetchReservation();
    }, [token]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!file) {
            alert('Prosím, nahrajte fotografii řidičského průkazu.');
            return;
        }
        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Upload driver's license image
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `driver_licenses/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);

            // 3. Create or find customer
            // Simple approach: always create new customer for portal submission
            const { data: customerData, error: customerError } = await supabase
                .from('customers')
                .insert({ ...formData, driver_license_image_url: publicUrl })
                .select()
                .single();
            if (customerError) throw customerError;

            // 4. Update reservation with customer_id and set status to 'scheduled'
            const { error: reservationError } = await supabase
                .from('reservations')
                .update({ customer_id: customerData.id, status: 'scheduled' })
                .eq('id', reservation!.id);
            if (reservationError) throw reservationError;
            
            setIsSuccess(true);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Došlo k chybě při odesílání údajů.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">Ověřuji odkaz...</div>;
    if (error) return <div className="flex items-center justify-center min-h-screen text-red-600 font-bold">{error}</div>;

    if (isSuccess) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-light-bg">
                <div className="w-full max-w-2xl p-8 text-center bg-white rounded-xl shadow-lg">
                     <h1 className="text-3xl font-bold text-green-600">Děkujeme!</h1>
                     <p className="mt-4 text-lg text-gray-700">Vaše rezervace vozidla <strong>{reservation?.vehicles?.name}</strong> byla úspěšně dokončena. Všechny podrobnosti jsme Vám zaslali na e-mail. Těšíme se na Vás.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg py-12">
            <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-primary">Dokončení rezervace</h1>
                    <p className="mt-2 text-gray-600">Pro vozidlo: <strong className="text-black">{reservation?.vehicles?.name}</strong></p>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="first_name" placeholder="Křestní jméno" onChange={handleChange} required className="w-full p-2 border rounded" />
                        <input name="last_name" placeholder="Příjmení" onChange={handleChange} required className="w-full p-2 border rounded" />
                        <input name="email" type="email" placeholder="E-mail" onChange={handleChange} required className="w-full p-2 border rounded" />
                        <input name="phone" placeholder="Telefon" onChange={handleChange} required className="w-full p-2 border rounded" />
                    </div>
                    <input name="address" placeholder="Celá adresa" onChange={handleChange} required className="w-full p-2 border rounded" />
                    <input name="driver_license_number" placeholder="Číslo řidičského průkazu" onChange={handleChange} required className="w-full p-2 border rounded" />
                    
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fotografie řidičského průkazu</label>
                         <label htmlFor="file-upload" className="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
                            <span className="flex items-center space-x-2">
                                <UploadCloud className="w-6 h-6 text-gray-600" />
                                <span className="font-medium text-gray-600">
                                    {file ? file.name : 'Klikněte pro nahrání souboru'}
                                </span>
                            </span>
                            <input id="file-upload" name="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                        </label>
                    </div>

                    <div>
                        <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:bg-gray-400">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Odeslat a dokončit rezervaci'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerPortal;
