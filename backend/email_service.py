import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from config import settings
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

# Set up logging
logger = logging.getLogger(__name__)

SUBJECT = "Your RenewMart verification code"

# Thread pool for async email sending
_email_executor = ThreadPoolExecutor(max_workers=3)


def _build_message(recipient_email: str, code: str) -> MIMEMultipart:
    """Build the email message with verification code."""
    sender = settings.get("EMAIL_FROM", "no-reply@example.com")
    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = recipient_email
    msg["Subject"] = SUBJECT

    ttl_seconds = settings.get('VERIFICATION_CODE_TTL', 600)
    ttl_minutes = ttl_seconds // 60

    text_body = f"""Your RenewMart Verification Code

Hello,

Your verification code is: {code}

This code will expire in {ttl_minutes} minutes.

If you did not request this code, please ignore this email.

Best regards,
RenewMart Team"""

    html_body = f"""<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .code-box {{ background-color: #f4f4f4; border: 2px solid #4CAF50; border-radius: 8px; 
                     padding: 20px; text-align: center; margin: 20px 0; }}
        .code {{ font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 4px; }}
        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; 
                   font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class="container">
        <h2>Email Verification</h2>
        <p>Hello,</p>
        <p>Thank you for registering with RenewMart. Please use the following code to verify your email address:</p>
        
        <div class="code-box">
            <div class="code">{code}</div>
        </div>
        
        <p><strong>This code will expire in {ttl_minutes} minutes.</strong></p>
        <p>If you did not request this code, please ignore this email.</p>
        
        <div class="footer">
            <p>This is an automated message from RenewMart. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>"""

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))
    return msg


def _send_email_sync(recipient_email: str, code: str) -> Optional[str]:
    """
    Synchronously send the verification code via SMTP (Gmail).
    
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
        # Reduced timeout for faster failure
        with smtplib.SMTP(host, port, timeout=5) as server:
            server.ehlo()
            if use_tls:
                server.starttls()
                server.ehlo()
            server.login(username, password)
            server.sendmail(sender, [recipient_email], msg.as_string())
        logger.info(f"Verification email sent successfully to {recipient_email}")
        return None
    except smtplib.SMTPAuthenticationError as e:
        error_msg = "SMTP authentication failed. Please check email credentials."
        logger.error(f"{error_msg}: {str(e)}")
        return error_msg
    except smtplib.SMTPException as e:
        error_msg = f"SMTP error occurred: {str(e)}"
        logger.error(f"Failed to send email to {recipient_email}: {error_msg}")
        return error_msg
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(f"Failed to send email to {recipient_email}: {error_msg}")
        return error_msg


async def send_verification_email_async(recipient_email: str, code: str) -> Optional[str]:
    """
    Asynchronously send the verification code in a background thread.
    
    This prevents blocking the main request thread.
    Returns optional error message string if send fails.
    """
    loop = asyncio.get_event_loop()
    try:
        error = await loop.run_in_executor(_email_executor, _send_email_sync, recipient_email, code)
        return error
    except Exception as e:
        error_msg = f"Failed to queue email: {str(e)}"
        logger.error(error_msg)
        return error_msg


def send_verification_email(recipient_email: str, code: str) -> Optional[str]:
    """
    Synchronous wrapper for backwards compatibility.
    
    Returns optional error message string if send fails.
    Raises exception if configuration is invalid.
    """
    return _send_email_sync(recipient_email, code)