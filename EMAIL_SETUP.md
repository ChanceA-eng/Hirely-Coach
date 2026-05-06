# Email Delivery Setup (Hirely)

## Why emails were failing
- Inbox providers (Gmail, Outlook) reject or spam unauthenticated senders.
- Sending directly from app servers usually has low sender reputation.

## Required provider and DNS setup
1. Use an ESP API: Resend (implemented in code), SendGrid, Mailgun, or SES.
2. Add DNS records from your ESP dashboard:
- SPF
- DKIM
- DMARC
3. Verify domain in ESP before production traffic.

## DNS records to enforce (non-negotiable)
Add/verify these exact categories in your DNS host for the sending domain:

1. SPF
- Host/Name: `@`
- Type: `TXT`
- Value (example): `v=spf1 include:_spf.resend.com ~all`

2. DKIM
- Host/Name: `resend._domainkey` (or selector provided by ESP)
- Type: `TXT` or `CNAME` (provider-specific)
- Value: provider-generated public key/target

3. DMARC
- Host/Name: `_dmarc`
- Type: `TXT`
- Value (starter): `v=DMARC1; p=quarantine; rua=mailto:dmarc@hirelycoach.com; ruf=mailto:dmarc@hirelycoach.com; fo=1; adkim=s; aspf=s`

4. Verification
- Confirm DNS propagation with your ESP domain dashboard.
- Confirm SPF, DKIM, and DMARC all show `PASS` before sending production traffic.
- Keep DMARC reporting mailboxes active.

## Environment variables
- `RESEND_API_KEY`
- `HIRELY_EMAIL_FROM` (example: `Hirely Coach <no-reply@hirelycoach.com>`)

## Implemented endpoints
- `POST /api/admin/foundation/email` — admin broadcast for Foundation users.
- `GET /api/admin/foundation/email` — admin delivery logs table data.
- `POST /api/email/webhook/resend` — delivery/open/bounce status updates.

## Admin labels (Swahili)
- `Imepokelewa` (Delivered)
- `Imeshindikana` (Failed)
- `Imezuiwa` (Blocked)
- `Haijasomwa` (Unread)
- `Imefunguliwa` (Opened)

## Notes
- Promotions tab behavior is expected for marketing-like content.
- Keep copy concise and learner-focused for best inbox placement.
- Ask users to mark messages as important if filtered.
