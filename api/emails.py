import logging
import re

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

logger = logging.getLogger('api.emails')


def send_contact_message_to_admin(payload):
    recipient = getattr(settings, 'ADMIN_CONTACT_EMAIL', None) or settings.DEFAULT_FROM_EMAIL
    full_name = f"{payload['first_name']} {payload['last_name']}".strip()
    submitted_at = timezone.localtime().strftime('%d %b %Y, %I:%M %p')

    subject = f"New Contact Request from {full_name} | HomeCrew"
    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 55px rgba(15,23,42,0.12);">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,#0f172a 0%,#0d9488 55%,#06b6d4 100%);color:#ffffff;">
              <p style="margin:0;font-size:13px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(255,255,255,0.78);">HomeCrew Contact</p>
              <h1 style="margin:10px 0 0;font-size:28px;line-height:1.25;">New customer message received</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.8;">
                A visitor submitted the contact form from the HomeCrew website. Details are below.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f8fafc;border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 18px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">Name</td>
                  <td style="padding:14px 18px;color:#0f172a;font-size:14px;font-weight:700;border-bottom:1px solid #e2e8f0;">{full_name}</td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">Email</td>
                  <td style="padding:14px 18px;color:#0f172a;font-size:14px;font-weight:700;border-bottom:1px solid #e2e8f0;">{payload['email']}</td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">Phone</td>
                  <td style="padding:14px 18px;color:#0f172a;font-size:14px;font-weight:700;border-bottom:1px solid #e2e8f0;">{payload['phone']}</td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;color:#64748b;font-size:14px;">Submitted</td>
                  <td style="padding:14px 18px;color:#0f172a;font-size:14px;font-weight:700;">{submitted_at}</td>
                </tr>
              </table>

              <div style="margin-top:24px;border:1px solid #e2e8f0;border-radius:16px;padding:20px;background:#ffffff;">
                <p style="margin:0 0 10px;color:#0f172a;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Message</p>
                <p style="margin:0;color:#475569;font-size:15px;line-height:1.85;white-space:pre-line;">{payload['message']}</p>
              </div>

              <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.7;">
                Tip: use reply in your mail client to respond directly to the sender.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    plain_body = re.sub(r'<[^>]+>', '', html_body)

    try:
        message = EmailMultiAlternatives(
            subject=subject,
            body=plain_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient],
            reply_to=[payload['email']],
        )
        message.attach_alternative(html_body, 'text/html')
        message.send(fail_silently=False)
    except Exception as exc:
        logger.error('Failed to send contact email to %s: %s', recipient, exc)
        raise
