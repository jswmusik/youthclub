from django.contrib import admin
from .models import AnalyticsReport

@admin.register(AnalyticsReport)
class AnalyticsReportAdmin(admin.ModelAdmin):
    list_display = ('name', 'report_type', 'created_by', 'club', 'created_at')
    list_filter = ('report_type', 'created_at', 'club')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'created_by', 'data_snapshot')
    
    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)