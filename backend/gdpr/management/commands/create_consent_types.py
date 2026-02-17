"""
Management command to create default consent types.

Creates standard consent types required for GDPR compliance.

Usage:
    python manage.py create_consent_types
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from gdpr.consent_models import ConsentType

User = get_user_model()


class Command(BaseCommand):
    help = 'Create default consent types for GDPR compliance'
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO(
            "\n" + "=" * 70 + "\n"
            "CREATING DEFAULT CONSENT TYPES\n"
            "=" * 70 + "\n"
        ))
        
        created_count = 0
        updated_count = 0
        
        # Define default consent types
        consent_types_data = [
            {
                'code': 'terms_of_service',
                'name': 'Terms of Service',
                'description': 'Agreement to the terms and conditions of using the service',
                'version': '1.0',
                'is_required': True,
                'legal_basis': 'GDPR Article 6(1)(b) - Contract',
                'consent_text': '''
Jag accepterar användarvillkoren för Ungdomsappen. Jag förstår att:
- Jag måste följa gemenskapens regler
- Jag ansvarar för mitt konto och mina handlingar
- Tjänsten tillhandahålls i befintligt skick
- Min användning kan avslutas vid överträdelse

I accept the Terms of Service for Ungdomsappen. I understand that:
- I must follow the community rules
- I am responsible for my account and actions
- The service is provided as-is
- My access may be terminated for violations
                '''.strip(),
                'document_url': '/legal/terms',
                'display_order': 1
            },
            {
                'code': 'privacy_policy',
                'name': 'Privacy Policy',
                'description': 'Consent to data processing as described in privacy policy',
                'version': '1.0',
                'is_required': True,
                'legal_basis': 'GDPR Article 6(1)(a) - Consent',
                'consent_text': '''
Jag har läst och förstått integritetspolicyn. Jag samtycker till att mina personuppgifter behandlas enligt beskrivningen i policyn.

I have read and understood the Privacy Policy. I consent to my personal data being processed as described in the policy.
                '''.strip(),
                'document_url': '/legal/privacy',
                'display_order': 2
            },
            {
                'code': 'marketing_emails',
                'name': 'Marketing Communications',
                'description': 'Receive newsletters, updates, and promotional emails',
                'version': '1.0',
                'is_required': False,
                'legal_basis': 'GDPR Article 6(1)(a) - Consent',
                'consent_text': '''
Jag vill få nyhetsbrev, uppdateringar och information om event och aktiviteter via e-post.

I want to receive newsletters, updates, and information about events and activities via email.
                '''.strip(),
                'document_url': '',
                'display_order': 3
            },
            {
                'code': 'marketing_sms',
                'name': 'SMS Notifications',
                'description': 'Receive important updates and reminders via SMS',
                'version': '1.0',
                'is_required': False,
                'legal_basis': 'GDPR Article 6(1)(a) - Consent',
                'consent_text': '''
Jag vill få viktiga uppdateringar och påminnelser via SMS.

I want to receive important updates and reminders via SMS.
                '''.strip(),
                'document_url': '',
                'display_order': 4
            },
            {
                'code': 'data_processing',
                'name': 'Data Processing',
                'description': 'Consent to process personal data for service operation',
                'version': '1.0',
                'is_required': True,
                'legal_basis': 'GDPR Article 6(1)(a) - Consent',
                'consent_text': '''
Jag samtycker till att Ungdomsappen behandlar mina personuppgifter för att:
- Tillhandahålla och förbättra tjänsten
- Kommunicera med mig om min användning
- Säkerställa säkerhet och förebygga missbruk
- Uppfylla juridiska skyldigheter

I consent to Ungdomsappen processing my personal data to:
- Provide and improve the service
- Communicate with me about my usage
- Ensure security and prevent abuse
- Fulfill legal obligations
                '''.strip(),
                'document_url': '/legal/data-processing',
                'display_order': 5
            },
            {
                'code': 'age_verification',
                'name': 'Age Verification',
                'description': 'Confirmation of age eligibility to use the service',
                'version': '1.0',
                'is_required': True,
                'legal_basis': 'Legal requirement',
                'consent_text': '''
Jag bekräftar att jag är minst 13 år gammal (eller har vårdnadshavares godkännande).

I confirm that I am at least 13 years old (or have parental consent).
                '''.strip(),
                'document_url': '',
                'display_order': 6
            },
            {
                'code': 'photo_sharing',
                'name': 'Photo Sharing',
                'description': 'Consent to upload and share photos on the platform',
                'version': '1.0',
                'is_required': False,
                'legal_basis': 'GDPR Article 6(1)(a) - Consent',
                'consent_text': '''
Jag samtycker till att ladda upp och dela foton på plattformen. Jag förstår att andra användare kan se mina foton.

I consent to upload and share photos on the platform. I understand that other users may see my photos.
                '''.strip(),
                'document_url': '',
                'display_order': 7
            },
        ]
        
        # Create or update consent types
        for data in consent_types_data:
            code = data['code']
            
            consent_type, created = ConsentType.objects.update_or_create(
                code=code,
                defaults={
                    'name': data['name'],
                    'description': data['description'],
                    'version': data['version'],
                    'is_required': data['is_required'],
                    'legal_basis': data['legal_basis'],
                    'consent_text': data['consent_text'],
                    'document_url': data['document_url'],
                    'display_order': data['display_order'],
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(
                    f"✓ Created: {consent_type.name} (v{consent_type.version})"
                ))
            else:
                updated_count += 1
                self.stdout.write(
                    f"  Updated: {consent_type.name} (v{consent_type.version})"
                )
        
        self.stdout.write(self.style.SUCCESS(
            f"\n{'=' * 70}\n"
            f"SUMMARY\n"
            f"{'=' * 70}\n"
            f"Consent types created: {created_count}\n"
            f"Consent types updated: {updated_count}\n"
            f"Total consent types: {created_count + updated_count}\n"
            f"{'=' * 70}\n"
            f"\n✅ Consent types ready!"
            f"\n   Users can now give consents during registration.\n"
        ))


