import { createContext, useContext, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaymentIntentResult {
    clientSecret: string;
    amount: number;
    currency: string;
}

interface StripeContextType {
    /**
     * Creates a simulated payment intent.
     * In production: replace with real Stripe API call via your backend.
     * POST /api/create-payment-intent { amount, currency }
     */
    createPaymentIntent: (amount: number, currency?: string) => Promise<PaymentIntentResult>;

    /**
     * Confirms a payment with the given client secret.
     * In production: use stripe.confirmCardPayment(clientSecret, { payment_method: ... })
     */
    confirmPayment: (clientSecret: string, cardDetails?: unknown) => Promise<{ success: boolean; error?: string }>;

    /**
     * Stripe publishable key — set via environment variable.
     * In production: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
     */
    publishableKey: string;

    /**
     * Whether Stripe is initialized and ready.
     * In production: set to true after loadStripe() resolves.
     */
    isReady: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const StripeContext = createContext<StripeContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function StripeProvider({ children }: { children: ReactNode }) {
    // TODO Production: const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

    const createPaymentIntent = async (amount: number, currency = 'mxn'): Promise<PaymentIntentResult> => {
        // TODO Production: replace with real fetch call to your backend
        // const res = await fetch('/api/create-payment-intent', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ amount: Math.round(amount * 100), currency }),
        // });
        // const data = await res.json();
        // return data;

        // Simulated stub
        console.log(`[StripeContext] Creating payment intent for ${amount} ${currency}`);
        await new Promise((r) => setTimeout(r, 800)); // Simulate network delay
        return {
            clientSecret: `pi_simulated_${Date.now()}_secret_stub`,
            amount,
            currency,
        };
    };

    const confirmPayment = async (
        clientSecret: string,
        _cardDetails?: unknown
    ): Promise<{ success: boolean; error?: string }> => {
        // TODO Production: replace with real Stripe.js call
        // const stripe = await stripePromise;
        // const result = await stripe!.confirmCardPayment(clientSecret, {
        //   payment_method: { card: cardElement, billing_details: { ... } },
        // });
        // if (result.error) return { success: false, error: result.error.message };
        // return { success: true };

        // Simulated stub — always succeeds in dev
        console.log(`[StripeContext] Confirming payment for secret: ${clientSecret}`);
        await new Promise((r) => setTimeout(r, 1200));
        return { success: true };
    };

    return (
        <StripeContext.Provider
            value={{
                createPaymentIntent,
                confirmPayment,
                publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_stub_not_configured',
                isReady: true, // Production: set to !!stripeInstance
            }}
        >
            {children}
        </StripeContext.Provider>
    );
}

export function useStripe() {
    const ctx = useContext(StripeContext);
    if (!ctx) throw new Error('useStripe must be used within StripeProvider');
    return ctx;
}
