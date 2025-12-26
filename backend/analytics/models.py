from django.db import models
from django.conf import settings
from organization.models import Club


class AnalyticsPreference(models.Model):
    """
    Stores user preferences for which analytics sections to display.
    Each user has one preference record.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='analytics_preferences'
    )
    
    # Visibility preferences stored as JSON for flexibility
    # Default: all sections visible
    preferences = models.JSONField(
        default=dict,
        help_text="JSON object with section visibility preferences"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Analytics Preference"
        verbose_name_plural = "Analytics Preferences"

    def __str__(self):
        return f"Analytics Preferences for {self.user.email}"
    
    @classmethod
    def get_default_preferences(cls):
        """Returns the default preferences with all sections visible."""
        return {
            "metrics": True,
            "heatmap": True,
            "inventory": True,
            "demographics": True,
            "interests": True,
            "insights": True,
            "questionnaires": True,
            "bookings": True,
            "groupComparison": True,
            "clubComparison": True,  # Municipality admin only
            "events": True,
        }
    
    def get_preferences(self):
        """Returns preferences merged with defaults (for new sections)."""
        defaults = self.get_default_preferences()
        if self.preferences:
            defaults.update(self.preferences)
        return defaults


class AnalyticsReport(models.Model):
    """
    Stores generated reports (PDF/Excel) or snapshots of JSON data 
    so admins can look back at historical data without re-calculating.
    """
    class ReportType(models.TextChoices):
        MONTHLY_SUMMARY = 'MONTHLY', 'Monthly Summary'
        YEARLY_SUMMARY = 'YEARLY', 'Yearly Summary'
        CUSTOM = 'CUSTOM', 'Custom Report'

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Ownership
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    club = models.ForeignKey(Club, on_delete=models.CASCADE, null=True, blank=True, help_text="Null if Municipality/Global report")
    
    # Metadata
    report_type = models.CharField(max_length=20, choices=ReportType.choices, default=ReportType.CUSTOM)
    date_range_start = models.DateTimeField()
    date_range_end = models.DateTimeField()
    
    # The actual data
    file = models.FileField(upload_to='reports/generated/', null=True, blank=True, help_text="PDF or Excel export")
    data_snapshot = models.JSONField(default=dict, help_text="Raw JSON metrics at the time of generation")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.created_at.date()})"