"""
Management command to create default email templates with Swedish content.

This creates basic templates so you can test the email system immediately.
You can edit the templates later in the admin panel.

Usage:
    python manage.py create_default_templates
"""
from django.core.management.base import BaseCommand
from emails.models import EmailTemplate, EmailTemplateTranslation


class Command(BaseCommand):
    help = 'Create default email templates with Swedish translations for testing'

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(
            "\n" + "="*60 + "\n"
            "CREATING DEFAULT EMAIL TEMPLATES\n"
            "="*60 + "\n"
        ))

        templates_created = 0
        translations_created = 0

        # Define templates with their Swedish translations
        templates_data = [
            {
                'type': 'welcome',
                'name': 'Welcome Email',
                'description': 'Sent when a new user registers',
                'subject': 'Välkommen till {{app_name}}, {{user.first_name}}! 🎉',
                'body_html': '''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px; text-align: center;">
        <h1>Välkommen {{user.first_name}}! 🎉</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; margin-top: 20px; border-radius: 12px;">
        <p>Hej {{user.first_name}},</p>
        <p>Tack för att du registrerade dig på {{app_name}}!</p>
        <p><strong>Din klubb:</strong> {{club_name}}</p>
        <h3>Nästa steg:</h3>
        <ul>
            <li>Utforska evenemang</li>
            <li>Chatta med andra medlemmar</li>
            <li>Tjäna belöningar</li>
        </ul>
        <p style="margin-top: 30px;">Med vänliga hälsningar,<br><strong>{{app_name}} teamet</strong></p>
    </div>
    <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">
        <p>{{app_name}} | {{support_email}} | &copy; {{current_year}}</p>
    </div>
</body>
</html>''',
                'body_text': 'Hej {{user.first_name}}! Tack för att du registrerade dig på {{app_name}}. Din klubb: {{club_name}}. Utforska appen och ha kul!'
            },
            {
                'type': 'guardian_created',
                'name': 'Guardian Account Created',
                'description': 'Sent when a shadow guardian account is created',
                'subject': 'Ditt konto på {{app_name}} har skapats',
                'body_html': '''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #059669; color: white; padding: 30px; border-radius: 12px;">
        <h1>Hej {{user.first_name}}!</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; margin-top: 20px; border-radius: 12px;">
        <p><strong>{{youth_name}}</strong> har lagt till dig som målsman på {{app_name}}.</p>
        <p>För att komma igång behöver du sätta ett lösenord för ditt konto.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{set_password_url}}" style="background: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                Sätt mitt lösenord
            </a>
        </div>
        <p style="font-size: 12px; color: #6b7280;">Om du inte kan klicka på knappen, kopiera denna länk: {{set_password_url}}</p>
        <p>Klubb: {{club_name}}</p>
        <p style="margin-top: 30px;">Mvh,<br><strong>{{app_name}}</strong></p>
    </div>
</body>
</html>''',
                'body_text': '{{youth_name}} har lagt till dig som målsman. Sätt ditt lösenord här: {{set_password_url}}'
            },
            {
                'type': 'guardian_link_request',
                'name': 'Guardian Link Request',
                'description': 'Sent when a youth requests to link with an existing guardian',
                'subject': '{{youth_name}} vill lägga till dig som målsman',
                'body_html': '''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1>Ny måls mansbegäran</h1>
    <p><strong>{{youth_name}}</strong> ({{youth_email}}) har lagt till dig som målsman på {{app_name}}.</p>
    <p>Logga in på ditt konto för att godkänna eller neka denna begäran.</p>
    <p style="margin-top: 30px;">Mvh,<br><strong>{{app_name}}</strong></p>
</body>
</html>''',
                'body_text': '{{youth_name}} har lagt till dig som målsman på {{app_name}}.'
            },
            {
                'type': 'new_message',
                'name': 'New Message Received',
                'description': 'Sent when user receives a new message',
                'subject': 'Nytt meddelande från {{sender_name}}',
                'body_html': '''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1>📬 Nytt meddelande!</h1>
    <p><strong>{{sender_name}}</strong> har skickat dig ett meddelande:</p>
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-style: italic;">"{{message_preview}}"</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
        <a href="http://localhost:3000/messages" style="background: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Läs meddelandet
        </a>
    </div>
    <p style="margin-top: 30px;">Mvh,<br><strong>{{app_name}}</strong></p>
</body>
</html>''',
                'body_text': 'Nytt meddelande från {{sender_name}}: "{{message_preview}}"'
            },
            {
                'type': 'new_post',
                'name': 'New Post Published',
                'description': 'Sent when a new post is published to users from their club, municipality, or followed clubs',
                'subject': 'Nytt inlägg från {{source_name}}',
                'body_html': '''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #6366f1; color: white; padding: 30px; border-radius: 12px;">
        <h1>📢 Nytt inlägg!</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; margin-top: 20px; border-radius: 12px;">
        <p>Hej {{user.first_name}},</p>
        <p><strong>{{source_name}}</strong> har publicerat ett nytt inlägg:</p>
        <div style="background: white; padding: 20px; border-left: 4px solid #6366f1; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #6366f1;">{{post_title}}</h3>
            <p style="color: #6b7280;">{{post_preview}}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/dashboard/youth" style="background: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                Läs hela inlägget
            </a>
        </div>
        <p style="margin-top: 30px;">Mvh,<br><strong>{{app_name}}</strong></p>
    </div>
</body>
</html>''',
                'body_text': 'Nytt inlägg från {{source_name}}: {{post_title}} - {{post_preview}}'
            },
            {
                'type': 'new_event',
                'name': 'New Event Published',
                'description': 'Sent when a new event is published to eligible users',
                'subject': '🎉 Nytt event: {{event_title}}',
                'body_html': '''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; padding: 30px; border-radius: 12px; text-align: center;">
        <h1>🎉 Nytt Event!</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; margin-top: 20px; border-radius: 12px;">
        <p>Hej {{user.first_name}},</p>
        <p><strong>{{source_name}}</strong> har publicerat ett nytt event som du kan delta i:</p>
        
        <div style="background: white; padding: 25px; border-radius: 12px; margin: 20px 0; border: 2px solid #8b5cf6;">
            <h2 style="margin-top: 0; color: #8b5cf6;">{{event_title}}</h2>
            <p style="color: #4b5563; margin: 15px 0;">{{event_description}}</p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 10px 0;"><strong>📅 Datum:</strong> {{event_date}}</p>
                <p style="margin: 10px 0;"><strong>📍 Plats:</strong> {{event_location}}</p>
                {% if registration_required %}
                <p style="margin: 10px 0; color: #dc2626;"><strong>⚠️ Registrering krävs</strong></p>
                {% endif %}
            </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/dashboard/youth/events" style="background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                Se eventet
            </a>
        </div>
        
        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Missa inte detta spännande event! Registrera dig snabbt om det behövs.
        </p>
        
        <p style="margin-top: 30px;">Med vänliga hälsningar,<br><strong>{{app_name}} teamet</strong></p>
    </div>
    <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">
        <p>{{app_name}} | {{support_email}} | &copy; {{current_year}}</p>
    </div>
</body>
</html>''',
                'body_text': 'Nytt event från {{source_name}}: {{event_title}}\n\n{{event_description}}\n\nDatum: {{event_date}}\nPlats: {{event_location}}\n\nSe eventet: http://localhost:3000/dashboard/youth/events'
            },
            {
                'type': 'event_registration_confirmed',
                'name': 'Event Registration Confirmed',
                'description': 'Sent when event registration is approved',
                'subject': 'Din plats är bokad: {{event_title}} 🎉',
                'body_html': '''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #10b981; color: white; padding: 30px; border-radius: 12px; text-align: center;">
        <h1>Plats bekräftad! 🎉</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; margin-top: 20px; border-radius: 12px;">
        <p>Grattis {{user.first_name}}! Du har fått en plats på:</p>
        <h2 style="color: #6366f1;">{{event_title}}</h2>
        <p><strong>📅 Datum:</strong> {{event_date}}</p>
        <p><strong>📍 Plats:</strong> {{event_location}}</p>
        <p>{{custom_message}}</p>
        <p style="margin-top: 30px;">Vi ses där!<br><strong>{{app_name}}</strong></p>
    </div>
</body>
</html>''',
                'body_text': 'Din plats är bokad för {{event_title}} den {{event_date}} på {{event_location}}'
            },
            {
                'type': 'event_cancelled',
                'name': 'Event Cancelled',
                'description': 'Sent when an event is cancelled',
                'subject': 'Event inställt: {{event_title}}',
                'body_html': '''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #ef4444; color: white; padding: 30px; border-radius: 12px;">
        <h1>Event inställt</h1>
    </div>
    <div style="padding: 30px;">
        <p>Hej {{user.first_name}},</p>
        <p>Tyvärr måste vi meddela att följande event har ställts in:</p>
        <h2>{{event_title}}</h2>
        <p><strong>Datum:</strong> {{event_date}}</p>
        <p>Vi ber om ursäkt för besväret. Håll utkik efter nya event!</p>
        <p style="margin-top: 30px;">Mvh,<br><strong>{{app_name}}</strong></p>
    </div>
</body>
</html>''',
                'body_text': 'Eventet {{event_title}} ({{event_date}}) har tyvärr ställts in. Vi ber om ursäkt!'
            },
            {
                'type': 'reward_earned',
                'name': 'Reward Earned',
                'description': 'Sent when user earns a reward',
                'subject': 'Du har tjänat en belöning! 🎁',
                'body_html': '''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; padding: 30px; border-radius: 12px; text-align: center;">
        <h1>🎁 Ny belöning!</h1>
    </div>
    <div style="padding: 30px;">
        <p>Grattis {{user.first_name}}!</p>
        <p>Du har låst upp en ny belöning:</p>
        <h2 style="color: #f59e0b;">{{reward_name}}</h2>
        <p>{{reward_description}}</p>
        <p><strong>Typ:</strong> {{reward_type}}</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/dashboard/youth/profile?tab=wallet" style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                Visa min plånbok
            </a>
        </div>
    </div>
</body>
</html>''',
                'body_text': 'Grattis! Du har tjänat belöningen: {{reward_name}}'
            },
            {
                'type': 'birthday',
                'name': 'Birthday Greeting',
                'description': 'Sent on users birthday',
                'subject': 'Grattis på födelsedagen {{user.first_name}}! 🎂',
                'body_html': '''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; padding: 30px; border-radius: 12px; text-align: center;">
        <h1>🎂 Grattis på födelsedagen! 🎉</h1>
    </div>
    <div style="padding: 30px; text-align: center;">
        <p style="font-size: 18px;">Grattis {{user.first_name}}!</p>
        <p style="font-size: 48px; margin: 20px 0;">🎈 {{age}} 🎈</p>
        <p>Vi på {{app_name}} önskar dig en fantastisk dag!</p>
        <p style="margin-top: 30px;">🎁 Allt gott! 🎁</p>
    </div>
</body>
</html>''',
                'body_text': 'Grattis på födelsedagen {{user.first_name}}! Du fyller {{age}} år idag! 🎂'
            },
            {
                'type': 'trial_expiring',
                'name': 'Trial Period Expiring',
                'description': 'Sent when trial period is about to expire',
                'subject': 'Din provperiod går ut om {{days_left}} dagar',
                'body_html': '''<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #f59e0b; color: white; padding: 30px; border-radius: 12px;">
        <h1>⚠️ Din provperiod går snart ut</h1>
    </div>
    <div style="padding: 30px;">
        <p>Hej {{user.first_name}},</p>
        <p>Din provperiod på {{app_name}} går ut om <strong>{{days_left}} dagar</strong> ({{expiration_date}}).</p>
        <p>För att fortsätta använda appen efter provperioden behöver du verifiera ditt konto.</p>
        <h3>Hur verifierar jag mitt konto?</h3>
        <ol>
            <li>Ladda upp ett ID-dokument i din profil</li>
            <li>Vänta på godkännande från din klubb</li>
        </ol>
        <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/dashboard/youth/profile" style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                Verifiera mitt konto
            </a>
        </div>
        <p>Mvh,<br><strong>{{app_name}}</strong></p>
    </div>
</body>
</html>''',
                'body_text': 'Din provperiod går ut om {{days_left}} dagar. Verifiera ditt konto för att fortsätta använda appen.'
            },
            {
                'type': 'data_export_ready',
                'name': 'Data Export Ready',
                'description': 'Sent when user data export is ready for download (GDPR)',
                'subject': '📦 Din data är redo att laddas ner',
                'body_html': '''<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .info-box { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
        .warning { color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Hej {{first_name}}!</h2>
        <p>Din data är nu klar att laddas ner.</p>
        
        <div class="info-box">
            <p><strong>📊 Exportdetaljer:</strong></p>
            <ul style="margin: 10px 0;">
                <li>Filstorlek: {{file_size_mb}} MB</li>
                <li>Format: JSON</li>
                <li>Skapad: {{requested_at}}</li>
                <li>Giltig till: {{expires_in_days}} dagar</li>
            </ul>
        </div>
        
        <a href="{{download_url}}" class="button">Ladda ner min data</a>
        
        <div class="warning">
            <strong>⚠️ Viktigt:</strong> Nedladdningslänken är giltig i {{expires_in_days}} dagar. Efter det måste du begära en ny export.
        </div>
        
        <p>Din export innehåller all din personliga data som vi lagrar, inklusive:</p>
        <ul>
            <li>Profilinformation</li>
            <li>Inlägg och kommentarer</li>
            <li>Meddelanden</li>
            <li>Besökshistorik</li>
            <li>Eventregistreringar</li>
            <li>Belöningar</li>
            <li>Och mycket mer</li>
        </ul>
        
        <p>Detta är en del av dina GDPR-rättigheter (Artikel 15 & 20).</p>
        
        <p>Mvh,<br><strong>{{app_name}}</strong></p>
    </div>
</body>
</html>''',
                'body_text': 'Din data är nu klar att laddas ner. Besök {{download_url}} för att ladda ner din data. Länken är giltig i {{expires_in_days}} dagar.'
            },
            {
                'type': 'data_export_failed',
                'name': 'Data Export Failed',
                'description': 'Sent when user data export fails',
                'subject': '❌ Problem med din dataexport',
                'body_html': '''<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .error-box { background-color: #f8d7da; color: #721c24; padding: 15px; border-left: 4px solid #f5c6cb; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Hej {{first_name}}!</h2>
        
        <div class="error-box">
            <p><strong>❌ Tyvärr uppstod ett problem</strong></p>
            <p>Vi kunde inte slutföra exporten av din data just nu.</p>
        </div>
        
        <p>Vi ber om ursäkt för besväret. Detta kan bero på:</p>
        <ul>
            <li>Tillfälliga tekniska problem</li>
            <li>För stor datamängd</li>
            <li>Systemunderhåll</li>
        </ul>
        
        <p><strong>Vad händer nu?</strong></p>
        <p>Du kan prova att begära en ny export om några minuter. Om problemet kvarstår, kontakta oss på {{support_email}} så hjälper vi dig.</p>
        
        <p>Mvh,<br><strong>{{app_name}}</strong></p>
    </div>
</body>
</html>''',
                'body_text': 'Tyvärr uppstod ett problem med exporten av din data. Vänligen försök igen senare eller kontakta support på {{support_email}}.'
            },
        ]

        # Create templates
        for template_data in templates_data:
            template_type = template_data.pop('type')
            subject = template_data.pop('subject')
            body_html = template_data.pop('body_html')
            body_text = template_data.pop('body_text')

            # Create or get template
            template, created = EmailTemplate.objects.get_or_create(
                type=template_type,
                defaults={
                    'name': template_data['name'],
                    'description': template_data['description'],
                    'is_active': True
                }
            )

            if created:
                templates_created += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ Created template: {template.name}"))
            else:
                self.stdout.write(f"  - Template exists: {template.name}")

            # Create Swedish translation
            translation, trans_created = EmailTemplateTranslation.objects.get_or_create(
                template=template,
                language='sv',
                defaults={
                    'subject': subject,
                    'body_html': body_html,
                    'body_text': body_text
                }
            )

            if trans_created:
                translations_created += 1
                self.stdout.write(self.style.SUCCESS(f"    ✓ Added Swedish translation"))
            else:
                self.stdout.write(f"    - Swedish translation exists")

        self.stdout.write(self.style.SUCCESS(
            f"\n{'='*60}\n"
            f"SUMMARY\n"
            f"{'='*60}\n"
            f"Templates created: {templates_created}\n"
            f"Translations created: {translations_created}\n"
            f"{'='*60}\n"
            f"\n✅ You can now test the email system!"
            f"\n   Try registering a new user to receive a welcome email.\n"
        ))

