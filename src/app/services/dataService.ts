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
    maxEventsPerMonth?: number | null;
    courtesyTicketsPerEvent?: number | null;
    taquillaFeePercentage?: number | null;
    // Minutes a pending online order keeps seats/inventory reserved before
    // being lazily released back to public sale. Never applies to courtesy
    // or taquilla orders — those never enter a pending state.
    reservationHoldMinutes: number;
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
    imageUrl: string | null;
}

export interface SeatRecord {
    id: string;
    ticketTypeId: string;
    section: string | null;
    rowLabel: string;
    seatNumber: string;
    rowIndex: number;
    colIndex: number;
    status: 'available' | 'held' | 'reserved' | 'sold';
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

export interface MyTicketRecord {
    id: string;
    orderId: string;
    status: 'valid' | 'used' | 'cancelled';
    qrCode: string;
    ticketTypeName: string;
    unitPrice: number;
    seatLabel: string | null;
    eventId: string;
    eventName: string;
    eventDate: string;
    eventCategory: string | null;
    eventImageUrl: string | null;
    venueName: string;
    createdAt: string;
}

export interface BrokerContract {
    id: string;
    brokerProfileId: string;
    organizationId: string;
    organizationName: string;
    commissionBasis: 'ticket_revenue' | 'platform_fee';
    commissionPercentage: number;
    notes: string | null;
    createdAt: string;
}

export interface BrokerTransaction {
    orderId: string;
    organizationId: string;
    organizationName: string;
    eventId: string;
    eventName: string;
    eventDate: string;
    paidAt: string;
    salesChannel: 'online' | 'taquilla';
    commissionBasis: 'ticket_revenue' | 'platform_fee';
    commissionPercentage: number;
    commissionAmount: number;
}

export type CheckInOutcome = 'ok' | 'already_used' | 'cancelled' | 'wrong_event' | 'not_found' | 'invalid_signature';

export interface CheckInResult {
    result: CheckInOutcome;
    ticketId: string | null;
    ticketTypeName: string | null;
    seatLabel: string | null;
    holderName: string | null;
    checkedInAt: string | null;
    checkedInByName: string | null;
}

export interface GateScanRecord {
    id: number;
    ticketId: string | null;
    result: CheckInOutcome;
    scannedAt: string;
    deviceId: string | null;
    scannedByName: string;
}

export interface GateManifestEntry {
    ticketId: string;
    eventId: string;
    status: 'valid' | 'used' | 'cancelled';
    ticketTypeName: string | null;
    seatLabel: string | null;
    holderName: string | null;
    allowStaticQr: boolean;
    qrHash: string | null;
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
        maxEventsPerMonth: row.max_events_per_month ?? null,
        courtesyTicketsPerEvent: row.courtesy_tickets_per_event ?? null,
        taquillaFeePercentage: row.taquilla_fee_percentage != null ? Number(row.taquilla_fee_percentage) : null,
        reservationHoldMinutes: row.reservation_hold_minutes ?? 4320,
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
        imageUrl: row.image_url ?? null,
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

const EVENT_SELECT = 'id, organization_id, name, description, category, venue_id, event_date, status, image_url, venues(name), event_ticket_types(id, name, description, price, capacity, sold, event_seats(count))';

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

    async updateOrganizationDetails(id: string, input: {
        name: string;
        legalName: string;
        rfc: string;
        address: string;
        contactName: string;
        contactEmail: string;
        contactPhone: string;
    }): Promise<void> {
        const { error } = await supabase
            .from('organizations')
            .update({
                name: input.name,
                legal_name: input.legalName,
                rfc: input.rfc,
                address: input.address,
                contact_name: input.contactName,
                contact_email: input.contactEmail,
                contact_phone: input.contactPhone,
            })
            .eq('id', id);
        if (error) throw error;
    },

    async updateOrganizationContract(id: string, input: {
        feePercentage: number;
        paymentTerms: number;
        contractNotes?: string;
        maxEventsPerMonth?: number | null;
        courtesyTicketsPerEvent?: number | null;
        taquillaFeePercentage?: number | null;
        reservationHoldMinutes: number;
    }): Promise<void> {
        const { error } = await supabase
            .from('organizations')
            .update({
                fee_percentage: input.feePercentage,
                payment_terms: input.paymentTerms,
                contract_notes: input.contractNotes ?? null,
                max_events_per_month: input.maxEventsPerMonth ?? null,
                courtesy_tickets_per_event: input.courtesyTicketsPerEvent ?? null,
                taquilla_fee_percentage: input.taquillaFeePercentage ?? null,
                reservation_hold_minutes: input.reservationHoldMinutes,
            })
            .eq('id', id);
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
        imageUrl?: string | null;
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
                image_url: input.imageUrl ?? null,
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

    // Uploads a real event cover image to the public 'event-images' storage
    // bucket and returns its public URL. Keyed by organizationId (not
    // eventId) since this runs from CreateEvent.tsx before the event exists.
    async uploadEventImage(file: File, organizationId: string): Promise<string> {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${organizationId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('event-images').upload(path, file, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('event-images').getPublicUrl(path);
        return data.publicUrl;
    },

    async updateEvent(id: string, input: { name?: string; description?: string; category?: string; imageUrl?: string | null }): Promise<void> {
        const patch: Record<string, unknown> = {};
        if (input.name !== undefined) patch.name = input.name;
        if (input.description !== undefined) patch.description = input.description;
        if (input.category !== undefined) patch.category = input.category;
        if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
        const { error } = await supabase.from('events').update(patch).eq('id', id);
        if (error) throw error;
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

    // Real per-organization -> per-event finance breakdown (superadmin
    // Finanzas page). Revenue is computed from actual non-cancelled tickets
    // (same model EventDetail.tsx uses), split by the order's sales_channel
    // so a taquilla-specific fee (org.taquillaFeePercentage) can apply
    // separately from the digital fee.
    async getFinanceSummaryByOrganization(): Promise<{
        organization: Organization;
        events: { event: EventRecord; revenueOnline: number; revenueTaquilla: number; profit: number }[];
        totalRevenue: number;
        totalProfit: number;
    }[]> {
        const [orgs, events, ticketsRes] = await Promise.all([
            dataService.getOrganizations(),
            dataService.getEvents(),
            supabase.from('tickets').select('event_id, status, event_ticket_types(price), orders(organization_id, sales_channel)'),
        ]);
        if (ticketsRes.error) throw ticketsRes.error;

        const perEvent: Record<string, { online: number; taquilla: number }> = {};
        for (const row of (ticketsRes.data ?? []) as any[]) {
            if (row.status === 'cancelled') continue;
            const price = Number(row.event_ticket_types?.price ?? 0);
            const channel: 'online' | 'taquilla' = row.orders?.sales_channel === 'taquilla' ? 'taquilla' : 'online';
            const bucket = perEvent[row.event_id] ?? (perEvent[row.event_id] = { online: 0, taquilla: 0 });
            bucket[channel] += price;
        }

        return orgs.map((organization) => {
            const orgEvents = events.filter((e) => e.organizationId === organization.id);
            const taquillaFeePct = organization.taquillaFeePercentage ?? organization.feePercentage;
            const eventSummaries = orgEvents.map((event) => {
                const bucket = perEvent[event.id] ?? { online: 0, taquilla: 0 };
                const profit = (bucket.online * organization.feePercentage) / 100 + (bucket.taquilla * taquillaFeePct) / 100;
                return { event, revenueOnline: bucket.online, revenueTaquilla: bucket.taquilla, profit };
            });
            const totalRevenue = eventSummaries.reduce((s, e) => s + e.revenueOnline + e.revenueTaquilla, 0);
            const totalProfit = eventSummaries.reduce((s, e) => s + e.profit, 0);
            return { organization, events: eventSummaries, totalRevenue, totalProfit };
        });
    },

    // Real monthly gross revenue for the last N months (superadmin dashboard
    // chart), computed from actual paid/refunded orders instead of a
    // hand-typed placeholder series. Zero-fills months with no orders.
    async getMonthlyRevenueSeries(months: number = 6): Promise<{ month: string; revenue: number }[]> {
        const { data, error } = await supabase
            .from('orders')
            .select('paid_at, subtotal')
            .in('status', ['paid', 'refunded'])
            .not('paid_at', 'is', null);
        if (error) throw error;

        const now = new Date();
        const buckets: { key: string; label: string; revenue: number }[] = [];
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('es-MX', { month: 'short' }), revenue: 0 });
        }
        const byKey = new Map(buckets.map((b) => [b.key, b]));
        for (const row of (data ?? []) as any[]) {
            const d = new Date(row.paid_at);
            const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
            if (bucket) bucket.revenue += Number(row.subtotal ?? 0);
        }
        return buckets.map((b) => ({ month: b.label, revenue: b.revenue }));
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
        salesChannel?: 'online' | 'taquilla';
        idempotencyKey?: string;
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
            p_sales_channel: input.salesChannel ?? 'online',
            p_idempotency_key: input.idempotencyKey ?? null,
        });
        if (error) throw error;
        return data as string;
    },

    // organizations is RLS-restricted to members/superadmin, so a guest
    // buyer can't read reservation_hold_minutes directly — this narrow RPC
    // exposes just that one number for checkout's "reserved for X" message.
    async getEventHoldMinutes(eventId: string): Promise<number> {
        const { data, error } = await supabase.rpc('get_event_hold_minutes', { p_event_id: eventId });
        if (error) throw error;
        return (data as number | null) ?? 4320;
    },

    // Real-money online purchases go through this instead of createOrder:
    // reserves inventory/seats and creates a 'pending' order, but issues no
    // tickets yet — those only get minted by confirm_order_paid, once the
    // OrkestaPay webhook confirms payment. See createOrkestaCheckout below.
    async reserveOrder(input: {
        eventId: string;
        organizationId: string;
        userId: string;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        items?: { ticketTypeId: string; quantity: number }[];
        seatIds?: string[];
        idempotencyKey?: string;
    }): Promise<string> {
        const { data, error } = await supabase.rpc('reserve_order', {
            p_event_id: input.eventId,
            p_organization_id: input.organizationId,
            p_user_id: input.userId,
            p_customer_name: input.customerName,
            p_customer_email: input.customerEmail,
            p_customer_phone: input.customerPhone,
            p_items: input.items ? input.items.map((i) => ({ ticket_type_id: i.ticketTypeId, quantity: i.quantity })) : null,
            p_seat_ids: input.seatIds ?? null,
            p_idempotency_key: input.idempotencyKey ?? null,
        });
        if (error) throw error;
        return data as string;
    },

    // Builds an OrkestaPay hosted Checkout for an already-reserved order and
    // returns the URL to send the buyer's browser to.
    async createOrkestaCheckout(orderId: string): Promise<string> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const res = await fetch('/api/payments/orkesta/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ orderId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'No se pudo iniciar el pago');
        return json.checkoutRedirectUrl;
    },

    // Releases a still-'pending' reservation (buyer canceled on OrkestaPay's
    // hosted page) — frees inventory/seats immediately instead of waiting
    // for the organization's configured reservation window to lazily
    // reclaim it on someone else's next visit.
    async releaseOrder(orderId: string): Promise<void> {
        const { error } = await supabase.rpc('release_order', { p_order_id: orderId });
        if (error) throw error;
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

    // The logged-in buyer's own tickets, across every organization they've
    // bought from (User Wallet). No client-side filter needed — RLS already
    // restricts tickets to owner_profile_id = auth.uid() for a 'user' role.
    async getTicketsForOwner(): Promise<MyTicketRecord[]> {
        const { data, error } = await supabase
            .from('tickets')
            .select(
                'id, order_id, status, qr_code, created_at, event_ticket_types(name, price), event_seats(row_label, seat_number), events(id, name, event_date, category, image_url, venues(name))'
            )
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
            id: row.id,
            orderId: row.order_id,
            status: row.status,
            qrCode: row.qr_code,
            ticketTypeName: row.event_ticket_types?.name ?? '',
            unitPrice: Number(row.event_ticket_types?.price ?? 0),
            seatLabel: row.event_seats ? `${row.event_seats.row_label}-${row.event_seats.seat_number}` : null,
            eventId: row.events?.id ?? '',
            eventName: row.events?.name ?? '',
            eventDate: row.events?.event_date ?? '',
            eventCategory: row.events?.category ?? null,
            eventImageUrl: row.events?.image_url ?? null,
            venueName: row.events?.venues?.name ?? '',
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

    // Cancels the tickets in the database first (refund_tickets, unchanged),
    // then — for any order that went through OrkestaPay — refunds the
    // proportional amount at the gateway. Routed through a serverless
    // endpoint (rather than calling refund_tickets directly) purely to
    // sequence in the real gateway call; the RPC still does 100% of the
    // authorization/DB-rollback work, unmodified.
    async refundTickets(ticketIds: string[]): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const res = await fetch('/api/payments/orkesta/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ ticketIds }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'No se pudo procesar el reembolso');
    },

    // Gate scanning / check-in (Fase 1 del roadmap de blindaje)
    async checkInTicket(qrCode: string, eventId: string, deviceId?: string): Promise<CheckInResult> {
        const { data, error } = await supabase.rpc('check_in_ticket', {
            p_qr_code: qrCode,
            p_event_id: eventId,
            p_device_id: deviceId ?? null,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        return {
            result: row.result,
            ticketId: row.ticket_id,
            ticketTypeName: row.ticket_type_name,
            seatLabel: row.seat_label,
            holderName: row.holder_name,
            checkedInAt: row.checked_in_at,
            checkedInByName: row.checked_in_by_name,
        };
    },

    async undoCheckIn(ticketId: string): Promise<void> {
        const { error } = await supabase.rpc('undo_check_in', { p_ticket_id: ticketId });
        if (error) throw error;
    },

    async getScansForEvent(eventId: string): Promise<GateScanRecord[]> {
        const { data, error } = await supabase
            .from('ticket_scans')
            .select('id, ticket_id, result, scanned_at, device_id, profiles(name)')
            .eq('event_id', eventId)
            .order('scanned_at', { ascending: false })
            .limit(50);
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
            id: row.id,
            ticketId: row.ticket_id,
            result: row.result,
            scannedAt: row.scanned_at,
            deviceId: row.device_id,
            scannedByName: row.profiles?.name ?? '',
        }));
    },

    async getTicketDisplaySeed(ticketId: string): Promise<string> {
        const { data, error } = await supabase.rpc('get_ticket_display_seed', { p_ticket_id: ticketId });
        if (error) throw error;
        return data as string;
    },

    // Fase 2 del roadmap de blindaje (escaneo offline).
    async getEventSigningKey(eventId: string): Promise<string> {
        const { data, error } = await supabase.rpc('get_event_signing_key', { p_event_id: eventId });
        if (error) throw error;
        return data as string;
    },

    async getEventGateManifest(eventId: string): Promise<GateManifestEntry[]> {
        const { data, error } = await supabase.rpc('get_event_gate_manifest', { p_event_id: eventId });
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
            ticketId: row.ticket_id,
            eventId,
            status: row.status,
            ticketTypeName: row.ticket_type_name,
            seatLabel: row.seat_label,
            holderName: row.holder_name,
            allowStaticQr: row.allow_static_qr,
            qrHash: row.qr_hash,
        }));
    },

    async syncTicketScans(eventId: string, scans: {
        clientScanId: string; qrCode: string; deviceId: string; scannedAt: string;
    }[]): Promise<{ clientScanId: string; ticketId: string | null; serverResult: CheckInOutcome; conflict: boolean }[]> {
        // The server re-verifies each qrCode's signature against the real
        // event key at sync time — it never trusts the device's own local
        // (offline) resolution of which ticket a code belonged to.
        const { data, error } = await supabase.rpc('sync_ticket_scans', {
            p_event_id: eventId,
            p_scans: scans.map((s) => ({ clientScanId: s.clientScanId, qrCode: s.qrCode, deviceId: s.deviceId, scannedAt: s.scannedAt })),
        });
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
            clientScanId: row.client_scan_id,
            ticketId: row.ticket_id,
            serverResult: row.server_result,
            conflict: row.conflict,
        }));
    },

    // Box-office (taquilla) staff account creation — goes through a
    // serverless function since creating a real auth user needs the
    // service-role key, which must never reach the browser.
    async inviteStaff(
        name: string,
        email: string,
        role: 'organization' | 'taquilla' | 'validador' | 'broker',
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

    // Builds/updates the ticket's Google Wallet pass server-side (its
    // barcode is always the ticket's current qr_code) and returns a
    // "Save to Google Wallet" link.
    async getGoogleWalletSaveUrl(ticketId: string): Promise<string> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const res = await fetch(`/api/wallet/google/${ticketId}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to build Google Wallet pass');
        return json.saveUrl;
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

    async removeUserFromOrganization(profileId: string, organizationId: string): Promise<void> {
        const { error } = await supabase
            .from('organization_members')
            .delete()
            .eq('profile_id', profileId)
            .eq('organization_id', organizationId);
        if (error) throw error;
    },

    // Broker contracts (superadmin-only per RLS) — the commercial agreement
    // between the platform and a broker for one organization: what % they
    // earn, and whether that % is computed from the event's ticket revenue
    // or from the platform's own fee. A broker can have at most one
    // contract per organization (editing replaces it, doesn't stack).
    // Superadmin-only: every broker contract across every broker, for the
    // "Brokers" admin page (RLS returns all rows for is_superadmin(), not
    // just the caller's own).
    async getAllBrokerContracts(): Promise<BrokerContract[]> {
        const { data, error } = await supabase
            .from('broker_contracts')
            .select('id, broker_profile_id, organization_id, commission_basis, commission_percentage, notes, created_at, organizations(name)')
            .order('created_at');
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
            id: row.id,
            brokerProfileId: row.broker_profile_id,
            organizationId: row.organization_id,
            organizationName: row.organizations?.name ?? '',
            commissionBasis: row.commission_basis,
            commissionPercentage: Number(row.commission_percentage),
            notes: row.notes,
            createdAt: row.created_at,
        }));
    },

    async getBrokerContracts(brokerProfileId: string): Promise<BrokerContract[]> {
        const { data, error } = await supabase
            .from('broker_contracts')
            .select('id, broker_profile_id, organization_id, commission_basis, commission_percentage, notes, created_at, organizations(name)')
            .eq('broker_profile_id', brokerProfileId)
            .order('created_at');
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
            id: row.id,
            brokerProfileId: row.broker_profile_id,
            organizationId: row.organization_id,
            organizationName: row.organizations?.name ?? '',
            commissionBasis: row.commission_basis,
            commissionPercentage: Number(row.commission_percentage),
            notes: row.notes,
            createdAt: row.created_at,
        }));
    },

    async createBrokerContract(input: {
        brokerProfileId: string;
        organizationId: string;
        commissionBasis: 'ticket_revenue' | 'platform_fee';
        commissionPercentage: number;
        notes?: string | null;
    }): Promise<void> {
        const { error } = await supabase.from('broker_contracts').insert({
            broker_profile_id: input.brokerProfileId,
            organization_id: input.organizationId,
            commission_basis: input.commissionBasis,
            commission_percentage: input.commissionPercentage,
            notes: input.notes ?? null,
        });
        if (error) throw error;
    },

    async updateBrokerContract(id: string, input: {
        commissionBasis: 'ticket_revenue' | 'platform_fee';
        commissionPercentage: number;
        notes?: string | null;
    }): Promise<void> {
        const { error } = await supabase.from('broker_contracts').update({
            commission_basis: input.commissionBasis,
            commission_percentage: input.commissionPercentage,
            notes: input.notes ?? null,
        }).eq('id', id);
        if (error) throw error;
    },

    async deleteBrokerContract(id: string): Promise<void> {
        const { error } = await supabase.from('broker_contracts').delete().eq('id', id);
        if (error) throw error;
    },

    // The broker's own view — computed server-side (get_broker_transactions),
    // never exposes the event's real revenue, only the broker's own
    // already-calculated commission per paid order.
    async getBrokerTransactions(): Promise<BrokerTransaction[]> {
        const { data, error } = await supabase.rpc('get_broker_transactions');
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
            orderId: row.order_id,
            organizationId: row.organization_id,
            organizationName: row.organization_name,
            eventId: row.event_id,
            eventName: row.event_name,
            eventDate: row.event_date,
            paidAt: row.paid_at,
            salesChannel: row.sales_channel,
            commissionBasis: row.commission_basis,
            commissionPercentage: Number(row.commission_percentage),
            commissionAmount: Number(row.commission_amount),
        }));
    },

    async findProfileByEmail(email: string): Promise<{ id: string; name: string; email: string; role: UserRole } | null> {
        const { data, error } = await supabase.from('profiles').select('id, name, email, role').eq('email', email).maybeSingle();
        if (error || !data) return null;
        return data as any;
    },
};
