#!/usr/bin/env python3
"""
Test script to verify email service configuration
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from config import settings
from email_service import send_verification_email

def test_email_config():
    """Test email configuration"""
    print("="*60)
    print("EMAIL SERVICE CONFIGURATION TEST")
    print("="*60)
    
    print("\n>> Current Email Settings:")
    print(f"  SMTP Host: {settings.get('SMTP_HOST', 'NOT SET')}")
    print(f"  SMTP Port: {settings.get('SMTP_PORT', 'NOT SET')}")
    print(f"  SMTP Username: {settings.get('SMTP_USERNAME', 'NOT SET')}")
    print(f"  Email From: {settings.get('EMAIL_FROM', 'NOT SET')}")
    print(f"  Email Use TLS: {settings.get('EMAIL_USE_TLS', 'NOT SET')}")
    
    # Check if password is set (don't print it)
    password = settings.get('SMTP_PASSWORD')
    if password:
        print(f"  SMTP Password: {'*' * len(str(password))} (SET)")
    else:
        print(f"  SMTP Password: NOT SET [X]")
    
    print("\n" + "="*60)
    
    # Check for missing configuration
    required_fields = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'EMAIL_FROM']
    missing = []
    for field in required_fields:
        if not settings.get(field):
            missing.append(field)
    
    if missing:
        print(f"\n[X] Missing required fields: {', '.join(missing)}")
        return False
    
    print("\n[OK] All email configuration fields are set!")
    return True

def send_test_email():
    """Send a test email"""
    print("\n" + "="*60)
    print("SENDING TEST EMAIL")
    print("="*60)
    
    test_email = settings.get('EMAIL_FROM')
    test_code = "123456"
    
    print(f"\n>> Attempting to send test verification email to: {test_email}")
    print(f"   Verification code: {test_code}")
    
    try:
        error = send_verification_email(test_email, test_code)
        
        if error:
            print(f"\n[X] Email send FAILED!")
            print(f"   Error: {error}")
            return False
        else:
            print(f"\n[OK] Email sent successfully!")
            print(f"   Check inbox at: {test_email}")
            return True
            
    except Exception as e:
        print(f"\n[X] Email send FAILED with exception!")
        print(f"   Error: {str(e)}")
        import traceback
        print("\n>> Full traceback:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n>> Starting Email Service Tests...\n")
    
    # Test configuration
    config_ok = test_email_config()
    
    if not config_ok:
        print("\n[X] Configuration test failed. Please fix configuration before testing email send.")
        sys.exit(1)
    
    # Test sending
    send_ok = send_test_email()
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Configuration: {'[OK] PASS' if config_ok else '[X] FAIL'}")
    print(f"Email Send: {'[OK] PASS' if send_ok else '[X] FAIL'}")
    print("="*60)
    
    if send_ok:
        print("\n[SUCCESS] All tests passed! Email service is working correctly.")
        sys.exit(0)
    else:
        print("\n[ERROR] Email service test failed. Please check the error messages above.")
        sys.exit(1)

