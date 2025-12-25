from django.db import models
from django.conf import settings
from organization.models import Club

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