import { createClient, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { User, FinancialTransaction, Vehicle, Reservation, Customer, Contract, Notification, ReservationStatus } from '../types.ts';

// Initialize Supabase client
const supabaseUrl = (window as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (window as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL a Anon Key musí být nastaveny v souboru index.html");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- AUTH ---
const mapSupabaseUser = (user: SupabaseUser | null): User | null => {
    if (!user) return null;
    return {
        id: user.id,
        email: user.email ?? null
    };
};

export const signInWithPassword = async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return mapSupabaseUser(data.user)!;
};

export const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
        callback(mapSupabaseUser(session?.user ?? null));
    });
    return () => subscription?.unsubscribe();
};


// --- DATA FETCHING ---
export const getVehicles = async (): Promise<Vehicle[]> => {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) throw error;
    return data as Vehicle[];
};

export const getCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('customers').select('*').order('last_name', { ascending: true });
    if (error) throw error;
    return data as Customer[];
};

export const getReservations = async (): Promise<Reservation[]> => {
    const { data, error } = await supabase
        .from('reservations')
        .select(`*, vehicles(name, license_plate), customers(first_name, last_name)`);
    if (error) throw error;
    return data as Reservation[];
};

export const getFinancials = async (): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase.from('financial_transactions').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data as FinancialTransaction[];
};

export const getContracts = async (): Promise<Contract[]> => {
    const { data, error } = await supabase
        .from('contracts')
        .select(`*, customers(first_name, last_name), vehicles(name, license_plate)`)
        .order('generated_at', { ascending: false });
    if (error) throw error;
    return data as Contract[];
};


// --- DATA MUTATION ---

export const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').insert(customer).select();
    if (error) throw error;
    return data[0] as Customer;
}

export const updateCustomer = async (id: string, customer: Partial<Omit<Customer, 'id'>>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').update(customer).eq('id', id).select();
    if (error) throw error;
    return data[0] as Customer;
}

export const addExpense = async (expense: Omit<FinancialTransaction, 'id' | 'type'>): Promise<FinancialTransaction> => {
    const newExpense = { ...expense, type: 'expense' as const };
    const { data, error } = await supabase.from('financial_transactions').insert(newExpense).select();
    if (error) throw error;
    return data[0] as FinancialTransaction;
};

// Fix: Added the missing createPendingReservation function.
export const createPendingReservation = async (vehicleId: string, startDate: Date, endDate: Date): Promise<Reservation> => {
    const portalToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const reservationData = {
        vehicle_id: vehicleId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'pending-customer' as const,
        customer_id: null,
        portal_token: portalToken,
    };
    const { data, error } = await supabase
        .from('reservations')
        .insert(reservationData)
        .select()
        .single();
    if (error) throw error;
    return data as Reservation;
};

export const createReservationWithContract = async (reservationData: Omit<Reservation, 'id' | 'status'>, contractText: string, customer: Customer, vehicle: Vehicle) => {
    // 1. Vytvoření rezervace
    const { data: reservationResult, error: reservationError } = await supabase
        .from('reservations')
        .insert({ ...reservationData, status: 'scheduled' })
        .select()
        .single();

    if (reservationError) throw reservationError;

    const newReservation: Reservation = reservationResult;

    // 2. Vytvoření smlouvy
    const { error: contractError } = await supabase
        .from('contracts')
        .insert({
            reservation_id: newReservation.id,
            customer_id: customer.id,
            vehicle_id: vehicle.id,
            generated_at: new Date().toISOString(),
            contract_text: contractText,
        });

    if (contractError) throw contractError;

    // 3. Aktualizace stavu vozidla
    const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'rented' })
        .eq('id', vehicle.id);

    if (vehicleError) throw vehicleError;

    // 4. Vytvoření příjmu
    if (newReservation.total_price && newReservation.total_price > 0) {
        const { error: financialError } = await supabase
            .from('financial_transactions')
            .insert({
                reservation_id: newReservation.id,
                amount: newReservation.total_price,
                date: newReservation.start_date,
                description: `Pronájem: ${vehicle.name} (${customer.first_name} ${customer.last_name})`,
                type: 'income',
            });
        if (financialError) throw financialError;
    }

    return newReservation;
};


export const updateReservationStatus = async (id: string, status: ReservationStatus, details: Partial<Reservation> = {}): Promise<Reservation> => {
    const { data, error } = await supabase
        .from('reservations')
        .update({ status, ...details })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data as Reservation;
};

export const completeReservation = async (reservation: Reservation, end_mileage: number, mileageFee: number): Promise<void> => {
    const { error: resError } = await supabase
        .from('reservations')
        .update({ status: 'completed', end_mileage })
        .eq('id', reservation.id);

    if (resError) throw resError;

    const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ status: 'available', current_mileage: end_mileage })
        .eq('id', reservation.vehicle_id);

    if (vehicleError) throw vehicleError;
    
    if (mileageFee > 0) {
        const { error: financialError } = await supabase
            .from('financial_transactions')
            .insert({
                reservation_id: reservation.id,
                amount: mileageFee,
                date: reservation.end_date,
                description: `Poplatek za překročení km: ${reservation.vehicles?.name} (${reservation.customers?.first_name} ${reservation.customers?.last_name})`,
                type: 'income',
            });
        if (financialError) throw financialError;
    }
}


// --- NOTIFICATIONS (MOCK) ---
export const getNotifications = (): Promise<Notification[]> => {
    return Promise.resolve([
        { id: '1', message: 'Rezervace pro Jan Novák začíná za 2 dny.', type: 'info', is_read: false, created_at: new Date(Date.now() - 3600000).toISOString(), related_entity: { type: 'reservation', id: 'res1' }},
        { id: '2', message: 'Vozidlu Ford Transit končí technická za 30 dní.', type: 'warning', is_read: true, created_at: new Date(Date.now() - 86400000).toISOString(), related_entity: { type: 'vehicle', id: 'v1' }},
    ]);
};
export const markNotificationAsRead = (id: string) => Promise.resolve();
export const markAllNotificationsAsRead = () => Promise.resolve();