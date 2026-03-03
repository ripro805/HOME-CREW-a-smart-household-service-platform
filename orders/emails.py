"""
Order notification emails sent to clients.
Covers:
  - payment_success  → order moved to READY_TO_SHIP
  - payment_fail     → payment failed / cancelled
  - status_changed   → admin updates order status at any point
"""

from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone


# ── Colours per status ─────────────────────────────────────────────────
STATUS_META = {
    'NOT_PAID':       {'label': 'Not Paid',       'colour': '#6b7280'},
    'READY_TO_SHIP':  {'label': 'Ready to Ship',  'colour': '#0891b2'},
    'SHIPPED':        {'label': 'Shipped',         'colour': '#7c3aed'},
    'DELIVERED':      {'label': 'Delivered',       'colour': '#059669'},
    'CANCELLED':      {'label': 'Cancelled',       'colour': '#dc2626'},
}


def _status_badge(status_key):
    meta = STATUS_META.get(status_key, {'label': status_key, 'colour': '#6b7280'})
    return (
        f'<span style="background:{meta["colour"]};color:#fff;'
        f'padding:4px 14px;border-radius:999px;font-size:13px;font-weight:700;">'
        f'{meta["label"]}</span>'
    )


def _items_table(order):
    """Build an HTML table of order items."""
    rows = ""
    for item in order.items.select_related('service').all():
        rows += f"""
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">{item.service.name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">{item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">৳{item.price}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">
            ৳{float(item.price) * item.quantity:,.2f}
          </td>
        </tr>"""
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border-collapse:collapse;margin-top:16px;font-size:14px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;color:#475569;">Service</th>
          <th style="padding:10px 12px;text-align:center;color:#475569;">Qty</th>
          <th style="padding:10px 12px;text-align:right;color:#475569;">Unit Price</th>
          <th style="padding:10px 12px;text-align:right;color:#475569;">Subtotal</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3"
              style="padding:12px;text-align:right;font-weight:700;color:#0f172a;font-size:15px;">
            Total
          </td>
          <td style="padding:12px;text-align:right;font-weight:700;
                     color:#0d9488;font-size:15px;">৳{order.total_price}</td>
        </tr>
      </tfoot>
    </table>"""


def _base_template(title: str, heading: str, accent: str, body_html: str) -> str:
    """Wrap content in a consistent branded shell."""
    year = timezone.now().year
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">

      <!-- card -->
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- header bar -->
        <tr>
          <td style="background:linear-gradient(135deg,{accent} 0%,#0d9488 100%);
                     padding:28px 32px;">
            <p style="margin:0;color:#fff;font-size:22px;font-weight:800;
                      letter-spacing:.5px;">🏠 HomeCrew</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,.82);font-size:13px;">
              Smart Household Services Platform
            </p>
          </td>
        </tr>

        <!-- body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">{heading}</h2>
            {body_html}

            <p style="margin:32px 0 0;color:#94a3b8;font-size:12px;text-align:center;">
              © {year} HomeCrew · This is an automated notification, please do not reply.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ─────────────────────────────────────────────────────────────────────────────
# 1. PAYMENT SUCCESS
# ─────────────────────────────────────────────────────────────────────────────
def send_payment_success_email(order):
    """Call immediately after a successful SSLCommerz payment callback."""
    client = order.client
    recipient = client.email
    if not recipient:
        return

    subject = f"✅ Payment Confirmed – Order #{order.id} | HomeCrew"

    body_html = f"""
    <p style="color:#374151;font-size:15px;margin:0 0 20px;">
      Hi <strong>{client.get_full_name() or client.username}</strong>,<br/>
      Your payment was successful! We've received your order and it's now being prepared.
    </p>

    <!-- status pill -->
    <div style="text-align:center;margin:20px 0;">
      {_status_badge('READY_TO_SHIP')}
    </div>

    <!-- order meta -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f0fdf4;border-radius:10px;padding:16px;margin-bottom:8px;">
      <tr>
        <td style="color:#6b7280;font-size:14px;padding:4px 0;">Order ID</td>
        <td style="color:#0f172a;font-weight:700;font-size:14px;text-align:right;">
          #{order.id}
        </td>
      </tr>
      <tr>
        <td style="color:#6b7280;font-size:14px;padding:4px 0;">Date</td>
        <td style="color:#0f172a;font-size:14px;text-align:right;">
          {order.created_at.strftime('%d %b %Y, %I:%M %p')}
        </td>
      </tr>
    </table>

    {_items_table(order)}

    <p style="color:#374151;font-size:14px;margin:24px 0 0;">
      We'll notify you again as soon as your order status changes.
      Thank you for choosing <strong>HomeCrew</strong>! 🎉
    </p>"""

    html_message = _base_template(
        title=subject,
        heading="Payment Successful 🎉",
        accent="#059669",
        body_html=body_html,
    )

    _send(subject, html_message, [recipient])


# ─────────────────────────────────────────────────────────────────────────────
# 2. PAYMENT FAILED
# ─────────────────────────────────────────────────────────────────────────────
def send_payment_fail_email(order):
    """Call when SSLCommerz payment fail/cancel callback is received."""
    client = order.client
    recipient = client.email
    if not recipient:
        return

    subject = f"❌ Payment Failed – Order #{order.id} | HomeCrew"

    body_html = f"""
    <p style="color:#374151;font-size:15px;margin:0 0 20px;">
      Hi <strong>{client.get_full_name() or client.username}</strong>,<br/>
      Unfortunately, your payment for <strong>Order #{order.id}</strong> could not be processed.
      Your order has <strong>not</strong> been confirmed.
    </p>

    <div style="text-align:center;margin:20px 0;">
      {_status_badge('NOT_PAID')}
    </div>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#fef2f2;border-radius:10px;padding:16px;margin-bottom:8px;">
      <tr>
        <td style="color:#6b7280;font-size:14px;padding:4px 0;">Order ID</td>
        <td style="color:#0f172a;font-weight:700;font-size:14px;text-align:right;">
          #{order.id}
        </td>
      </tr>
      <tr>
        <td style="color:#6b7280;font-size:14px;padding:4px 0;">Amount</td>
        <td style="color:#dc2626;font-weight:700;font-size:14px;text-align:right;">
          ৳{order.total_price}
        </td>
      </tr>
    </table>

    {_items_table(order)}

    <div style="background:#fff7ed;border-left:4px solid #f97316;
                border-radius:8px;padding:14px 16px;margin:24px 0 0;">
      <p style="margin:0;color:#92400e;font-size:14px;">
        💡 <strong>What to do?</strong> You can retry payment from your
        <strong>Profile → Orders</strong> section. If the issue persists,
        please contact our support team.
      </p>
    </div>"""

    html_message = _base_template(
        title=subject,
        heading="Payment Failed ❌",
        accent="#dc2626",
        body_html=body_html,
    )

    _send(subject, html_message, [recipient])


# ─────────────────────────────────────────────────────────────────────────────
# 3. ORDER STATUS CHANGED
# ─────────────────────────────────────────────────────────────────────────────
def send_order_status_email(order, old_status: str):
    """
    Call whenever order.status changes.
    old_status: the previous status string (e.g. 'READY_TO_SHIP').
    """
    client = order.client
    recipient = client.email
    if not recipient:
        return

    new_status = order.status
    new_meta = STATUS_META.get(new_status, {'label': new_status, 'colour': '#6b7280'})
    old_meta = STATUS_META.get(old_status, {'label': old_status, 'colour': '#6b7280'})

    subject = f"📦 Order #{order.id} status → {new_meta['label']} | HomeCrew"

    # Human-friendly status messages
    status_messages = {
        'READY_TO_SHIP': "Great news! Your order is confirmed and being prepared for dispatch.",
        'SHIPPED':       "Your order is on its way! Our team is heading to your location.",
        'DELIVERED':     "Your order has been delivered. We hope you're satisfied with the service! ⭐",
        'CANCELLED':     "Your order has been cancelled. If this was a mistake, please place a new order.",
        'NOT_PAID':      "Your order is awaiting payment. Please complete the payment to proceed.",
    }
    message = status_messages.get(new_status, "Your order status has been updated.")

    body_html = f"""
    <p style="color:#374151;font-size:15px;margin:0 0 20px;">
      Hi <strong>{client.get_full_name() or client.username}</strong>,<br/>
      {message}
    </p>

    <!-- status transition -->
    <div style="display:flex;align-items:center;justify-content:center;
                gap:12px;margin:24px 0;text-align:center;">
      <span style="background:{old_meta['colour']};color:#fff;padding:4px 14px;
                   border-radius:999px;font-size:12px;font-weight:700;opacity:.7;">
        {old_meta['label']}
      </span>
      <span style="font-size:20px;color:#94a3b8;">→</span>
      <span style="background:{new_meta['colour']};color:#fff;padding:4px 14px;
                   border-radius:999px;font-size:13px;font-weight:700;">
        {new_meta['label']}
      </span>
    </div>

    <!-- order meta -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:8px;">
      <tr>
        <td style="color:#6b7280;font-size:14px;padding:4px 0;">Order ID</td>
        <td style="color:#0f172a;font-weight:700;font-size:14px;text-align:right;">
          #{order.id}
        </td>
      </tr>
      <tr>
        <td style="color:#6b7280;font-size:14px;padding:4px 0;">Total</td>
        <td style="color:#0d9488;font-weight:700;font-size:14px;text-align:right;">
          ৳{order.total_price}
        </td>
      </tr>
      <tr>
        <td style="color:#6b7280;font-size:14px;padding:4px 0;">Updated</td>
        <td style="color:#0f172a;font-size:14px;text-align:right;">
          {timezone.now().strftime('%d %b %Y, %I:%M %p')}
        </td>
      </tr>
    </table>

    {_items_table(order)}

    <p style="color:#374151;font-size:14px;margin:24px 0 0;">
      You can track all your orders from your
      <strong>HomeCrew profile page</strong>.
      Thank you for trusting us! 🙏
    </p>"""

    html_message = _base_template(
        title=subject,
        heading=f"Order Status Updated: {new_meta['label']}",
        accent=new_meta['colour'],
        body_html=body_html,
    )

    _send(subject, html_message, [recipient])


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL HELPER
# ─────────────────────────────────────────────────────────────────────────────
def _send(subject: str, html_body: str, recipients: list):
    """Send an HTML email, swallow errors so they never break the main flow."""
    try:
        from_email = settings.DEFAULT_FROM_EMAIL
        # Plain-text fallback (strip tags roughly)
        import re
        plain = re.sub(r'<[^>]+>', '', html_body)

        msg = EmailMultiAlternatives(subject, plain, from_email, recipients)
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
    except Exception as exc:
        # Log but never crash the order flow
        import logging
        logging.getLogger('orders.emails').error(
            "Failed to send order email to %s: %s", recipients, exc
        )
