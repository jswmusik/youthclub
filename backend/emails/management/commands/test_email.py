"""
Quick test command to verify email configuration is working.

Usage:
    # Test with console backend (prints to terminal)
    python manage.py test_email

    # Test with specific email address
    python manage.py test_email --to your-email@example.com
"""
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings


class Command(BaseCommand):
    help = 'Send a test email to verify email configuration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--to',
            type=str,
            default='test@example.com',
            help='Email address to send to (default: test@example.com)'
        )

    def handle(self, *args, **options):
        to_email = options['to']
        
        self.stdout.write(self.style.HTTP_INFO(
            f"\n{'='*60}\n"
            f"EMAIL CONFIGURATION TEST\n"
            f"{'='*60}\n"
            f"Backend: {settings.EMAIL_BACKEND}\n"
            f"Host: {settings.EMAIL_HOST}\n"
            f"Port: {settings.EMAIL_PORT}\n"
            f"From: {settings.DEFAULT_FROM_EMAIL}\n"
            f"To: {to_email}\n"
            f"{'='*60}\n"
        ))

        try:
            send_mail(
                subject='[TEST] Ungdomsappen Email Test',
                message=f'''
This is a test email from Ungdomsappen.

If you're seeing this, your email configuration is working!

Configuration:
- Backend: {settings.EMAIL_BACKEND}
- Host: {settings.EMAIL_HOST}
- Port: {settings.EMAIL_PORT}

Best regards,
Ungdomsappen
                ''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                html_message=f'''<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }}
        .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }}
        .success {{ background: #10b981; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }}
        .config {{ background: #e5e7eb; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Email Test</h1>
        <p>Ungdomsappen</p>
    </div>
    <div class="content">
        <div class="success">
            Your email configuration is working!
        </div>
        <p>This is a test email to verify your email settings.</p>
        <div class="config">
            <strong>Configuration:</strong><br>
            Backend: {settings.EMAIL_BACKEND}<br>
            Host: {settings.EMAIL_HOST}<br>
            Port: {settings.EMAIL_PORT}
        </div>
        <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This email was sent from your local development server.
        </p>
    </div>
</body>
</html>''',
            )
            
            self.stdout.write(self.style.SUCCESS(
                f"\n✅ Test email sent successfully!\n\n"
                f"Where to find it:\n"
            ))
            
            if 'console' in settings.EMAIL_BACKEND:
                self.stdout.write(
                    f"  📺 Check your terminal output above ↑\n"
                    f"     The email content should be printed there.\n"
                )
            elif 'filebased' in settings.EMAIL_BACKEND:
                self.stdout.write(
                    f"  📁 Check the folder: backend/sent_emails/\n"
                    f"     Open the .eml file with any email client.\n"
                )
            else:
                self.stdout.write(
                    f"  📬 Check your inbox at: {to_email}\n"
                    f"     (or your Mailtrap inbox if using Mailtrap)\n"
                )
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f"\n❌ Failed to send email!\n"
                f"Error: {str(e)}\n\n"
                f"Troubleshooting:\n"
                f"  1. Check your EMAIL_* settings in .env\n"
                f"  2. Verify your SMTP credentials\n"
                f"  3. Make sure your firewall allows outgoing SMTP\n"
            ))

