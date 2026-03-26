#!/bin/bash
# send-admin-email.sh — Send admin login credentials to emmypat4rl@gmail.com via SES
# Usage: bash scripts/send-admin-email.sh

REGION="eu-west-1"
TO="emmypat4rl@gmail.com"
FROM="noreply@bamiakazah.wedding"  # Must be verified in SES

SUBJECT="Bamai & Kazah Wedding — Admin Login Details"

BODY_HTML=$(cat <<'EOF'
<html>
<body style="font-family: Georgia, serif; background: #1a0a0e; color: #f5f0eb; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #2D1010; border-radius: 16px; padding: 40px; border: 1px solid #5C1A28;">
    <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #C4956A; margin: 0 0 8px; font-size: 28px;">Bamai &amp; Kazah</h1>
    <p style="color: #C4956A; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 32px;">Wedding Platform — Admin Access</p>

    <h2 style="color: white; margin: 0 0 16px; font-size: 20px;">Admin Login Credentials</h2>
    <p style="color: rgba(255,255,255,0.7); margin: 0 0 24px; font-size: 14px; line-height: 1.7;">
      Below are the three admin accounts for the wedding platform. Each admin must change their password on first login.
    </p>

    <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
          <th style="text-align: left; padding: 8px 4px; color: #C4956A; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Account</th>
          <th style="text-align: left; padding: 8px 4px; color: #C4956A; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Email</th>
          <th style="text-align: left; padding: 8px 4px; color: #C4956A; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Temp Password</th>
        </tr>
        <tr>
          <td style="padding: 10px 4px; color: white;">Admin 1</td>
          <td style="padding: 10px 4px; color: #C4956A; font-family: monospace;">admin1@bamiakazah.wedding</td>
          <td style="padding: 10px 4px; color: white; font-family: monospace;">Admin@1234</td>
        </tr>
        <tr>
          <td style="padding: 10px 4px; color: white;">Admin 2</td>
          <td style="padding: 10px 4px; color: #C4956A; font-family: monospace;">admin2@bamiakazah.wedding</td>
          <td style="padding: 10px 4px; color: white; font-family: monospace;">Admin@1234</td>
        </tr>
        <tr>
          <td style="padding: 10px 4px; color: white;">Admin 3</td>
          <td style="padding: 10px 4px; color: #C4956A; font-family: monospace;">admin3@bamiakazah.wedding</td>
          <td style="padding: 10px 4px; color: white; font-family: monospace;">Admin@1234</td>
        </tr>
      </table>
    </div>

    <div style="background: rgba(196,149,106,0.1); border: 1px solid rgba(196,149,106,0.3); border-radius: 10px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.7;">
        <strong style="color: #C4956A;">First login steps:</strong><br>
        1. Go to the admin login page below<br>
        2. Sign in with the email and temp password<br>
        3. You will be prompted to set a new permanent password<br>
        4. Password resets are sent to: <strong>emmypat4rl@gmail.com</strong>
      </p>
    </div>

    <a href="https://dil5ih5xgoo14.cloudfront.net/admin-login"
       style="display: block; background: linear-gradient(135deg, #7A1428, #5C0F1E); color: white;
              text-decoration: none; padding: 14px 24px; border-radius: 50px; text-align: center;
              font-weight: 600; font-size: 15px; margin-bottom: 16px;">
      → Go to Admin Login
    </a>

    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: 8px;">
      <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0; line-height: 1.7;">
        <strong style="color: rgba(255,255,255,0.6);">Platform URLs:</strong><br>
        Wedding platform: <a href="https://dil5ih5xgoo14.cloudfront.net" style="color: #C4956A;">dil5ih5xgoo14.cloudfront.net</a><br>
        Admin — Manage Tickets: /admin/tickets<br>
        Admin — Scan Tickets: /admin/scan
      </p>
    </div>
  </div>
</body>
</html>
EOF
)

BODY_TEXT="Bamai & Kazah Wedding — Admin Login Details

Admin Accounts:
  admin1@bamiakazah.wedding — Temp password: Admin@1234
  admin2@bamiakazah.wedding — Temp password: Admin@1234
  admin3@bamiakazah.wedding — Temp password: Admin@1234

Admin Login: https://dil5ih5xgoo14.cloudfront.net/admin-login

Each admin must set a new password on first login.
Password reset codes are sent to: emmypat4rl@gmail.com"

echo "Sending admin credentials email to $TO..."

aws ses send-email \
  --region "$REGION" \
  --from "$FROM" \
  --to "$TO" \
  --subject "$SUBJECT" \
  --html "$BODY_HTML" \
  --text "$BODY_TEXT" \
  2>&1

if [ $? -eq 0 ]; then
  echo "✓ Email sent successfully to $TO"
else
  echo ""
  echo "SES send failed (sender domain may not be verified)."
  echo "Trying with verified sender emmypat4rl@gmail.com as FROM address..."
  aws ses send-email \
    --region "$REGION" \
    --from "$TO" \
    --to "$TO" \
    --subject "$SUBJECT" \
    --html "$BODY_HTML" \
    --text "$BODY_TEXT"
fi
