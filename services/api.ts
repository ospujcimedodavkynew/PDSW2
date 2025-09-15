import { createClient, Session, RealtimeChannel } from '@supabase/supabase-js';
import type { Vehicle, Customer, Reservation, Contract, FinancialTransaction, ExpenseCategory } from '../types';

// Načtení konfigurace z globálního objektu window, který je definován v index.html
const env = (window as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;


// Exportujeme stav, aby UI mohlo reagovat a zobrazit chybovou hlášku.
// Kontrolujeme, zda hodnoty nejsou výchozí placeholdery.
export const areSupabaseCredentialsSet = 
    !!(supabaseUrl && supabaseAnonKey && 
    !supabaseUrl.includes("vasedomena") && 
    !supabaseAnonKey.includes("vas_anon_public_klic"));

const supabase = areSupabaseCredentialsSet ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Helper, který zajistí, že nevoláme funkce, pokud není klient nakonfigurován
const getClient = () => {
    if (!supabase) {
        throw new Error("Supabase client is not initialized. Check your environment variables in index.html.");
    }
    return supabase;
}

// Helper pro zpracování chyb od Supabase
const handleSupabaseError = (error: any, context: string) => {
    if (error) {
        console.error(`Error in ${context}:`, error);
        throw new Error(error.message);
    }
};

// --- Authentication API ---

export const signInWithPassword = async (email: string, password: string) => {
    const { error } = await getClient().auth.signInWithPassword({ email, password });
    if (error) {
        if (error.message === 'Invalid login credentials') {
            throw new Error('Neplatné přihlašovací údaje. Zkontrolujte prosím e-mail a heslo.');
        }
        throw error;
    }
};

export const signOut = async () => {
    const { error } = await getClient().auth.signOut();
    handleSupabaseError(error, 'signOut');
};

export const getSession = async (): Promise<Session | null> => {
    const { data, error } = await getClient().auth.getSession();
    handleSupabaseError(error, 'getSession');
    return data.session;
}

export const onAuthChange = (callback: (session: Session | null) => void) => {
    const { data: { subscription } } = getClient().auth.onAuthStateChange((_event, session) => {
        callback(session);
    });
    return subscription;
};

// --- Vehicles API ---

export const getVehicles = async (): Promise<Vehicle[]> => {
    const { data, error } = await getClient().from('vehicles').select('*').order('name', { ascending: true });
    handleSupabaseError(error, 'getVehicles');
    return data || [];
};

export const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'imageUrl'>): Promise<Vehicle> => {
    const newVehicleData = { ...vehicle, imageUrl: 'https://placehold.co/600x400/1E40AF/white?text=Vozidlo' }; // Default image
    const { data, error } = await getClient().from('vehicles').insert([newVehicleData]).select();
    handleSupabaseError(error, 'addVehicle');
    if (!data) throw new Error("Vehicle creation failed.");
    return data[0];
};

export const updateVehicle = async (vehicle: Partial<Vehicle> & { id: string }): Promise<Vehicle> => {
    const { id, ...updateData } = vehicle;
    const { data, error } = await getClient().from('vehicles').update(updateData).eq('id', id).select();
    handleSupabaseError(error, 'updateVehicle');
    if (!data) throw new Error("Vehicle update failed.");
    return data[0];
};

// --- Customers API ---

export const getCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await getClient().from('customers').select('*').order('lastName', { ascending: true });
    handleSupabaseError(error, 'getCustomers');
    return data || [];
};

export const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
    const { data, error } = await getClient().from('customers').insert([customer]).select();
    handleSupabaseError(error, 'addCustomer');
    if (!data) throw new Error("Customer creation failed.");
    return data[0];
};

export const updateCustomer = async (customer: Partial<Customer> & { id: string }): Promise<Customer> => {
    const { id, ...updateData } = customer;
    const { data, error } = await getClient().from('customers').update(updateData).eq('id', id).select();
    handleSupabaseError(error, 'updateCustomer');
    if (!data) throw new Error("Customer update failed.");
    return data[0];
};

// --- Reservations API ---

export const getReservations = async (): Promise<Reservation[]> => {
    const { data, error } = await getClient()
        .from('reservations')
        .select(`
            *,
            customer:customers(*),
            vehicle:vehicles(*)
        `)
        .order('startDate', { ascending: true });
    handleSupabaseError(error, 'getReservations');
    return (data || []).map(r => ({
        ...r,
        startDate: new Date(r.startDate),
        endDate: new Date(r.endDate),
    }));
};

export const addReservation = async (reservation: Omit<Reservation, 'id' | 'customer' | 'vehicle'>): Promise<Reservation> => {
    const { data, error } = await getClient().from('reservations').insert([reservation]).select();
    handleSupabaseError(error, 'addReservation');
    if (!data) throw new Error("Reservation creation failed.");
    return data[0];
};

export const updateReservation = async (id: string, updates: Partial<Reservation>): Promise<Reservation> => {
    const { data, error } = await getClient().from('reservations').update(updates).eq('id', id).select();
    handleSupabaseError(error, 'updateReservation');
    if (!data) throw new Error("Reservation update failed.");
    return data[0];
};

export const deleteReservation = async (id: string): Promise<void> => {
    const { error } = await getClient().from('reservations').delete().eq('id', id);
    handleSupabaseError(error, 'deleteReservation');
};

export const activateReservation = async (id: string, startMileage: number): Promise<void> => {
    // 1. Update reservation status and start mileage
    const { data: reservation, error: resError } = await getClient()
        .from('reservations')
        .update({ status: 'active', startMileage })
        .eq('id', id)
        .select('vehicleId')
        .single();
    handleSupabaseError(resError, 'activateReservation: update reservation');
    if (!reservation) throw new Error('Reservation not found');
    
    // 2. Update vehicle status to 'rented' and current mileage
    const { error: vehicleError } = await getClient()
        .from('vehicles')
        .update({ status: 'rented', currentMileage: startMileage })
        .eq('id', reservation.vehicleId);
    handleSupabaseError(vehicleError, 'activateReservation: update vehicle');
};


export const completeReservation = async (id: string, endMileage: number, notes: string): Promise<void> => {
    const client = getClient();
    // 1. Fetch reservation to get vehicle ID
    const { data: reservation, error: fetchError } = await client
        .from('reservations')
        .select('vehicleId, customerId, startDate, endDate, startMileage')
        .eq('id', id)
        .single();
    handleSupabaseError(fetchError, 'completeReservation: fetch reservation');
    if (!reservation) throw new Error("Reservation not found.");

    // 2. Update reservation status, end mileage and notes
    const { error: updateResError } = await client
        .from('reservations')
        .update({ status: 'completed', endMileage, notes })
        .eq('id', id);
    handleSupabaseError(updateResError, 'completeReservation: update reservation');

    // 3. Update vehicle status and mileage
    const { error: vehicleError } = await client
        .from('vehicles')
        .update({ status: 'available', currentMileage: endMileage })
        .eq('id', reservation.vehicleId);
    handleSupabaseError(vehicleError, 'completeReservation: update vehicle');
    
    // 4. Create financial transaction
    const { data: vehicleDetails, error: vehicleDetailsError } = await client.from('vehicles').select('dailyRate, rate12h, rate4h').eq('id', reservation.vehicleId).single();
    if (vehicleDetailsError) handleSupabaseError(vehicleDetailsError, 'completeReservation: fetch vehicle details');
    if (!vehicleDetails) throw new Error('Vehicle details not found');
    
    const durationMs = new Date(reservation.endDate).getTime() - new Date(reservation.startDate).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    let basePrice = 0;
    if (durationHours <= 4) {
        basePrice = vehicleDetails.rate4h;
    } else if (durationHours <= 12) {
        basePrice = vehicleDetails.rate12h;
    } else {
        const durationDays = Math.ceil(durationHours / 24);
        basePrice = durationDays * vehicleDetails.dailyRate;
    }

    const kmDriven = endMileage - (reservation.startMileage || 0);
    const rentalDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));
    const kmLimit = rentalDays * 300;
    const kmOver = Math.max(0, kmDriven - kmLimit);
    const extraCharge = kmOver * 3;
    const totalAmount = basePrice + extraCharge;

    const transaction: Omit<FinancialTransaction, 'id'> = {
        reservationId: id,
        amount: totalAmount,
        date: new Date(),
        description: `Pronájem vozidla (rezervace ${id.substring(0, 8)})`,
        type: 'income',
    };
    const { error: finError } = await client.from('financial_transactions').insert([transaction]);
    handleSupabaseError(finError, 'completeReservation: create transaction');
    
    // 5. Create contract (simple version)
    const { data: customerData, error: customerError } = await client.from('customers').select('*').eq('id', reservation.customerId).single();
    handleSupabaseError(customerError, 'completeReservation: fetch customer');
    if (!customerData) throw new Error('Customer not found for contract');
    
    const contractText = `Smlouva o pronájmu vozidla...\nZákazník: ${customerData.firstName} ${customerData.lastName}\n...`;
    const { error: contractError } = await client.from('contracts').insert([{
        reservationId: id,
        customerId: reservation.customerId,
        vehicleId: reservation.vehicleId,
        contractText,
        generatedAt: new Date(),
    }]);
    handleSupabaseError(contractError, 'completeReservation: create contract');
};

// --- Customer Portal API ---

export const getReservationByToken = async (token: string): Promise<Reservation | null> => {
    const { data, error } = await getClient()
        .from('reservations')
        .select(`
            *,
            vehicle:vehicles(*)
        `)
        .eq('portalToken', token)
        .single();

    handleSupabaseError(error, 'getReservationByToken');
    if (!data) return null;
    return {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
    };
};

export const submitCustomerDetails = async (token: string, customerDetails: Omit<Customer, 'id' | 'driverLicenseImageUrl'>, driverLicenseFile: File): Promise<void> => {
    const client = getClient();
    
    // 1. Get reservation from token
    const { data: reservation, error: resError } = await client
        .from('reservations')
        .select('id')
        .eq('portalToken', token)
        .eq('status', 'pending-customer')
        .single();
    handleSupabaseError(resError, 'submitCustomerDetails: get reservation');
    if (!reservation) throw new Error("Invalid or expired reservation link.");

    // 2. Upload driver license image
    const filePath = `driver_licenses/${reservation.id}-${driverLicenseFile.name}`;
    const { error: uploadError } = await client.storage
        .from('documents')
        .upload(filePath, driverLicenseFile, { upsert: true });
    handleSupabaseError(uploadError, 'submitCustomerDetails: upload file');

    // 3. Get public URL for the uploaded file
    const { data: urlData } = client.storage.from('documents').getPublicUrl(filePath);
    if (!urlData) throw new Error("Could not get public URL for the file.");

    // 4. Check if customer exists, if not, create one
    let { data: existingCustomer, error: findError } = await client
        .from('customers')
        .select('id')
        .eq('email', customerDetails.email)
        .single();
    
    let customerId = existingCustomer?.id;

    if (findError && findError.code !== 'PGRST116') { // PGRST116: no rows found
        handleSupabaseError(findError, 'submitCustomerDetails: find customer');
    }

    if (customerId) {
        // Update existing customer
        const { error: updateError } = await client
            .from('customers')
            .update({ ...customerDetails, driverLicenseImageUrl: urlData.publicUrl })
            .eq('id', customerId);
        handleSupabaseError(updateError, 'submitCustomerDetails: update customer');
    } else {
        // Create new customer
        const { data: newCustomer, error: createError } = await client
            .from('customers')
            .insert([{ ...customerDetails, driverLicenseImageUrl: urlData.publicUrl }])
            .select('id')
            .single();
        handleSupabaseError(createError, 'submitCustomerDetails: create customer');
        if (!newCustomer) throw new Error("Failed to create customer record.");
        customerId = newCustomer.id;
    }
    
    // 5. Update reservation with customer ID and change status
    const { error: updateResError } = await client
        .from('reservations')
        .update({ customerId: customerId, status: 'scheduled' })
        .eq('id', reservation.id);
    handleSupabaseError(updateResError, 'submitCustomerDetails: update reservation');
};

export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    const portalToken = crypto.randomUUID();
    const reservationData = {
        vehicleId,
        startDate,
        endDate,
        status: 'pending-customer' as const,
        portalToken
    };
    const { data, error } = await getClient().from('reservations').insert([reservationData]).select().single();
    handleSupabaseError(error, 'createPendingReservation');
    if (!data) throw new Error('Could not create pending reservation.');
    return data;
};

// --- Financials API ---

export const getFinancials = async (): Promise<FinancialTransaction[]> => {
    const { data, error } = await getClient()
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false });
    handleSupabaseError(error, 'getFinancials');
    return (data || []).map(t => ({...t, date: new Date(t.date)}));
};

export const addExpense = async (expense: Omit<FinancialTransaction, 'id' | 'type' | 'reservationId'>): Promise<FinancialTransaction> => {
    const expenseData = {
        ...expense,
        type: 'expense' as const,
    };
    const { data, error } = await getClient().from('financial_transactions').insert([expenseData]).select();
    handleSupabaseError(error, 'addExpense');
    if (!data) throw new Error("Expense creation failed.");
    return data[0];
};

// --- Contracts API ---

export const getContracts = async (): Promise<Contract[]> => {
    const { data, error } = await getClient()
        .from('contracts')
        .select(`
            *,
            customer:customers(*),
            vehicle:vehicles(*)
        `)
        .order('generatedAt', { ascending: false });
    handleSupabaseError(error, 'getContracts');
    return (data || []).map(c => ({...c, generatedAt: new Date(c.generatedAt)}));
};


// --- Real-time Subscriptions ---
// A map to hold references to subscribed channels to avoid duplicates and ensure proper cleanup
const subscribedChannels: Map<string, RealtimeChannel> = new Map();

export const onTableChange = (
    table: string, 
    callback: (payload: any) => void
): RealtimeChannel => {
    const client = getClient();
    const channelId = `public:${table}`;
    
    // Unsubscribe from any existing channel for this table to avoid duplicates
    if (subscribedChannels.has(channelId)) {
        subscribedChannels.get(channelId)!.unsubscribe();
    }

    const channel = client.channel(`realtime-any-${table}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: table },
            (payload) => {
                console.log(`Change received on ${table}!`, payload);
                callback(payload);
            }
        )
        .subscribe();

    subscribedChannels.set(channelId, channel);
    
    // The component that subscribes is responsible for unsubscribing on unmount
    return channel;
};
