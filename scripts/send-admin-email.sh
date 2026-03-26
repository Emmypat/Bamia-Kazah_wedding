#!/bin/bash
# send-admin-email.sh — Send admin login credentials to emmanuel.k.patrick@gmail.com via SES
# Usage: bash scripts/send-admin-email.sh

REGION="eu-west-1"
TO="emmanuel.k.patrick@gmail.com"
FROM="emmanuel.k.patrick@gmail.com"

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
          <th style="text-align: left; padding: 8px 4px; color: #C4956A; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Login Email</th>
          <th style="text-align: left; padding: 8px 4px; color: #C4956A; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Temp Password</th>
        </tr>
        <tr>
          <td style="padding: 10px 4px; color: white; font-weight: bold;">Admin 1</td>
          <td style="padding: 10px 4px; color: #C4956A; font-family: monospace; font-size: 12px;">emmanuel.k.patrick+admin1@gmail.com</td>
          <td style="padding: 10px 4px; color: white; font-family: monospace;">Admin@1234</td>
        </tr>
        <tr style="background: rgba(255,255,255,0.03);">
          <td style="padding: 10px 4px; color: white; font-weight: bold;">Admin 2</td>
          <td style="padding: 10px 4px; color: #C4956A; font-family: monospace; font-size: 12px;">emmanuel.k.patrick+admin2@gmail.com</td>
          <td style="padding: 10px 4px; color: white; font-family: monospace;">Admin@1234</td>
        </tr>
        <tr>
          <td style="padding: 10px 4px; color: white; font-weight: bold;">Admin 3</td>
          <td style="padding: 10px 4px; color: #C4956A; font-family: monospace; font-size: 12px;">emmanuel.k.patrick+admin3@gmail.com</td>
          <td style="padding: 10px 4px; color: white; font-family: monospace;">Admin@1234</td>
        </tr>
      </table>
    </div>

    <div style="background: rgba(196,149,106,0.1); border: 1px solid rgba(196,149,106,0.3); border-radius: 10px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.8;">
        <strong style="color: #C4956A;">First login steps:</strong><br>
        1. Go to the admin login page below<br>
        2. Sign in with your email and the temp password above<br>
        3. You will be asked to set a new permanent password<br>
        4. Password reset codes are sent to: <strong style="color: #C4956A;">emmanuel.k.patrick@gmail.com</strong>
      </p>
    </div>

    <a href="https://dil5ih5xgoo14.cloudfront.net/admin-login"
       style="display: block; background: linear-gradient(135deg, #7A1428, #5C0F1E); color: white;
              text-decoration: none; padding: 14px 24px; border-radius: 50px; text-align: center;
              font-weight: 600; font-size: 15px; margin-bottom: 20px;">
      → Go to Admin Login
    </a>

    <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
      <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0; line-height: 1.8;">
        <strong style="color: rgba(255,255,255,0.6);">Platform URLs:</strong><br>
        Wedding platform: <a href="https://dil5ih5xgoo14.cloudfront.net" style="color: #C4956A;">dil5ih5xgoo14.cloudfront.net</a><br>
        Manage Tickets: /admin/tickets<br>
        Scan Tickets at venue: /admin/scan
      </p>
    </div>
  </div>
</body>
</html>
EOF
)

BODY_TEXT="Bamai & Kazah Wedding — Admin Login Details

Admin Accounts:
  Admin 1 — emmanuel.k.patrick+admin1@gmail.com — Temp password: Admin@1234
  Admin 2 — emmanuel.k.patrick+admin2@gmail.com — Temp password: Admin@1234
  Admin 3 — emmanuel.k.patrick+admin3@gmail.com — Temp password: Admin@1234

Admin Login: https://dil5ih5xgoo14.cloudfront.net/admin-login

Each admin must set a new password on first login.
Password reset codes are sent to: emmanuel.k.patrick@gmail.com"

echo "Sending admin credentials to $TO..."

aws ses send-email \
  --region "$REGION" \
  --from "$FROM" \
  --destination "ToAddresses=$TO" \
  --message "Subject={Data=$SUBJECT,Charset=UTF-8},Body={Text={Data=$BODY_TEXT,Charset=UTF-8},Html={Data=$BODY_HTML,Charset=UTF-8}}" \
  2>&1

if [ $? -eq 0 ]; then
  echo "✓ Email sent successfully to $TO"
else
  echo "SES send failed — emmanuel.k.patrick@gmail.com may not be verified in SES."
  echo ""
  echo "To verify the email, run:"
  echo "  aws ses verify-email-identity --email-address emmanuel.k.patrick@gmail.com --region eu-west-1"
  echo "Then check your inbox for a verification link, and run this script again."
fi
