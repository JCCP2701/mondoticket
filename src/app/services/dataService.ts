import { AuthUser, UserRole } from "../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Organization {
    id: string;
    name: string;
    legalName: string;
    rfc: string;
    address: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    feePercentage: number;
    paymentTerms: number;
    contractNotes?: string;
    status: 'active' | 'pending' | 'suspended';
    createdAt: string;
}

export interface Event {
    id: string;
    organizationId: string;
    name: string;
    date: string;
    venue: string;
    totalCapacity: number;
    sold: number;
    price: number;
    status: 'upcoming' | 'ongoing' | 'completed';
}

export interface Ticket {
    id: string;
    eventId: string;
    userId: string;
    purchaseDate: string;
    price: number;
    status: 'valid' | 'used' | 'cancelled';
}

// ─── Keys ─────────────────────────────────────────────────────────────────────
const KEYS = {
    ORGANIZATIONS: 'tb_organizations',
    EVENTS: 'tb_events',
    TICKETS: 'tb_tickets',
    USERS: 'tb_registered_users', // Matches AuthContext LS_REGISTERED_KEY
};

// ─── Persistence Helpers ──────────────────────────────────────────────────────
const get = <T>(key: string, defaultValue: T): T => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultValue;
    } catch {
        return defaultValue;
    }
};

const save = <T>(key: string, data: T) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// ─── Initial Data (if empty) ──────────────────────────────────────────────────
const INITIAL_ORGANIZATIONS: Organization[] = [
    {
        id: "ORG001",
        name: "EventPro México",
        legalName: "EventPro México S.A. de C.V.",
        rfc: "EPM950101ABC",
        address: "Av. Reforma 123, CDMX",
        contactName: "Juan Pérez",
        contactEmail: "juan@eventpro.mx",
        contactPhone: "5512345678",
        feePercentage: 10,
        paymentTerms: 15,
        status: "active",
        createdAt: new Date().toISOString(),
    }
];

const INITIAL_EVENTS: Event[] = [
    {
        id: "EVT001",
        organizationId: "ORG001",
        name: "Festival Indie CDMX 2026",
        date: "2026-03-15",
        venue: "Foro Sol",
        totalCapacity: 5000,
        sold: 4200,
        price: 1200,
        status: "upcoming",
    }
];

// ─── Data Service ─────────────────────────────────────────────────────────────
export const dataService = {
    // Organizations
    getOrganizations: (): Organization[] => {
        const orgs = get<Organization[]>(KEYS.ORGANIZATIONS, []);
        if (orgs.length === 0) {
            save(KEYS.ORGANIZATIONS, INITIAL_ORGANIZATIONS);
            return INITIAL_ORGANIZATIONS;
        }
        return orgs;
    },

    saveOrganization: (org: Omit<Organization, 'id' | 'createdAt' | 'status'>) => {
        const orgs = dataService.getOrganizations();
        const newOrg: Organization = {
            ...org,
            id: `ORG_${Date.now()}`,
            status: 'active',
            createdAt: new Date().toISOString(),
        };
        orgs.push(newOrg);
        save(KEYS.ORGANIZATIONS, orgs);
        return newOrg;
    },

    updateOrganizationFee: (id: string, fee: number) => {
        const orgs = dataService.getOrganizations();
        const updated = orgs.map(o => o.id === id ? { ...o, feePercentage: fee } : o);
        save(KEYS.ORGANIZATIONS, updated);
    },

    // Events
    getEvents: (): Event[] => {
        const events = get<Event[]>(KEYS.EVENTS, []);
        if (events.length === 0) {
            save(KEYS.EVENTS, INITIAL_EVENTS);
            return INITIAL_EVENTS;
        }
        return events;
    },

    getEventsByOrganization: (orgId: string): Event[] => {
        return dataService.getEvents().filter(e => e.organizationId === orgId);
    },

    // Tickets
    getTickets: (): Ticket[] => get<Ticket[]>(KEYS.TICKETS, []),

    // Users
    getUsers: (): AuthUser[] => {
        const registered = get<(AuthUser & { password?: string })[]>(KEYS.USERS, []);
        // Include mock users from AuthContext logic if needed, but LS_REGISTERED_KEY is enough for dynamic ones
        return registered.map(({ password, ...user }) => user as AuthUser);
    },

    // Global Stats for Super Admin
    getGlobalStats: () => {
        const events = dataService.getEvents();
        const orgs = dataService.getOrganizations();

        const totalSold = events.reduce((sum, e) => sum + e.sold, 0);
        const totalCapacity = events.reduce((sum, e) => sum + e.totalCapacity, 0);
        const totalRevenue = events.reduce((sum, e) => sum + (e.sold * e.price), 0);

        // Profit is based on each organization's fee percentage
        const totalProfit = events.reduce((sum, e) => {
            const org = orgs.find(o => o.id === e.organizationId);
            const fee = org ? org.feePercentage : 10;
            return sum + (e.sold * e.price * fee / 100);
        }, 0);

        return {
            totalSold,
            totalCapacity,
            totalRevenue,
            totalProfit,
            orgCount: orgs.length,
            eventCount: events.length
        };
    }
};
