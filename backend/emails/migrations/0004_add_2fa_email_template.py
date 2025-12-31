"""
Data migration to add the 2FA OTP email template with translations.
"""

from django.db import migrations


def create_2fa_template(apps, schema_editor):
    """Create the 2FA OTP email template with English and Swedish translations."""
    EmailTemplate = apps.get_model('emails', 'EmailTemplate')
    EmailTemplateTranslation = apps.get_model('emails', 'EmailTemplateTranslation')
    
    # Create the template
    template, created = EmailTemplate.objects.get_or_create(
        type='two_factor_otp',
        defaults={
            'name': 'Two-Factor Authentication OTP',
            'description': 'Sent when a user needs to verify their identity with a one-time password during login.',
            'available_variables': [
                {'name': 'user.first_name', 'description': "User's first name"},
                {'name': 'user.email', 'description': "User's email address"},
                {'name': 'otp_code', 'description': "The 6-digit OTP code"},
                {'name': 'validity_minutes', 'description': "How many minutes the code is valid"},
                {'name': 'app_name', 'description': "Application name (Ungdomsappen)"},
            ],
            'is_active': True
        }
    )
    
    if not created:
        # Template already exists, just ensure translations exist
        pass
    
    # English translation
    EmailTemplateTranslation.objects.get_or_create(
        template=template,
        language='en',
        defaults={
            'subject': 'Your verification code: {{ otp_code }}',
            'body_html': '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .code-box { background: white; border: 2px solid #6366f1; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
        .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6366f1; font-family: monospace; }
        .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 Verification Code</h1>
    </div>
    <div class="content">
        <p>Hi {{ user.first_name }},</p>
        <p>You're attempting to log in to {{ app_name }}. Use the following code to complete your sign-in:</p>
        
        <div class="code-box">
            <div class="code">{{ otp_code }}</div>
        </div>
        
        <p>This code is valid for <strong>{{ validity_minutes }} minutes</strong>.</p>
        
        <p class="warning">⚠️ If you didn't request this code, please ignore this email. Someone may have entered your email address by mistake.</p>
    </div>
    <div class="footer">
        <p>This is an automated message from {{ app_name }}. Please do not reply to this email.</p>
    </div>
</body>
</html>''',
            'body_text': '''Hi {{ user.first_name }},

You're attempting to log in to {{ app_name }}. Use the following code to complete your sign-in:

{{ otp_code }}

This code is valid for {{ validity_minutes }} minutes.

If you didn't request this code, please ignore this email. Someone may have entered your email address by mistake.

This is an automated message from {{ app_name }}. Please do not reply to this email.'''
        }
    )
    
    # Swedish translation
    EmailTemplateTranslation.objects.get_or_create(
        template=template,
        language='sv',
        defaults={
            'subject': 'Din verifieringskod: {{ otp_code }}',
            'body_html': '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .code-box { background: white; border: 2px solid #6366f1; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
        .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6366f1; font-family: monospace; }
        .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 Verifieringskod</h1>
    </div>
    <div class="content">
        <p>Hej {{ user.first_name }},</p>
        <p>Du försöker logga in på {{ app_name }}. Använd följande kod för att slutföra din inloggning:</p>
        
        <div class="code-box">
            <div class="code">{{ otp_code }}</div>
        </div>
        
        <p>Denna kod är giltig i <strong>{{ validity_minutes }} minuter</strong>.</p>
        
        <p class="warning">⚠️ Om du inte begärde denna kod, ignorera detta meddelande. Någon kan ha angett din e-postadress av misstag.</p>
    </div>
    <div class="footer">
        <p>Detta är ett automatiskt meddelande från {{ app_name }}. Vänligen svara inte på detta e-postmeddelande.</p>
    </div>
</body>
</html>''',
            'body_text': '''Hej {{ user.first_name }},

Du försöker logga in på {{ app_name }}. Använd följande kod för att slutföra din inloggning:

{{ otp_code }}

Denna kod är giltig i {{ validity_minutes }} minuter.

Om du inte begärde denna kod, ignorera detta meddelande. Någon kan ha angett din e-postadress av misstag.

Detta är ett automatiskt meddelande från {{ app_name }}. Vänligen svara inte på detta e-postmeddelande.'''
        }
    )


def delete_2fa_template(apps, schema_editor):
    """Remove the 2FA OTP email template."""
    EmailTemplate = apps.get_model('emails', 'EmailTemplate')
    EmailTemplate.objects.filter(type='two_factor_otp').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('emails', '0003_add_2fa_otp_template_type'),
    ]

    operations = [
        migrations.RunPython(create_2fa_template, delete_2fa_template),
    ]

