import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "no-reply@updates.rlstrings.com";

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildOrderConfirmationHtml(args: {
  customerName: string;
  email: string;
  phone?: string;
  pickupCode: string;
  lineItems?: Array<{
    priceId: string;
    productName: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    category: "head" | "shaft" | "mesh" | "strings" | "service" | "upsell";
  }>;
  itemDescription: string;
  orderType: "service" | "product";
}): string {
  const grandTotal = args.lineItems?.reduce((sum, li) => sum + li.totalAmount, 0) ?? 0;

  const lineItemRows = args.lineItems
    ? args.lineItems
        .map(
          (li) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${li.productName}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px; text-align: center;">${li.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px; text-align: right;">${formatDollars(li.unitAmount)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px; text-align: right;">${formatDollars(li.totalAmount)}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="4" style="padding: 10px 12px; color: #6b7280; font-size: 14px;">${args.itemDescription}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmed – RL Strings</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 36px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">RL Strings</h1>
              <p style="margin: 6px 0 0; color: #c7d2fe; font-size: 14px; font-weight: 500;">Professional Lacrosse Stringing</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 40px 0;">

              <!-- Greeting -->
              <p style="margin: 0 0 24px; color: #111827; font-size: 16px;">Hi <strong>${args.customerName}</strong>,</p>
              <p style="margin: 0 0 32px; color: #374151; font-size: 15px; line-height: 1.6;">
                Your order is confirmed and payment has been received. Keep the pickup code below — you'll need it when you drop off your equipment.
              </p>

              <!-- Pickup Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border: 2px solid #818cf8; border-radius: 12px; padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #4338ca; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Your Pickup Code</p>
                    <p style="margin: 0; color: #1e1b4b; font-size: 48px; font-weight: 900; letter-spacing: 12px; font-variant-numeric: tabular-nums;">${args.pickupCode}</p>
                    <p style="margin: 12px 0 0; color: #6366f1; font-size: 13px;">Save this code — you'll need it at drop-off and pickup</p>
                  </td>
                </tr>
              </table>

              <!-- Order Summary -->
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: 700;">Order Summary</h2>
              <p style="margin: 0 0 20px; color: #374151; font-size: 14px;">${args.itemDescription}</p>

              <!-- Line Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 8px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
                    <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Unit</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${lineItemRows}
                </tbody>
              </table>

              <!-- Grand Total -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td style="padding: 12px; text-align: right;">
                    <span style="color: #111827; font-size: 15px; font-weight: 700;">Grand Total: ${formatDollars(grandTotal)}</span>
                  </td>
                </tr>
              </table>

              <!-- Customer Details -->
              <h2 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 700;">Your Details</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 4px 0;">
                    <span style="color: #6b7280; font-size: 13px;">Email: </span>
                    <span style="color: #374151; font-size: 13px;">${args.email}</span>
                  </td>
                </tr>
                ${
                  args.phone
                    ? `<tr>
                  <td style="padding: 4px 0;">
                    <span style="color: #6b7280; font-size: 13px;">Phone: </span>
                    <span style="color: #374151; font-size: 13px;">${args.phone}</span>
                  </td>
                </tr>`
                    : ""
                }
              </table>

              <!-- Drop-Off Instructions — PLACEHOLDER: update with final copy before go-live -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 40px;">
                <tr>
                  <td style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px;">
                    <h2 style="margin: 0 0 12px; color: #92400e; font-size: 15px; font-weight: 700;">Drop-Off Instructions</h2>
                    <p style="margin: 0 0 8px; color: #78350f; font-size: 14px; line-height: 1.6;">
                      <!-- PLACEHOLDER: Insert drop-off location, hours, and instructions here before go-live -->
                      Drop-off details coming soon. We'll be in touch with specific instructions shortly.
                    </p>
                    <p style="margin: 8px 0 0; color: #78350f; font-size: 14px;">
                      Questions? Reply to this email or reach out directly.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f3f4f6; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px;">RL Strings — Professional Lacrosse Stringing</p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">This is an automated confirmation email. Please do not reply directly.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const sendOrderConfirmationEmail = internalAction({
  args: {
    customerName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    pickupCode: v.string(),
    lineItems: v.optional(
      v.array(
        v.object({
          priceId: v.string(),
          productName: v.string(),
          quantity: v.number(),
          unitAmount: v.number(),
          totalAmount: v.number(),
          category: v.union(
            v.literal("head"),
            v.literal("shaft"),
            v.literal("mesh"),
            v.literal("strings"),
            v.literal("service"),
            v.literal("upsell")
          ),
        })
      )
    ),
    itemDescription: v.string(),
    orderType: v.union(v.literal("service"), v.literal("product")),
  },
  handler: async (_ctx, args) => {
    const resend = new Resend(process.env.RESEND_API);

    const html = buildOrderConfirmationHtml(args);

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: args.email,
      replyTo: '1822lax@gmail.com',
      subject: `Order Confirmed – Pickup Code: ${args.pickupCode}`,
      html,
    });

    if (error) {
      console.error("[email] Failed to send order confirmation:", error);
      throw new Error(`Resend error: ${JSON.stringify(error)}`);
    }

    console.log(`[email] Order confirmation sent to ${args.email} (pickup code: ${args.pickupCode})`);
  },
});
