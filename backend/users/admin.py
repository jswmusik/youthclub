from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User,
    YouthMember,
    Guardian,
    ClubAdmin,
    MunicipalityAdmin,
    GuardianYouthLink,
    UserLoginHistory,
)

# --- INLINES ---

class GuardianLinkInline(admin.TabularInline):
    model = GuardianYouthLink
    fk_name = 'guardian' 
    extra = 0
    verbose_name = "Linked Youth"
    verbose_name_plural = "Linked Youth Members"
    raw_id_fields = ['youth']

class YouthLinkInline(admin.TabularInline):
    model = GuardianYouthLink
    fk_name = 'youth'
    extra = 0
    verbose_name = "Linked Guardian"
    verbose_name_plural = "Linked Guardians"
    raw_id_fields = ['guardian']

# --- BASE ADMIN SETUP ---

class BaseRoleAdmin(UserAdmin):
    ordering = ['email']
    list_display = ('email', 'first_name', 'last_name', 'role')
    search_fields = ('email', 'first_name', 'last_name')
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )

# --- SPECIFIC ADMINS ---

@admin.register(YouthMember)
class YouthMemberAdmin(BaseRoleAdmin):
    list_display = ('email', 'first_name', 'last_name', 'get_age_display', 'grade', 'preferred_club')
    search_fields = ('email', 'first_name', 'last_name', 'nickname')
    
    fieldsets = (
        ('Account', {'fields': ('email', 'password', 'role', 'is_active')}),
        ('Profile', {
            'fields': (
                'first_name', 'last_name', 'nickname', 
                'phone_number', 'avatar', 'preferred_language'
            )
        }),
        ('Demographics', {
            'fields': ('date_of_birth', 'get_age_display', 'legal_gender', 'preferred_gender')
        }),
        ('Youth Specifics', {'fields': ('grade', 'preferred_club', 'interests')}),
    )
    
    readonly_fields = ('get_age_display',)
    inlines = [YouthLinkInline]

    def get_age_display(self, obj):
        return obj.age
    get_age_display.short_description = "Age"

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role=User.Role.YOUTH_MEMBER)

    def save_model(self, request, obj, form, change):
        obj.role = User.Role.YOUTH_MEMBER
        super().save_model(request, obj, form, change)


@admin.register(Guardian)
class GuardianAdmin(BaseRoleAdmin):
    list_display = ('email', 'first_name', 'last_name', 'phone_number')
    search_fields = ('email', 'first_name', 'last_name', 'phone_number')
    
    fieldsets = (
        ('Account', {'fields': ('email', 'password', 'role', 'is_active')}),
        ('Profile', {
            'fields': (
                'first_name', 'last_name', 'phone_number', 
                'legal_gender', 'avatar'
            )
        }),
    )
    
    inlines = [GuardianLinkInline]

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role=User.Role.GUARDIAN)

    def save_model(self, request, obj, form, change):
        obj.role = User.Role.GUARDIAN
        super().save_model(request, obj, form, change)


@admin.register(ClubAdmin)
class ClubAdminAdmin(BaseRoleAdmin):
    list_display = ('email', 'first_name', 'last_name', 'assigned_club')
    
    fieldsets = (
        ('Account', {'fields': ('email', 'password', 'role', 'is_active')}),
        ('Profile', {
            'fields': (
                'first_name', 'last_name', 'nickname', 
                'phone_number', 'legal_gender', 'avatar'
            )
        }),
        ('Professional Info', {
            'fields': ('profession', 'hide_contact_info', 'assigned_club')
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role=User.Role.CLUB_ADMIN)

    def save_model(self, request, obj, form, change):
        obj.role = User.Role.CLUB_ADMIN
        super().save_model(request, obj, form, change)


@admin.register(MunicipalityAdmin)
class MunicipalityAdminAdmin(BaseRoleAdmin):
    list_display = ('email', 'first_name', 'last_name', 'assigned_municipality')
    
    fieldsets = (
        ('Account', {'fields': ('email', 'password', 'role', 'is_active')}),
        ('Profile', {'fields': ('first_name', 'last_name', 'phone_number')}),
        ('Assignment', {'fields': ('assigned_municipality',)}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).filter(role=User.Role.MUNICIPALITY_ADMIN)

    def save_model(self, request, obj, form, change):
        obj.role = User.Role.MUNICIPALITY_ADMIN
        super().save_model(request, obj, form, change)

# Main User Admin (Super Admin View)
@admin.register(User)
class MainUserAdmin(UserAdmin):
    ordering = ['email']
    list_display = ('email', 'role', 'is_superuser')
    list_filter = ('role',)
    search_fields = ('email', 'first_name', 'last_name')
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'nickname', 'phone_number')}),
        ('Permissions', {'fields': ('role', 'is_superuser', 'is_staff', 'is_active')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role'),
        }),
    )


@admin.register(UserLoginHistory)
class UserLoginHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'timestamp', 'ip_address')
    list_filter = ('user',)
    search_fields = ('user__email', 'ip_address', 'user_agent')