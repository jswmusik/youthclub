"""
Migration to add the Password Reset email template with English and Swedish translations.
"""

from django.db import migrations


def create_password_reset_template(apps, schema_editor):
    EmailTemplate = apps.get_model('emails', 'EmailTemplate')
    EmailTemplateTranslation = apps.get_model('emails', 'EmailTemplateTranslation')
    
    # Create the PASSWORD_RESET template
    template, created = EmailTemplate.objects.get_or_create(
        type='password_reset',
        defaults={
            'name': 'Password Reset Request',
            'description': 'Email sent when a user requests to reset their password.',
            'available_variables': [
                {'name': 'user.full_name', 'description': "Recipient's full name"},
                {'name': 'user.first_name', 'description': "Recipient's first name"},
                {'name': 'user.email', 'description': "Recipient's email address"},
                {'name': 'reset_url', 'description': 'Full URL to reset password'},
                {'name': 'validity_hours', 'description': 'How long the reset link is valid'},
                {'name': 'app_name', 'description': 'Name of the application'},
                {'name': 'support_email', 'description': 'Support email address'},
                {'name': 'current_year', 'description': 'Current year'},
            ],
            'is_active': True,
        }
    )
    
    if created:
        # Add English translation
        EmailTemplateTranslation.objects.create(
            template=template,
            language='en',
            subject='Reset your password for {{ app_name }}',
            body_html='''
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #1a1a2e; color: #ffffff;">
    <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #c9f21d; font-size: 28px; margin: 0;">🔐 Password Reset</h1>
    </div>
    
    <div style="background-color: #16213e; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hello {{ user.first_name }},
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            We received a request to reset your password for your {{ app_name }} account. Click the button below to create a new password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ reset_url }}" style="display: inline-block; background-color: #c9f21d; color: #1a1a2e; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Reset My Password
            </a>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #a0a0a0; margin: 20px 0 0 0;">
            This link is valid for {{ validity_hours }} hours. If you didn't request a password reset, you can safely ignore this email.
        </p>
    </div>
    
    <div style="background-color: #0f0f23; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <p style="font-size: 13px; color: #888; margin: 0;">
            <strong>Security tip:</strong> Never share this link with anyone. {{ app_name }} will never ask you for your password via email.
        </p>
    </div>
    
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #2a2a4a;">
        <p style="font-size: 12px; color: #666; margin: 0;">
            Need help? Contact us at <a href="mailto:{{ support_email }}" style="color: #c9f21d;">{{ support_email }}</a>
        </p>
        <p style="font-size: 12px; color: #666; margin: 10px 0 0 0;">
            © {{ current_year }} {{ app_name }}. All rights reserved.
        </p>
    </div>
</div>
''',
            body_text='''
Hello {{ user.first_name }},

We received a request to reset your password for your {{ app_name }} account.

Click the link below to create a new password:
{{ reset_url }}

This link is valid for {{ validity_hours }} hours.

If you didn't request a password reset, you can safely ignore this email.

Security tip: Never share this link with anyone. {{ app_name }} will never ask you for your password via email.

Need help? Contact us at {{ support_email }}

© {{ current_year }} {{ app_name }}. All rights reserved.
'''
        )
        
        # Add Swedish translation
        EmailTemplateTranslation.objects.create(
            template=template,
            language='sv',
            subject='Återställ ditt lösenord för {{ app_name }}',
            body_html='''
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #1a1a2e; color: #ffffff;">
    <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #c9f21d; font-size: 28px; margin: 0;">🔐 Återställ lösenord</h1>
    </div>
    
    <div style="background-color: #16213e; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Hej {{ user.first_name }},
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Vi har fått en begäran om att återställa lösenordet för ditt {{ app_name }}-konto. Klicka på knappen nedan för att skapa ett nytt lösenord:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ reset_url }}" style="display: inline-block; background-color: #c9f21d; color: #1a1a2e; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Återställ mitt lösenord
            </a>
        </div>
        
        <p style="font-size: 14px; line-height: 1.6; color: #a0a0a0; margin: 20px 0 0 0;">
            Denna länk är giltig i {{ validity_hours }} timmar. Om du inte begärde en lösenordsåterställning kan du tryggt ignorera detta e-postmeddelande.
        </p>
    </div>
    
    <div style="background-color: #0f0f23; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <p style="font-size: 13px; color: #888; margin: 0;">
            <strong>Säkerhetstips:</strong> Dela aldrig denna länk med någon. {{ app_name }} kommer aldrig att be dig om ditt lösenord via e-post.
        </p>
    </div>
    
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #2a2a4a;">
        <p style="font-size: 12px; color: #666; margin: 0;">
            Behöver du hjälp? Kontakta oss på <a href="mailto:{{ support_email }}" style="color: #c9f21d;">{{ support_email }}</a>
        </p>
        <p style="font-size: 12px; color: #666; margin: 10px 0 0 0;">
            © {{ current_year }} {{ app_name }}. Alla rättigheter förbehållna.
        </p>
    </div>
</div>
''',
            body_text='''
Hej {{ user.first_name }},

Vi har fått en begäran om att återställa lösenordet för ditt {{ app_name }}-konto.

Klicka på länken nedan för att skapa ett nytt lösenord:
{{ reset_url }}

Denna länk är giltig i {{ validity_hours }} timmar.

Om du inte begärde en lösenordsåterställning kan du tryggt ignorera detta e-postmeddelande.

Säkerhetstips: Dela aldrig denna länk med någon. {{ app_name }} kommer aldrig att be dig om ditt lösenord via e-post.

Behöver du hjälp? Kontakta oss på {{ support_email }}

© {{ current_year }} {{ app_name }}. Alla rättigheter förbehållna.
'''
        )


def remove_password_reset_template(apps, schema_editor):
    EmailTemplate = apps.get_model('emails', 'EmailTemplate')
    EmailTemplate.objects.filter(type='password_reset').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('emails', '0004_add_2fa_email_template'),
    ]

    operations = [
        migrations.RunPython(create_password_reset_template, remove_password_reset_template),
    ]

