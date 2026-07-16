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
    hasSeatMap: boolean;
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
    hasSeatMap: boolean;
}

export interface SeatRecord {
    id: string;
    ticketTypeId: string;
    section: string | null;
    rowLabel: string;
    seatNumber: string;
    rowIndex: number;
    colIndex: number;
    status: 'available' | 'held' | 'sold';
}

export interface TicketRecord {
    id: string;
    orderId: string;
    ticketTypeId: string;
    ticketTypeName: string;
    unitPrice: number;
    status: 'valid' | 'used' | 'cancelled';
    seatLabel: string | null;
    refundedAt: string | null;
    customerName: string;
    customerEmail: string;
    orderTotal: number;
    createdAt: string;
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
            hasSeatMap: (t.event_seats?.[0]?.count ?? 0) > 0,
        })),
        // True if ANY ticket type has a seat map — used only where a
        // per-event summary is useful (e.g. showing the "seat map" button).
        // Checkout/taquilla must branch per ticket type, not on this,
        // since a single event can mix seat-mapped and quantity-based types.
        hasSeatMap: (row.event_ticket_types ?? []).some((t: any) => (t.event_seats?.[0]?.count ?? 0) > 0),
    };
}

function mapSeat(row: any): SeatRecord {
    return {
        id: row.id,
        ticketTypeId: row.ticket_type_id,
        section: row.section,
        rowLabel: row.row_label,
        seatNumber: row.seat_number,
        rowIndex: row.row_index,
        colIndex: row.col_index,
        status: row.status,
    };
}

const EVENT_SELECT = 'id, organization_id, name, description, category, venue_id, event_date, status, venues(name), event_ticket_types(id, name, description, price, capacity, sold, event_seats(count))';

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
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, email, role, mfa_exempt, organization_members(organization_id, organizations(id, name))');
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role as UserRole,
            avatar: row.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
            organizations: (row.organization_members ?? [])
                .map((m: any) => m.organizations)
                .filter(Boolean)
                .map((o: any) => ({ id: o.id, name: o.name })),
            mfaExempt: row.mfa_exempt ?? false,
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

    // Seat map
    async getSeatMap(eventId: string): Promise<SeatRecord[]> {
        const { data, error } = await supabase
            .from('event_seats')
            .select('*')
            .eq('event_id', eventId)
            .order('row_index')
            .order('col_index');
        if (error) throw error;
        return (data ?? []).map(mapSeat);
    },

    async saveSeatMap(
        eventId: string,
        seats: { rowIndex: number; colIndex: number; rowLabel: string; seatNumber: string; ticketTypeId: string; section?: string }[]
    ): Promise<void> {
        const existing = await dataService.getSeatMap(eventId);
        const key = (rowIndex: number, colIndex: number) => `${rowIndex}-${colIndex}`;
        const existingByPos = new Map(existing.map((s) => [key(s.rowIndex, s.colIndex), s]));
        const newPositions = new Set(seats.map((s) => key(s.rowIndex, s.colIndex)));

        const toDelete = existing.filter((s) => !newPositions.has(key(s.rowIndex, s.colIndex))).map((s) => s.id);
        if (toDelete.length) {
            const { error } = await supabase.from('event_seats').delete().in('id', toDelete);
            if (error) throw error;
        }

        const toInsert = seats.filter((s) => !existingByPos.has(key(s.rowIndex, s.colIndex)));
        if (toInsert.length) {
            const { error } = await supabase.from('event_seats').insert(
                toInsert.map((s) => ({
                    event_id: eventId,
                    ticket_type_id: s.ticketTypeId,
                    section: s.section ?? null,
                    row_label: s.rowLabel,
                    seat_number: s.seatNumber,
                    row_index: s.rowIndex,
                    col_index: s.colIndex,
                }))
            );
            if (error) throw error;
        }

        for (const s of seats) {
            const prior = existingByPos.get(key(s.rowIndex, s.colIndex));
            if (prior && prior.ticketTypeId !== s.ticketTypeId) {
                const { error } = await supabase
                    .from('event_seats')
                    .update({ ticket_type_id: s.ticketTypeId, section: s.section ?? null })
                    .eq('id', prior.id);
                if (error) throw error;
            }
        }
    },

    async holdSeats(eventId: string, seatIds: string[]): Promise<{ seatId: string; holdExpiresAt: string }[]> {
        const { data, error } = await supabase.rpc('hold_event_seats', { p_event_id: eventId, p_seat_ids: seatIds });
        if (error) throw error;
        return (data ?? []).map((r: any) => ({ seatId: r.seat_id, holdExpiresAt: r.hold_expires_at }));
    },

    async releaseSeats(seatIds: string[]): Promise<void> {
        const { error } = await supabase.rpc('release_event_seats', { p_seat_ids: seatIds });
        if (error) throw error;
    },

    // Purchase — covers online self-checkout, $0 courtesy tickets, and
    // taquilla walk-in sales; the RPC's own authorization decides what a
    // given caller/userId combination is allowed to do.
    async createOrder(input: {
        eventId: string;
        organizationId: string;
        userId: string | null;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        paymentIntentId: string;
        items?: { ticketTypeId: string; quantity: number }[];
        seatIds?: string[];
    }): Promise<string> {
        const { data, error } = await supabase.rpc('create_order_and_tickets', {
            p_event_id: input.eventId,
            p_organization_id: input.organizationId,
            p_user_id: input.userId,
            p_customer_name: input.customerName,
            p_customer_email: input.customerEmail,
            p_customer_phone: input.customerPhone,
            p_stripe_payment_intent_id: input.paymentIntentId,
            p_items: input.items ? input.items.map((i) => ({ ticket_type_id: i.ticketTypeId, quantity: i.quantity })) : null,
            p_seat_ids: input.seatIds ?? null,
        });
        if (error) throw error;
        return data as string;
    },

    // Orders/tickets for an event (organizer/superadmin view — RLS-scoped)
    async getTicketsForEvent(eventId: string): Promise<TicketRecord[]> {
        const { data, error } = await supabase
            .from('tickets')
            .select(
                'id, order_id, ticket_type_id, status, refunded_at, created_at, event_ticket_types(name, price), event_seats(row_label, seat_number), orders(customer_name, customer_email, total)'
            )
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
            id: row.id,
            orderId: row.order_id,
            ticketTypeId: row.ticket_type_id,
            ticketTypeName: row.event_ticket_types?.name ?? '',
            unitPrice: Number(row.event_ticket_types?.price ?? 0),
            status: row.status,
            seatLabel: row.event_seats ? `${row.event_seats.row_label}-${row.event_seats.seat_number}` : null,
            refundedAt: row.refunded_at,
            customerName: row.orders?.customer_name ?? '',
            customerEmail: row.orders?.customer_email ?? '',
            orderTotal: Number(row.orders?.total ?? 0),
            createdAt: row.created_at,
        }));
    },

    // Courtesy ($0 ticket) and refund counts across many events in one
    // query, for org/superadmin dashboards that list several events at once
    // (avoids an N+1 per-event round trip).
    async getEventStatsSummary(eventIds: string[]): Promise<Record<string, { courtesyCount: number; refundedCount: number }>> {
        const result: Record<string, { courtesyCount: number; refundedCount: number }> = {};
        for (const id of eventIds) result[id] = { courtesyCount: 0, refundedCount: 0 };
        if (eventIds.length === 0) return result;

        const { data, error } = await supabase
            .from('tickets')
            .select('event_id, status, event_ticket_types(price)')
            .in('event_id', eventIds);
        if (error) throw error;

        for (const row of (data ?? []) as any[]) {
            const bucket = result[row.event_id] ?? (result[row.event_id] = { courtesyCount: 0, refundedCount: 0 });
            if (Number(row.event_ticket_types?.price ?? 0) === 0) bucket.courtesyCount++;
            if (row.status === 'cancelled') bucket.refundedCount++;
        }
        return result;
    },

    async refundTickets(ticketIds: string[]): Promise<void> {
        const { error } = await supabase.rpc('refund_tickets', { p_ticket_ids: ticketIds });
        if (error) throw error;
    },

    // Box-office (taquilla) staff account creation — goes through a
    // serverless function since creating a real auth user needs the
    // service-role key, which must never reach the browser.
    async inviteStaff(
        name: string,
        email: string,
        role: 'organization' | 'taquilla',
        organizationIds: string[]
    ): Promise<{ email: string; temporaryPassword: string }> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const res = await fetch('/api/organization/invite-staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ name, email, role, organizationIds }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to invite staff');
        return json;
    },

    // Organization membership management (superadmin-only per RLS)
    async getOrganizationMembers(organizationId: string): Promise<AuthUser[]> {
        const { data, error } = await supabase
            .from('organization_members')
            .select('profiles(id, name, email, role, mfa_exempt)')
            .eq('organization_id', organizationId);
        if (error) throw error;
        return (data ?? [])
            .map((row: any) => row.profiles)
            .filter(Boolean)
            .map((p: any) => ({
                id: p.id,
                name: p.name,
                email: p.email,
                role: p.role as UserRole,
                avatar: p.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
                organizations: [],
                mfaExempt: p.mfa_exempt ?? false,
            }));
    },

    async addExistingUserToOrganization(profileId: string, organizationId: string): Promise<void> {
        const { error } = await supabase.from('organization_members').insert({ profile_id: profileId, organization_id: organizationId });
        if (error) throw error;
    },

    async findProfileByEmail(email: string): Promise<{ id: string; name: string; email: string; role: UserRole } | null> {
        const { data, error } = await supabase.from('profiles').select('id, name, email, role').eq('email', email).maybeSingle();
        if (error || !data) return null;
        return data as any;
    },
};
