from django.contrib import admin
from .models import Group, GroupMembership

class MembershipInline(admin.TabularInline):
    model = GroupMembership
    extra = 0
    raw_id_fields = ('user',) # Useful if you have thousands of users

@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'group_type', 'target_member_type', 'is_system_group', 'municipality', 'club')
    list_filter = ('group_type', 'is_system_group', 'municipality', 'club')
    search_fields = ('name', 'description')
    filter_horizontal = ('interests',) # Makes selecting many interests easier
    inlines = [MembershipInline] # Allows editing members directly inside the Group page

@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'group', 'status', 'role', 'joined_at')
    list_filter = ('status', 'role', 'group')
    search_fields = ('user__email', 'user__first_name', 'group__name')