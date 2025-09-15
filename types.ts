// Enums
export enum Page {
    DASHBOARD = 'DASHBOARD',
    RESERVATIONS = 'RESERVATIONS',
    VEHICLES = 'VEHICLES',
    CUSTOMERS = 'CUSTOMERS',
    CONTRACTS = 'CONTRACTS',
    FINANCIALS = 'FINANCIALS',
    REPORTS = 'REPORTS',
}

export type VehicleStatus = 'available' | 'rented' | 'maintenance';
export type ReservationStatus = 'pending-customer' | 'scheduled' | 'active' | 'completed' | 'cancelled';
export type TransactionType = 'income' | 'expense';
export type ExpenseCategory = 'servis' | 'pojisteni' | 'pohonne_hmoty' | 'marketing' | 'ostatni';

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
    servis: 'Servis a údržba',
    pojisteni: 'Pojištění',
    pohonne_hmoty: 'Pohonné hmoty',
    marketing: 'Marketing',
    ostatni: 'Ostatní',
};

// Data models
export interface User {
    id: string;
    // Fix: The Supabase user object has an optional email property. Making email optional here ensures type compatibility.
    email?: string | null;
}

export interface Vehicle {
    id: string;
    name: string;
    license_plate: string;
    status: VehicleStatus;
    image_url?: string;
    daily_rate: number;
    rate4h: number;
    rate12h: number;
    current_mileage: number;
}

export interface Customer {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address?: string;
    id_card_number?: string;
    driver_license_number?: string;
    driver_license_image_url?: string;
}

export interface Reservation {
    id: string;
    start_date: string; // ISO string
    end_date: string; // ISO string
    vehicle_id: string;
    customer_id: string | null;
    status: ReservationStatus;
    total_price?: number;
    portal_token?: string;
    notes?: string;
    start_mileage?: number;
    end_mileage?: number;

    // For joining data
    vehicles?: Pick<Vehicle, 'name' | 'license_plate'>;
    customers?: Pick<Customer, 'first_name' | 'last_name'>;
}

export interface Contract {
    id: string;
    reservation_id: string;
    customer_id: string;
    vehicle_id: string;
    generated_at: string; // ISO string
    contract_text: string;
    
    // Joined data
    customers?: Pick<Customer, 'first_name' | 'last_name'>;
    vehicles?: Pick<Vehicle, 'name' | 'license_plate'>;
}

export interface FinancialTransaction {
    id: string;
    type: TransactionType;
    description: string;
    amount: number;
    date: string; // ISO string
    category?: ExpenseCategory;
    reservation_id?: string;
}

export interface Notification {
    id: string;
    message: string;
    type: 'info' | 'warning';
    is_read: boolean;
    created_at: string; // ISO string
    related_entity?: {
        type: 'reservation' | 'vehicle';
        id: string;
    };
}