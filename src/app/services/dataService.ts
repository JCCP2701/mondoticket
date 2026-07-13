import { supabase } from './supabaseClient';
import { AuthUser, UserRole } from '../context/AuthContext';

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

export interface TicketType {
    id: string;
    name: string;
    description: string | null;
    price: number;
    capacity: number;
    sold: number;
}

export interface EventRecord {
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    category: string | null;
    venueId: string;
    venueName: string;
    date: string;
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
    ticketTypes: TicketType[];
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

function mapOrganization(row: any): Organization {
    return {
        id: row.id,
        name: row.name,
        legalName: row.legal_name,
        rfc: row.rfc,
        address: row.address,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        feePercentage: Number(row.fee_percentage),
        paymentTerms: row.payment_terms,
        contractNotes: row.contract_notes ?? undefined,
        status: row.status,
        createdAt: row.created_at,
    };
}

function mapEvent(row: any): EventRecord {
    return {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        description: row.description,
        category: row.category,
        venueId: row.venue_id,
        venueName: row.venues?.name ?? '',
        date: row.event_date,
        status: row.status,
        ticketTypes: (row.event_ticket_types ?? []).map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            price: Number(t.price),
            capacity: t.capacity,
            sold: t.sold,
        })),
    };
}

const EVENT_SELECT = 'id, organization_id, name, description, category, venue_id, event_date, status, venues(name), event_ticket_types(id, name, description, price, capacity, sold)';

// ─── Data Service ─────────────────────────────────────────────────────────────
export const dataService = {
    // Organizations
    async getOrganizations(): Promise<Organization[]> {
        const { data, error } = await supabase.from('organizations').select('*').order('created_at');
        if (error) throw error;
        return (data ?? []).map(mapOrganization);
    },

    async createOrganization(org: {
        name: string; legalName: string; rfc: string; address: string;
        contactName: string; contactEmail: string; contactPhone: string; feePercentage: number;
        paymentTerms: number; contractNotes?: string;
    }): Promise<Organization> {
        const { data, error } = await supabase
            .from('organizations')
            .insert({
                name: org.name,
                legal_name: org.legalName,
                rfc: org.rfc,
                address: org.address,
                contact_name: org.contactName,
                contact_email: org.contactEmail,
                contact_phone: org.contactPhone,
                fee_percentage: org.feePercentage,
                payment_terms: org.paymentTerms,
                contract_notes: org.contractNotes ?? null,
            })
            .select('*')
            .single();
        if (error) throw error;
        return mapOrganization(data);
    },

    async updateOrganizationFee(id: string, fee: number): Promise<void> {
        const { error } = await supabase.from('organizations').update({ fee_percentage: fee }).eq('id', id);
        if (error) throw error;
    },

    // Events
    async getEvents(): Promise<EventRecord[]> {
        const { data, error } = await supabase.from('events').select(EVENT_SELECT).order('event_date');
        if (error) throw error;
        return (data ?? []).map(mapEvent);
    },

    async getEventsByOrganization(orgId: string): Promise<EventRecord[]> {
        const { data, error } = await supabase
            .from('events')
            .select(EVENT_SELECT)
            .eq('organization_id', orgId)
            .order('event_date');
        if (error) throw error;
        return (data ?? []).map(mapEvent);
    },

    async getEventById(id: string): Promise<EventRecord | null> {
        const { data, error } = await supabase.from('events').select(EVENT_SELECT).eq('id', id).single();
        if (error) return null;
        return mapEvent(data);
    },

    async createEvent(input: {
        organizationId: string;
        name: string;
        description: string;
        category: string;
        venueName: string;
        venueAddress: string;
        date: string;
        instructions?: string;
        ticketTypes: { name: string; description?: string; price: number; capacity: number }[];
    }): Promise<EventRecord> {
        const { data: venue, error: venueError } = await supabase
            .from('venues')
            .insert({ organization_id: input.organizationId, name: input.venueName, address: input.venueAddress })
            .select('*')
            .single();
        if (venueError) throw venueError;

        const { data: event, error: eventError } = await supabase
            .from('events')
            .insert({
                organization_id: input.organizationId,
                venue_id: venue.id,
                name: input.name,
                description: input.description,
                category: input.category,
                event_date: input.date,
                instructions: input.instructions,
            })
            .select('*')
            .single();
        if (eventError) throw eventError;

        const { error: typesError } = await supabase.from('event_ticket_types').insert(
            input.ticketTypes.map((t, i) => ({
                event_id: event.id,
                name: t.name,
                description: t.description ?? null,
                price: t.price,
                capacity: t.capacity,
                sort_order: i,
            }))
        );
        if (typesError) throw typesError;

        const created = await dataService.getEventById(event.id);
        if (!created) throw new Error('Failed to load created event');
        return created;
    },

    // Users (profiles) — readable by the profile owner or a superadmin (RLS-enforced)
    async getUsers(): Promise<AuthUser[]> {
        const { data, error } = await supabase.from('profiles').select('id, name, email, role, organizations(name)');
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role as UserRole,
            avatar: row.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
            organizationName: row.organizations?.name,
        }));
    },

    // Global Stats for Super Admin
    async getGlobalStats() {
        const [events, orgs] = await Promise.all([dataService.getEvents(), dataService.getOrganizations()]);

        let totalSold = 0;
        let totalCapacity = 0;
        let totalRevenue = 0;
        let totalProfit = 0;

        for (const event of events) {
            const org = orgs.find((o) => o.id === event.organizationId);
            const fee = org ? org.feePercentage : 10;
            for (const type of event.ticketTypes) {
                totalSold += type.sold;
                totalCapacity += type.capacity;
                const revenue = type.sold * type.price;
                totalRevenue += revenue;
                totalProfit += (revenue * fee) / 100;
            }
        }

        return {
            totalSold,
            totalCapacity,
            totalRevenue,
            totalProfit,
            orgCount: orgs.length,
            eventCount: events.length,
        };
    },
};
