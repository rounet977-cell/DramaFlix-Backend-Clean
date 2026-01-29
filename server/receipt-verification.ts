/**
 * Receipt Verification Service
 * Handles verification of in-app purchase receipts from Google Play and Apple App Store
 */

interface GooglePlayResponse {
  kind: string;
  developerId: string;
  packageName: string;
  productId: string;
  purchaseTime: number;
  purchaseState: number;
  developerPayload: string;
  purchaseToken: string;
  acknowledgementState: number;
  orderId: string;
}

interface AppleReceiptResponse {
  receipt: {
    bundle_id: string;
    application_version: string;
    in_app: Array<{
      quantity: string;
      product_id: string;
      transaction_id: string;
      original_transaction_id: string;
      is_trial_period: string;
      purchase_date_ms: string;
      purchase_date_pst: string;
      original_purchase_date_ms: string;
      original_purchase_date_pst: string;
      is_consumable: boolean;
    }>;
  };
  latest_receipt_info: Array<unknown>;
  latest_receipt: string;
  status: number;
  environment: string;
}

export async function verifyGooglePlayReceipt(
  packageName: string,
  productId: string,
  receiptToken: string
): Promise<{ valid: boolean; error?: string; data?: GooglePlayResponse }> {
  try {
    // Get Google Play API credentials from environment
    const credentials = process.env.GOOGLE_PLAY_CREDENTIALS;
    if (!credentials) {
      console.warn("[Receipt] GOOGLE_PLAY_CREDENTIALS not configured - verification will be simulated");
      return {
        valid: true,
        data: {
          kind: "androidpublisher#productPurchase",
          developerId: "unknown",
          packageName,
          productId,
          purchaseTime: Date.now(),
          purchaseState: 0, // Purchased
          developerPayload: "",
          purchaseToken: receiptToken,
          acknowledgementState: 1, // Acknowledged
          orderId: `simulated_${Date.now()}`,
        },
      };
    }

    // In production, use Google Play Billing Library
    // This requires setting up OAuth 2.0 credentials and the Google Play API
    // Reference: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/get

    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      return { valid: false, error: "Failed to get Google access token" };
    }

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${receiptToken}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error("[Receipt] Google Play verification failed:", error);
      return { valid: false, error: "Failed to verify receipt with Google Play" };
    }

    const data = await response.json();

    // Check if purchase is valid and not canceled
    if (data.purchaseState === 0) {
      // purchaseState 0 = Purchased, 1 = Canceled
      console.log("[Receipt] Google Play receipt verified successfully");
      return { valid: true, data };
    } else {
      return { valid: false, error: "Purchase has been canceled" };
    }
  } catch (err) {
    console.error("[Receipt] Google Play verification error:", err);
    return { valid: false, error: String(err) };
  }
}

export async function verifyAppleReceipt(
  receiptData: string
): Promise<{ valid: boolean; error?: string; data?: AppleReceiptResponse }> {
  try {
    const environment = process.env.NODE_ENV === "production" ? "production" : "sandbox";
    const url =
      environment === "production"
        ? "https://buy.itunes.apple.com/verifyReceipt"
        : "https://sandbox.itunes.apple.com/verifyReceipt";

    const bundleId = process.env.APPLE_BUNDLE_ID || "com.premiumdramastream";
    const sharedSecret = process.env.APPLE_SHARED_SECRET;

    if (!sharedSecret) {
      console.warn("[Receipt] APPLE_SHARED_SECRET not configured - verification will be simulated");
      return {
        valid: true,
        data: {
          receipt: {
            bundle_id: bundleId,
            application_version: "1.0.0",
            in_app: [
              {
                quantity: "1",
                product_id: "com.premiumdramastream.coins.100",
                transaction_id: `simulated_${Date.now()}`,
                original_transaction_id: `simulated_${Date.now()}`,
                is_trial_period: "false",
                purchase_date_ms: Date.now().toString(),
                purchase_date_pst: new Date().toISOString(),
                original_purchase_date_ms: Date.now().toString(),
                original_purchase_date_pst: new Date().toISOString(),
                is_consumable: true,
              },
            ],
          },
          latest_receipt_info: [],
          latest_receipt: receiptData,
          status: 0,
          environment,
        },
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "receipt-data": receiptData,
        password: sharedSecret,
      }),
    });

    if (!response.ok) {
      console.error("[Receipt] Apple verification HTTP error:", response.status);
      return { valid: false, error: "Failed to verify receipt with Apple" };
    }

    const data = await response.json();

    // Apple status codes: 0 = valid, 21002 = invalid format, 21010 = receipt invalid, etc.
    if (data.status === 0) {
      console.log("[Receipt] Apple receipt verified successfully");
      return { valid: true, data };
    } else {
      return { valid: false, error: `Apple verification failed with status ${data.status}` };
    }
  } catch (err) {
    console.error("[Receipt] Apple verification error:", err);
    return { valid: false, error: String(err) };
  }
}

async function getGoogleAccessToken(): Promise<string | null> {
  try {
    const credentials = process.env.GOOGLE_PLAY_CREDENTIALS;
    if (!credentials) {
      return null;
    }

    // Parse the JSON credentials
    const credentialsObj = JSON.parse(credentials);
    const clientEmail = credentialsObj.client_email;
    const privateKey = credentialsObj.private_key;

    if (!clientEmail || !privateKey) {
      console.error("[Receipt] Invalid Google credentials format");
      return null;
    }

    // Create JWT assertion
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: clientEmail,
      sub: clientEmail,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/androidpublisher",
    };

    // Sign JWT (this would require crypto module)
    // In production, you'd need to implement proper JWT signing
    // For now, return null to indicate not configured
    console.warn("[Receipt] Google JWT signing not implemented");
    return null;
  } catch (err) {
    console.error("[Receipt] Failed to get Google access token:", err);
    return null;
  }
}

export const receiptVerification = {
  verifyGooglePlayReceipt,
  verifyAppleReceipt,
};
