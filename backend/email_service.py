import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from config import settings

SUBJECT = "Your RenewMart verification code"


def _build_message(recipient_email: str, code: str) -> MIMEMultipart:
    sender = settings.get("EMAIL_FROM", "no-reply@example.com")
    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = recipient_email
    msg["Subject"] = SUBJECT

    text_body = f"Your verification code is: {code}\n\nThis code will expire in {settings.get('VERIFICATION_CODE_TTL', 600)} seconds."
    html_body = (
        f"<html><body>"
        f"<p>Your verification code is: <b>{code}</b></p>"
        f"<p>This code will expire in {settings.get('VERIFICATION_CODE_TTL', 600)} seconds.</p>"
        f"<p>If you did not request this, you can ignore this email.</p>"
        f"</body></html>"
    )

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    return msg


def send_verification_email(recipient_email: str, code: str) -> Optional[str]:
    """
    Send the verification code to the recipient via SMTP (Gmail).

    Returns optional error message string if send fails.
    Raises exception if configuration is invalid.
    """
    host = settings.get("SMTP_HOST", "smtp.gmail.com")
    port = int(settings.get("SMTP_PORT", 587))
    username = settings.get("SMTP_USERNAME")
    password = settings.get("SMTP_PASSWORD")
    use_tls = bool(settings.get("EMAIL_USE_TLS", True))
    sender = settings.get("EMAIL_FROM")

    if not all([host, port, username, password, sender]):
        raise RuntimeError("Missing SMTP configuration (host, port, username, password, sender)")

    msg = _build_message(recipient_email, code)

    try:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.ehlo()
            if use_tls:
                server.starttls()
                server.ehlo()
            server.login(username, password)
            server.sendmail(sender, [recipient_email], msg.as_string())
        return None
    except Exception as e:
        # Return error string so caller can log; they should not crash the endpoint
        return str(e)