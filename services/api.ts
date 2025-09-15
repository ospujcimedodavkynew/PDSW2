import { createClient } from '@supabase/supabase-js';
import type { Customer, Vehicle, Reservation, FinancialTransaction, ReservationStatus } from '../types.ts';

// It's recommended to use environment variables for Supabase credentials.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Auth ---
export const signInWithPassword = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
};

// --- Vehicles ---
export const getVehicles = async (): Promise<Vehicle[]> => {
    const { data, error } = await supabase.from('vehicles').select('*');
    if (error) throw error;
    return data;
};

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id'>): Promise<Vehicle> => {
    const { data, error } = await supabase.from('vehicles').insert([vehicleData]).select().single();
    if (error) throw error;
    return data;
};

export const updateVehicle = async (id: string, vehicleData: Partial<Omit<Vehicle, 'id'>>): Promise<Vehicle> => {
    const { data, error } = await supabase.from('vehicles').update(vehicleData).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

// --- Customers ---
export const getCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) throw error;
    return data;
};

export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').insert([customerData]).select().single();
    if (error) throw error;
    return data;
};

export const updateCustomer = async (id: string, customerData: Partial<Omit<Customer, 'id'>>): Promise<Customer> => {
    const { data, error } = await supabase.from('customers').update(customerData).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

// --- Reservations ---
export const getReservations = async (): Promise<Reservation[]> => {
    const { data, error } = await supabase.from('reservations').select('*, vehicles(name, license_plate), customers(first_name, last_name)');
    if (error) throw error;
    return data;
};

export const createPendingReservation = async (vehicle_id: string, start_date: Date, end_date: Date): Promise<Reservation> => {
    const portal_token = `token-${Math.random().toString(36).substring(2)}-${Date.now()}`;
    const { data, error } = await supabase.from('reservations').insert({
        vehicle_id,
        start_date: start_date.toISOString(),
        end_date: end_date.toISOString(),
        status: 'pending-customer',
        portal_token
    }).select().single();

    if (error) throw error;
    return data;
};

export const createReservationWithContract = async (
    reservationData: Pick<Reservation, 'start_date' | 'end_date' | 'vehicle_id' | 'customer_id' | 'total_price'>, 
    contractText: string,
    customer: Customer,
    vehicle: Vehicle
) => {
    // This should ideally be a database transaction or an RPC call in a real-world scenario
    const { data: reservation, error: resError } = await supabase.from('reservations').insert({
        ...reservationData,
        status: 'scheduled' as ReservationStatus,
    }).select().single();
    if (resError) throw resError;

    const { error: contractError } = await supabase.from('contracts').insert({
        reservation_id: reservation.id,
        customer_id: customer.id,
        vehicle_id: vehicle.id,
        contract_text: contractText,
        generated_at: new Date().toISOString(),
    });
    if (contractError) throw contractError;

    // Update vehicle status
    await updateVehicle(vehicle.id, { status: 'rented' });
};

export const updateReservationStatus = async (id: string, status: ReservationStatus, extraData: Partial<Reservation> = {}) => {
    const { data, error } = await supabase.from('reservations').update({ status, ...extraData }).eq('id', id).select().single();
    if (error) throw error;
    return data;
};

export const completeReservation = async (reservation: Reservation, end_mileage: number, mileageFee: number) => {
    // This should also be a transaction or RPC
    await supabase.from('reservations').update({
        status: 'completed',
        end_mileage,
    }).eq('id', reservation.id);

    await supabase.from('vehicles').update({ status: 'available' }).eq('id', reservation.vehicle_id);

    // Add income to financials
    const totalAmount = (reservation.total_price || 0) + mileageFee;
    await supabase.from('financials').insert({
        type: 'income',
        description: `Pronájem ${reservation.vehicles?.name} - ${reservation.customers?.first_name} ${reservation.customers?.last_name}`,
        amount: totalAmount,
        date: new Date().toISOString(),
        reservation_id: reservation.id,
    });
};

// --- Contracts ---
export const getContracts = async (): Promise<any[]> => {
    const { data, error } = await supabase.from('contracts').select('*, customers(first_name, last_name), vehicles(name, license_plate)').order('generated_at', { ascending: false });
    if (error) throw error;
    return data;
};

// --- Financials ---
export const getFinancials = async (): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase.from('financials').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
};

export const addExpense = async (expenseData: Omit<FinancialTransaction, 'id' | 'type' | 'reservation_id'>): Promise<FinancialTransaction> => {
    const { data, error } = await supabase.from('financials').insert([{ ...expenseData, type: 'expense' }]).select().single();
    if (error) throw error;
    return data;
};

// --- Notifications ---
export const getNotifications = async (): Promise<any[]> => {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const markNotificationAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
};

export const markAllNotificationsAsRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
};
