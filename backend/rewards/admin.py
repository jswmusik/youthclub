from django.contrib import admin
from .models import Reward, RewardUsage

@admin.register(Reward)
class RewardAdmin(admin.ModelAdmin):
    # Columns to show in the list view
    list_display = ('name', 'owner_role', 'municipality', 'club', 'target_member_type', 'is_active', 'expiration_date')
    
    # Sidebar filters
    list_filter = ('owner_role', 'is_active', 'target_member_type', 'municipality', 'club')
    
    # Search bar config
    search_fields = ('name', 'description', 'sponsor_name')
    
    # Nice UI for selecting multiple Groups/Interests
    filter_horizontal = ('target_groups', 'target_interests')
    
    # Organizing the edit form into logical sections
    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'description', 'image', 'sponsor_name', 'sponsor_link', 'is_active')
        }),
        ('Ownership', {
            'fields': ('owner_role', 'municipality', 'club')
        }),
        ('Targeting', {
            'fields': (
                'target_member_type', 'target_groups', 'target_interests', 
                'target_genders', 'target_grades', 'min_age', 'max_age'
            )
        }),
        ('Constraints & Triggers', {
            'fields': ('expiration_date', 'usage_limit', 'active_triggers', 'trigger_config')
        }),
    )

@admin.register(RewardUsage)
class RewardUsageAdmin(admin.ModelAdmin):
    list_display = ('user', 'reward', 'is_redeemed', 'created_at', 'redeemed_at')
    list_filter = ('is_redeemed', 'reward', 'created_at')
    search_fields = ('user__email', 'reward__name')