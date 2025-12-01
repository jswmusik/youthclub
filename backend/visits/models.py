from django.db import models
from django.conf import settings
from organization.models import Club

class CheckInSession(models.Model):
    METHOD_CHOICES = [
        ('QR_KIOSK', 'QR Kiosk Scan'),
        ('MANUAL_ADMIN', 'Manual Admin Entry'),
        ('MANUAL_SELF', 'Manual Self Check-in'), # For geofencing fallback
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='visits'
    )
    club = models.ForeignKey(
        Club, 
        on_delete=models.CASCADE, 
        related_name='visits'
    )
    
    check_in_at = models.DateTimeField(auto_now_add=True, db_index=True)
    check_out_at = models.DateTimeField(null=True, blank=True)
    
    method = models.CharField(
        max_length=20, 
        choices=METHOD_CHOICES, 
        default='QR_KIOSK'
    )
    
    # Audit field: If an admin checks a user in manually, we record who did it.
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='processed_checkins'
    )

    class Meta:
        ordering = ['-check_in_at']
        indexes = [
            # Compound index for fast filtering: "Show me all visits for Club X today"
            models.Index(fields=['club', 'check_in_at']),
        ]

    def __str__(self):
        status = "Active" if not self.check_out_at else "Completed"
        return f"{self.user} @ {self.club} - {status}"


class VisitStats(models.Model):
    """
    Data Warehouse table: Aggregated stats per user per club per month.
    Updated via background task to keep dashboard fast.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    club = models.ForeignKey(Club, on_delete=models.CASCADE)
    year = models.IntegerField()
    month = models.IntegerField()
    
    total_visits = models.IntegerField(default=0)
    total_minutes = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ('user', 'club', 'year', 'month')