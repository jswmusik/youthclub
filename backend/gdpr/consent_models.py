"""
GDPR Consent Management Models.

Tracks user consents for various purposes as required by GDPR Article 6 & 7.
"""

from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class ConsentType(models.Model):
    """
    Defines types of consent that can be requested from users.
    
    Examples:
    - Terms of Service
    - Privacy Policy
    - Marketing communications
    - Data processing
    - Third-party data sharing
    """
    
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text=_("Unique code for this consent type (e.g., 'terms_of_service')")
    )
    
    name = models.CharField(
        max_length=200,
        help_text=_("Display name of this consent type")
    )
    
    description = models.TextField(
        help_text=_("Description of what the user is consenting to")
    )
    
    version = models.CharField(
        max_length=20,
        help_text=_("Version of the consent (e.g., '1.0', '2023-01-15')")
    )
    
    is_required = models.BooleanField(
        default=False,
        help_text=_("Whether this consent is required for registration")
    )
    
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text=_("Whether this consent is currently active")
    )
    
    # Legal references
    legal_basis = models.CharField(
        max_length=100,
        blank=True,
        help_text=_("Legal basis for this consent (GDPR Article)")
    )
    
    # Consent text
    consent_text = models.TextField(
        help_text=_("The actual text the user consents to")
    )
    
    # Links to documents
    document_url = models.URLField(
        blank=True,
        help_text=_("URL to full document (e.g., Privacy Policy)")
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='consent_types_created',
        help_text=_("Admin who created this consent type")
    )
    
    # Display order
    display_order = models.IntegerField(
        default=0,
        help_text=_("Order in which to display consents")
    )
    
    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = _("Consent Type")
        verbose_name_plural = _("Consent Types")
    
    def __str__(self):
        return f"{self.name} (v{self.version})"
    
    @property
    def is_current_version(self):
        """Check if this is the latest version of this consent type"""
        latest = ConsentType.objects.filter(
            code=self.code,
            is_active=True
        ).order_by('-version').first()
        return latest and latest.id == self.id

    def get_translation(self, language_code):
        """
        Get the translation for a specific language.
        Falls back to Swedish ('sv') if not found, then English ('en').
        """
        try:
            return self.translations.get(language=language_code)
        except:
            # Fallback to Swedish
            try:
                return self.translations.get(language='sv')
            except:
                # Fallback to English
                try:
                    return self.translations.get(language='en')
                except:
                    return None

    def get_localized_name(self, language_code='sv'):
        """Get translated name or fallback to default"""
        trans = self.get_translation(language_code)
        return trans.name if trans else self.name

    def get_localized_description(self, language_code='sv'):
        """Get translated description or fallback to default"""
        trans = self.get_translation(language_code)
        return trans.description if trans else self.description

    def get_localized_consent_text(self, language_code='sv'):
        """Get translated consent text or fallback to default"""
        trans = self.get_translation(language_code)
        return trans.consent_text if trans else self.consent_text


class UserConsent(models.Model):
    """
    Records a user's consent for a specific purpose.
    
    This provides the audit trail required by GDPR Article 7(1):
    "Where processing is based on consent, the controller shall be able 
    to demonstrate that the data subject has consented to processing."
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='consents',
        help_text=_("User who gave consent")
    )
    
    consent_type = models.ForeignKey(
        ConsentType,
        on_delete=models.PROTECT,  # Don't allow deletion of consent types with consents
        related_name='user_consents',
        help_text=_("Type of consent given")
    )
    
    # Consent details
    consented_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text=_("When consent was given")
    )
    
    consent_method = models.CharField(
        max_length=50,
        choices=[
            ('REGISTRATION', _('During registration')),
            ('SETTINGS', _('In settings page')),
            ('PROMPT', _('Via consent prompt')),
            ('API', _('Via API')),
            ('ADMIN', _('By administrator')),
        ],
        default='REGISTRATION',
        help_text=_("How consent was obtained")
    )
    
    # Technical details for audit trail
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text=_("IP address when consent was given")
    )
    
    user_agent = models.TextField(
        blank=True,
        help_text=_("Browser/device user agent")
    )
    
    # Consent text at time of consent (for audit trail)
    consent_text_snapshot = models.TextField(
        help_text=_("Snapshot of consent text at time of consent")
    )
    
    version_snapshot = models.CharField(
        max_length=20,
        help_text=_("Version of consent at time of consent")
    )
    
    # Withdrawal
    withdrawn_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text=_("When consent was withdrawn (if applicable)")
    )
    
    withdrawal_reason = models.TextField(
        blank=True,
        help_text=_("Reason for withdrawal (optional)")
    )
    
    withdrawal_ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text=_("IP address when consent was withdrawn")
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text=_("Whether consent is currently active")
    )
    
    class Meta:
        ordering = ['-consented_at']
        indexes = [
            models.Index(fields=['user', 'consent_type'], name='gdpr_consent_user_type_idx'),
            models.Index(fields=['user', 'is_active'], name='gdpr_consent_user_active_idx'),
            models.Index(fields=['consent_type', 'is_active'], name='gdpr_consent_type_active_idx'),
        ]
        verbose_name = _("User Consent")
        verbose_name_plural = _("User Consents")
        
        # Prevent duplicate active consents
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'consent_type'],
                condition=models.Q(is_active=True),
                name='unique_active_consent'
            )
        ]
    
    def __str__(self):
        status = "Active" if self.is_active else "Withdrawn"
        return f"{self.user.email} - {self.consent_type.name} - {status}"
    
    def withdraw(self, reason='', ip_address=None):
        """
        Withdraw this consent.
        
        GDPR Article 7(3): "The data subject shall have the right to withdraw 
        his or her consent at any time."
        """
        self.is_active = False
        self.withdrawn_at = timezone.now()
        self.withdrawal_reason = reason
        self.withdrawal_ip_address = ip_address
        self.save(update_fields=[
            'is_active',
            'withdrawn_at',
            'withdrawal_reason',
            'withdrawal_ip_address'
        ])
    
    @property
    def is_current_version(self):
        """Check if this consent is for the current version"""
        return (
            self.is_active and
            self.version_snapshot == self.consent_type.version
        )
    
    @property
    def needs_update(self):
        """Check if user needs to re-consent due to version change"""
        return (
            self.is_active and
            self.version_snapshot != self.consent_type.version
        )


class ConsentTypeTranslation(models.Model):
    """
    Translation for a consent type in a specific language.
    Similar to EmailTemplateTranslation.
    """
    SUPPORTED_LANGUAGES = [
        ('sv', 'Swedish'),
        ('en', 'English'),
        ('ar', 'Arabic'),
        ('da', 'Danish'),
        ('fi', 'Finnish'),
        ('nb', 'Norwegian'),
        ('prs', 'Dari/Persian'),
        ('so', 'Somali'),
    ]

    consent_type = models.ForeignKey(
        ConsentType,
        on_delete=models.CASCADE,
        related_name='translations'
    )
    language = models.CharField(
        max_length=10,
        choices=SUPPORTED_LANGUAGES,
        help_text=_("Language code for this translation")
    )
    name = models.CharField(
        max_length=200,
        help_text=_("Translated display name")
    )
    description = models.TextField(
        help_text=_("Translated description")
    )
    consent_text = models.TextField(
        help_text=_("Translated consent text (the full legal text)")
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('consent_type', 'language')
        ordering = ['consent_type', 'language']
        verbose_name = _("Consent Type Translation")
        verbose_name_plural = _("Consent Type Translations")

    def __str__(self):
        return f"{self.consent_type.code} - {self.get_language_display()}"


class ConsentTypeVersion(models.Model):
    """
    Tracks version history of consent types for audit purposes.
    When a consent type is updated, a new version record is created.
    """
    consent_type = models.ForeignKey(
        ConsentType,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version = models.CharField(
        max_length=20,
        help_text=_("Version identifier")
    )
    consent_text_snapshot = models.TextField(
        help_text=_("Snapshot of consent text at this version")
    )
    translations_snapshot = models.JSONField(
        default=dict,
        help_text=_("Snapshot of all translations at this version")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='consent_versions_created',
        help_text=_("Admin who created this version")
    )
    change_summary = models.TextField(
        blank=True,
        help_text=_("Summary of changes in this version")
    )

    class Meta:
        ordering = ['-created_at']
        unique_together = ('consent_type', 'version')
        verbose_name = _("Consent Type Version")
        verbose_name_plural = _("Consent Type Versions")

    def __str__(self):
        return f"{self.consent_type.code} v{self.version}"


class ConsentLog(models.Model):
    """
    Detailed log of consent-related events for audit purposes.
    
    Provides additional audit trail beyond UserConsent for compliance.
    """
    
    user_consent = models.ForeignKey(
        UserConsent,
        on_delete=models.CASCADE,
        related_name='logs',
        help_text=_("Related user consent")
    )
    
    event_type = models.CharField(
        max_length=50,
        choices=[
            ('GIVEN', _('Consent given')),
            ('WITHDRAWN', _('Consent withdrawn')),
            ('UPDATED', _('Consent updated')),
            ('VIEWED', _('Consent document viewed')),
            ('REMINDED', _('Consent reminder sent')),
        ],
        help_text=_("Type of event")
    )
    
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text=_("When the event occurred")
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text=_("IP address of the event")
    )
    
    details = models.JSONField(
        null=True,
        blank=True,
        help_text=_("Additional event details")
    )
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = _("Consent Log Entry")
        verbose_name_plural = _("Consent Log Entries")
    
    def __str__(self):
        return f"{self.event_type} - {self.user_consent.user.email} - {self.timestamp}"

