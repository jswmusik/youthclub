from django.contrib import admin
from .models import ItemCategory, InventoryTag, Item, LendingSession, WaitingList


@admin.register(ItemCategory)
class ItemCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'item_count']
    search_fields = ['name', 'icon']
    ordering = ['name']
    
    def item_count(self, obj):
        return obj.items.count()
    item_count.short_description = 'Items'


@admin.register(InventoryTag)
class InventoryTagAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'club', 'item_count', 'is_global']
    list_filter = ['club']
    search_fields = ['name', 'icon']
    ordering = ['name']
    
    def item_count(self, obj):
        return obj.items.count()
    item_count.short_description = 'Items'
    
    def is_global(self, obj):
        return obj.club is None
    is_global.boolean = True
    is_global.short_description = 'Global'


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['title', 'club', 'category', 'status', 'max_borrow_duration', 'active_loan_count', 'queue_count', 'created_at']
    list_filter = ['status', 'club', 'category', 'created_at']
    search_fields = ['title', 'description', 'internal_note']
    filter_horizontal = ['tags']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('club', 'title', 'description', 'image', 'category', 'tags')
        }),
        ('Borrowing Settings', {
            'fields': ('max_borrow_duration',)
        }),
        ('Status', {
            'fields': ('status', 'internal_note')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def active_loan_count(self, obj):
        return obj.lending_sessions.filter(status='ACTIVE').count()
    active_loan_count.short_description = 'Active Loans'
    
    def queue_count(self, obj):
        return obj.waiting_list.count()
    queue_count.short_description = 'Queue'


@admin.register(LendingSession)
class LendingSessionAdmin(admin.ModelAdmin):
    list_display = ['item', 'user', 'status', 'borrowed_at', 'due_at', 'returned_at', 'is_guest']
    list_filter = ['status', 'is_guest', 'borrowed_at', 'returned_at']
    search_fields = ['item__title', 'user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['borrowed_at']
    date_hierarchy = 'borrowed_at'
    ordering = ['-borrowed_at']
    
    fieldsets = (
        ('Session Information', {
            'fields': ('item', 'user', 'status', 'is_guest')
        }),
        ('Timestamps', {
            'fields': ('borrowed_at', 'due_at', 'returned_at')
        }),
    )


@admin.register(WaitingList)
class WaitingListAdmin(admin.ModelAdmin):
    list_display = ['item', 'user', 'queued_at', 'notified_at', 'is_notified']
    list_filter = ['queued_at', 'notified_at']
    search_fields = ['item__title', 'user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['queued_at']
    date_hierarchy = 'queued_at'
    ordering = ['queued_at']
    
    def is_notified(self, obj):
        return obj.notified_at is not None
    is_notified.boolean = True
    is_notified.short_description = 'Notified'
