// Fix: Replaced API logic with actual type definitions. This file should only contain types.
export enum Page {
    DASHBOARD = 'DASHBOARD',
    RESERVATIONS = 'RESERVATIONS',
    VEHICLES = 'VEHICLES',
    CUSTOMERS = 'CUSTOMERS',
    CONTRACTS = 'CONTRACTS',
    FINANCIALS = 'FINANCIALS',
    REPORTS = 'REPORTS',
}

export interface Notification {
    id: string;
    message: string;
    type: 'info' | 'warning';
    createdAt: Date;
    isRead: boolean;
    page?: Page;
}

export interface Vehicle {
    id: string;
    name: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    status: 'available' | 'rented' | 'maintenance';
    imageUrl: string;
    rate4h: number;
    rate12h: number;
    dailyRate: number;
    features: string[];
    currentMileage: number;
}

export interface Customer {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    driver_license_number: string;
    driverLicenseImageUrl?: string;
}

export interface Reservation {
    id: string;
    customerId: string;
    vehicleId: string;
    startDate: Date;
    endDate: Date;
    status: 'scheduled' | 'active' | 'completed' | 'pending-customer';
    customer?: Customer;
    vehicle?: Vehicle;
    portalToken?: string;
    startMileage?: number;
    endMileage?: number;
    notes?: string;
}

export interface Contract {
    id: string;
    reservationId: string;
    customerId: string;
    vehicleId: string;
    contractText: string;
    generatedAt: Date;
    customer?: Customer;
    vehicle?: Vehicle;
}

export type ExpenseCategory = 'palivo' | 'udrzba' | 'pojisteni' | 'marketing' | 'ostatni';

export const EXPENSE_CATEGORIES: { [key in ExpenseCategory]: string } = {
    palivo: 'Palivo',
    udrzba: 'Údržba a servis',
    pojisteni: 'Pojištění',
    marketing: 'Marketing',
    ostatni: 'Ostatní',
};

export interface FinancialTransaction {
    id: string;
    reservationId?: string;
    description: string;
    amount: number;
    date: Date;
    type: 'income' | 'expense';
    category?: ExpenseCategory;
}
