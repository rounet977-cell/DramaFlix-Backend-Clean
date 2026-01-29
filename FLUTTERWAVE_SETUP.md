# Flutterwave Payment Integration Guide

## Overview

This app uses **Flutterwave** for all payment-related operations including premium subscriptions and in-app purchases. Flutterwave is a payment platform that works seamlessly with Expo and React Native apps.

## Setup Instructions

### 1. Create Flutterwave Account

1. Go to https://dashboard.flutterwave.com
2. Sign up for a free account
3. Complete email verification
4. Go to Settings → API Keys
5. Copy your **Public Key** and **Secret Key**

### 2. Add Environment Variables

**For Development (in `.env`):**
```
EXPO_PUBLIC_FLUTTERWAVE_KEY=pk_test_xxxxxxxxxxxxxxxx
FLUTTERWAVE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
```

**For Production (in Render):**
Set these environment variables in your Render dashboard:
- `EXPO_PUBLIC_FLUTTERWAVE_KEY` (public key - safe to expose)
- `FLUTTERWAVE_SECRET_KEY` (secret key - keep private)

### 3. Payment Plans

The app supports three subscription plans:

| Plan | Amount | Period |
|------|--------|--------|
| Weekly | $4.99 | 7 days |
| Monthly | $14.99 | 30 days |
| Yearly | $99.99 | 365 days |

### 4. Payment Flow

1. **User Initiates Payment** → User selects a plan and taps "Start Premium"
2. **Backend Creates Transaction** → Backend calls Flutterwave API to create payment link
3. **Open Payment Link** → App opens payment link in WebView or browser
4. **User Completes Payment** → User enters payment details on Flutterwave
5. **Payment Callback** → Flutterwave calls backend callback URL
6. **Verify & Activate** → Backend verifies payment and activates premium subscription
7. **Update App** → App receives confirmation and updates UI

### 5. Backend Integration

Add these endpoints to your backend (`server/routes.ts`):

```typescript
// POST /api/billing/init-payment
// Initiate a payment transaction
export async function initiatePayment(req, res) {
  const { userId, planId, email, displayName } = req.body;
  
  const amount = {
    weekly: 4.99,
    monthly: 14.99,
    yearly: 99.99,
  }[planId] || 14.99;

  try {
    const paymentLink = await FlutterwaveService.initiatePayment({
      email,
      amount,
      currency: "USD",
      reference: `${userId}-${planId}-${Date.now()}`,
      customization: {
        title: "DramaFlix Premium",
        description: `${planId.toUpperCase()} Premium Subscription`,
      },
      customer: {
        name: displayName,
        email,
      },
      meta: {
        userId,
        planId,
      },
    });

    return res.json({ paymentLink });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /api/billing/payment-callback
// Webhook endpoint for Flutterwave payment confirmation
export async function paymentCallback(req, res) {
  const { data } = req.body;
  
  try {
    // Verify payment with Flutterwave
    const isValid = await FlutterwaveService.verifyPayment(data.id);
    
    if (isValid) {
      const { userId, planId } = data.meta;
      
      // Activate subscription
      await db.insert(subscriptions).values({
        userId,
        plan: planId,
        status: "active",
        startDate: new Date(),
        endDate: calculateEndDate(planId),
        provider: "flutterwave",
        transactionId: data.reference,
      });

      // Update user premium status
      await db.update(users).set({ isPremium: true }).where(eq(users.id, userId));
    }

    return res.json({ status: "success" });
  } catch (error) {
    console.error("Payment callback error:", error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 6. Mobile App Integration

The PremiumScreen component is ready to use Flutterwave:

```typescript
// When user taps "Start Premium"
const handleSubscribe = async () => {
  const amount = PLAN_PRICES[selectedPlan];
  const ref = `${user.id}-${selectedPlan}-${Date.now()}`;
  
  // Backend initiates payment
  const response = await api.post("/api/billing/init-payment", {
    userId: user.id,
    planId: selectedPlan,
    email: user.email,
    displayName: user.displayName,
  });

  // Open payment link in WebView
  Linking.openURL(response.paymentLink);
};
```

### 7. Testing

#### Test Credentials (Flutterwave Sandbox)

**Test Card:**
- Number: 4242 4242 4242 4242
- Expiry: 10/25
- CVV: 123

**Test USSD:**
- Merchant Code: 280
- PIN: 1234

### 8. Production Checklist

- [ ] Switch to production API keys
- [ ] Set up webhook URL in Flutterwave dashboard
- [ ] Configure HTTPS for callback endpoint
- [ ] Test full payment flow with real cards
- [ ] Set up email notifications for transactions
- [ ] Monitor transaction logs in Flutterwave dashboard
- [ ] Implement subscription renewal logic

## API Reference

### FlutterwaveService Methods

```typescript
// Initiate a payment
await FlutterwaveService.initiatePayment(options);

// Verify a payment
await FlutterwaveService.verifyPayment(transactionId);

// Get transaction details
await FlutterwaveService.getTransactionDetails(transactionId);

// Validate API keys are set
FlutterwaveService.validateKeys();
```

## Security Notes

- ✅ Secret key is server-side only (never exposed to client)
- ✅ Public key is safe for client-side use
- ✅ Payment verification happens server-side
- ✅ Transaction reference includes userId for validation
- ✅ Webhook signature verification recommended (implement in production)

## Troubleshooting

**Payment link not opening?**
- Ensure `Linking` is imported from `react-native`
- Check that URL is valid from Flutterwave API response
- Test with `Linking.canOpenURL()` first

**Callback not received?**
- Verify webhook URL in Flutterwave dashboard
- Check backend server logs for errors
- Ensure POST endpoint is accessible from internet

**Amount not matching?**
- Verify PLAN_PRICES matches Flutterwave backend
- Check currency conversion if applicable
- Ensure amount is in correct format (e.g., 14.99 not 1499)

## Support

- Flutterwave Docs: https://developer.flutterwave.com
- Status Page: https://status.flutterwave.com
- Support: https://support.flutterwave.com
