from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from datetime import date
from .models import (
    User,
    YouthMember,
    Guardian,
    ClubAdmin,
    MunicipalityAdmin,
    GuardianYouthLink,
    UserLoginHistory,
)
# Import the Reward models
from rewards.models import Reward, RewardUsage

# --- INLINES ---

class RewardUsageInline(admin.TabularInline):
    model = RewardUsage
    extra = 0
    readonly_fields = ('reward', 'used_at')
    can_delete = False
    verbose_name = "Claimed Reward"
    verbose_name_plural = "Reward History"

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
        ('Rewards', {'fields': ('view_eligible_rewards',)}), # <--- Added this section
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )
    
    # Add the inline table for history
    inlines = [GuardianLinkInline, RewardUsageInline] 
    
    # Allow us to display the calculated field
    readonly_fields = ('view_eligible_rewards',)

    def view_eligible_rewards(self, user):
        """
        Calculates which rewards this specific user matches based on rules.
        """
        # 1. Fetch all active rewards
        all_rewards = Reward.objects.filter(is_active=True)
        eligible_list = []

        # 2. Calculate User Age
        user_age = user.age if user.date_of_birth else None

        for r in all_rewards:
            # --- CHECK 1: SCOPE (Who owns the reward?) ---
            # If Super Admin: Everyone sees it
            # If Muni Admin: User must be in that Muni
            # If Club Admin: User must be in that Club
            if r.owner_role == 'MUNICIPALITY_ADMIN':
                if user.assigned_municipality != r.municipality and \
                   (not user.preferred_club or user.preferred_club.municipality != r.municipality):
                    continue
            
            if r.owner_role == 'CLUB_ADMIN':
                if user.preferred_club != r.club and user.assigned_club != r.club:
                    continue

            # --- CHECK 2: MEMBER TYPE ---
            if r.target_member_type != user.role:
                continue

            # --- CHECK 3: DEMOGRAPHICS ---
            # Gender
            if r.target_genders and user.legal_gender not in r.target_genders:
                continue
            
            # Grade
            if r.target_grades and user.grade not in r.target_grades:
                continue

            # Age
            if user_age is not None:
                if r.min_age and user_age < r.min_age: continue
                if r.max_age and user_age > r.max_age: continue

            # --- CHECK 4: USAGE LIMITS ---
            # Count how many times THIS user has claimed THIS reward
            claim_count = RewardUsage.objects.filter(user=user, reward=r).count()
            limit_str = f"{claim_count} / {r.usage_limit}" if r.usage_limit else f"{claim_count} / ∞"
            
            # Styling: Red if maxed out, Green if available
            color = "green"
            if r.usage_limit and claim_count >= r.usage_limit:
                color = "red"
                limit_str += " (Max Reached)"

            eligible_list.append(
                f"<li style='color:{color};'><b>{r.name}</b> — Used: {limit_str}</li>"
            )

        if not eligible_list:
            return "No rewards currently available for this user."

        return format_html("<ul>" + "".join(eligible_list) + "</ul>")

    view_eligible_rewards.short_description = "Eligible / Active Rewards"

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
        ('Rewards', {'fields': ('view_eligible_rewards',)}),
    )
    
    readonly_fields = ('get_age_display', 'view_eligible_rewards',)
    # We merge the base inlines (RewardHistory) with the Youth link
    inlines = [YouthLinkInline, RewardUsageInline]

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
        ('Rewards', {'fields': ('view_eligible_rewards',)}),
    )
    
    readonly_fields = ('view_eligible_rewards',)
    inlines = [GuardianLinkInline, RewardUsageInline]

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