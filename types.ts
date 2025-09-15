// Defines the available pages for navigation
export enum Page {
    DASHBOARD = 'dashboard',
    RESERVATIONS = 'reservations',
    VEHICLES = 'vehicles',
    CUSTOMERS = 'customers',
    CONTRACTS = 'contracts',
    FINANCIALS = 'financials',
    REPORTS = 'reports',
}

// Represents a notification in the system
export interface Notification {
    id: string; // Unique ID, e.g., 'res-update-123' or 'end-alert-456'
    message: string;
    type: 'info' | 'warning';
    createdAt: Date;
    isRead: boolean;
    page?: Page; // Optional page to navigate to on click
}

// Represents a vehicle in the fleet
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

// Represents a customer
export interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    driverLicenseNumber: string;
    address: string;
    driverLicenseImageUrl?: string;
}

// Represents a reservation
export interface Reservation {
    id: string;
    customerId: string;
    vehicleId: string;
    startDate: Date;
    endDate: Date;
    status: 'pending-customer' | 'scheduled' | 'active' | 'completed';
    portalToken?: string;
    notes?: string;
    customer?: Customer;
    vehicle?: Vehicle;
    startMileage?: number;
    endMileage?: number;
}

// Represents a contract
export interface Contract {
    id: string;
    reservationId: string;
    customerId: string;
    vehicleId: string;
    generatedAt: Date;
    contractText: string;
    customer: Customer;
    vehicle: Vehicle;
}

// Expense categories for financial tracking
export const EXPENSE_CATEGORIES = {
    servis: 'Servis a údržba',
    pojisteni: 'Pojištění',
    pohonne_hmoty: 'Pohonné hmoty',
    marketing: 'Marketing',
    ostatni: 'Ostatní',
};
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;


// Represents a financial transaction
export interface FinancialTransaction {
    id: string;
    reservationId?: string;
    amount: number;
    date: Date;
    description: string;
    type: 'income' | 'expense';
    category?: ExpenseCategory;
}
