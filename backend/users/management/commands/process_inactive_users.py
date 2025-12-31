"""
Management command to process inactive users for data retention compliance.

This command can:
1. Show users pending deletion (dry-run)
2. Send warning notifications to users approaching deletion
3. Actually delete/anonymize inactive users (when auto-deletion is enabled)

Usage:
    # Dry run - see who would be affected
    python manage.py process_inactive_users --dry-run

    # Show detailed statistics
    python manage.py process_inactive_users --stats

    # Send warning emails (doesn't delete)
    python manage.py process_inactive_users --send-warnings

    # Process deletions (respects is_auto_deletion_enabled setting)
    python manage.py process_inactive_users --execute

    # Force deletion even if auto-deletion is disabled (DANGEROUS)
    python manage.py process_inactive_users --execute --force
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from users.services import InactiveUserService
from licensing.models import GlobalDataRetentionSettings


class Command(BaseCommand):
    help = 'Process inactive users for GDPR data retention compliance'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show users that would be affected without making changes'
        )
        parser.add_argument(
            '--stats',
            action='store_true',
            help='Show retention statistics'
        )
        parser.add_argument(
            '--send-warnings',
            action='store_true',
            help='Send warning notifications to users approaching deletion'
        )
        parser.add_argument(
            '--execute',
            action='store_true',
            help='Actually process deletions (respects global settings)'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force execution even if auto-deletion is disabled (DANGEROUS)'
        )
        parser.add_argument(
            '--municipality',
            type=str,
            help='Only process users from a specific municipality (by slug)'
        )
        parser.add_argument(
            '--test-user',
            type=int,
            help='Test with a specific user ID (simulate what would happen)'
        )

    def handle(self, *args, **options):
        settings = GlobalDataRetentionSettings.get_settings()
        
        self.stdout.write(self.style.HTTP_INFO(
            f"\n{'='*60}\n"
            f"DATA RETENTION PROCESSOR\n"
            f"{'='*60}\n"
            f"Global Settings:\n"
            f"  - Default retention: {settings.default_retention_months} months\n"
            f"  - Warning notification: {settings.warning_notification_days} days before\n"
            f"  - Final warning: {settings.second_warning_notification_days} days before\n"
            f"  - Auto-deletion enabled: {settings.is_auto_deletion_enabled}\n"
            f"{'='*60}\n"
        ))

        if options['stats']:
            self._show_statistics()
            return

        if options['dry_run']:
            self._dry_run(options.get('municipality'))
            return

        if options['send_warnings']:
            self._send_warnings(settings)
            return

        if options['execute']:
            self._execute_deletions(settings, options['force'], options.get('municipality'))
            return

        # Default: show help
        self.stdout.write(self.style.WARNING(
            "No action specified. Use one of:\n"
            "  --dry-run       Show who would be affected\n"
            "  --stats         Show retention statistics\n"
            "  --send-warnings Send warning emails\n"
            "  --execute       Process deletions\n"
        ))

    def _show_statistics(self):
        """Display retention statistics."""
        self.stdout.write(self.style.HTTP_INFO("Calculating statistics...\n"))
        
        stats = InactiveUserService.get_retention_statistics()
        
        self.stdout.write(
            f"\nRETENTION STATISTICS\n"
            f"{'─'*40}\n"
            f"Total deletable users: {stats['total_deletable_users']}\n"
            f"Active (last 30 days): {stats['active_last_30_days']}\n"
            f"Active (31-90 days):   {stats['active_last_90_days']}\n"
            f"Inactive (90+ days):   {stats['inactive_over_90_days']}\n"
            f"{'─'*40}\n"
            f"PENDING DELETION:      {stats['pending_deletion']}\n"
            f"{'─'*40}\n"
        )
        
        if stats['pending_deletion'] > 0:
            self.stdout.write(self.style.WARNING(
                f"\n⚠️  {stats['pending_deletion']} users are past their retention period.\n"
                f"   Run with --dry-run to see details, or --execute to process.\n"
            ))

    def _dry_run(self, municipality_slug=None):
        """Show users that would be deleted."""
        self.stdout.write(self.style.HTTP_INFO("Running in DRY-RUN mode...\n"))
        
        pending = InactiveUserService.get_users_pending_deletion()
        
        if municipality_slug:
            pending = [
                p for p in pending 
                if self._get_user_municipality_slug(p['user']) == municipality_slug
            ]
        
        if not pending:
            self.stdout.write(self.style.SUCCESS(
                "✅ No users pending deletion.\n"
            ))
            return
        
        self.stdout.write(self.style.WARNING(
            f"\n⚠️  {len(pending)} USERS PENDING DELETION:\n"
            f"{'─'*80}\n"
        ))
        
        for item in pending:
            user = item['user']
            self.stdout.write(
                f"  ID: {user.id:>5} | {user.email:<35} | "
                f"Role: {user.get_role_display():<20}\n"
                f"         Last active: {item['last_activity'].strftime('%Y-%m-%d'):<12} | "
                f"Days inactive: {item['days_inactive']:<4} | "
                f"Retention: {item['retention_months']} months\n"
                f"{'─'*80}\n"
            )
        
        self.stdout.write(self.style.HTTP_INFO(
            f"\nTo delete these users, run with --execute\n"
        ))

    def _send_warnings(self, settings):
        """Send warning notifications to users approaching deletion."""
        self.stdout.write(self.style.HTTP_INFO("Processing warning notifications...\n"))
        
        first_sent = 0
        first_failed = 0
        final_sent = 0
        final_failed = 0
        
        # First warnings
        first_warnings = InactiveUserService.get_users_needing_warning(
            settings.warning_notification_days
        )
        
        for item in first_warnings:
            user = item['user']
            self.stdout.write(
                f"  📧 First warning: {user.email} "
                f"(deletion in {item['days_until_deletion']} days)... "
            )
            
            success = InactiveUserService.send_deletion_warning(
                user=user,
                days_until_deletion=item['days_until_deletion'],
                deletion_date=item['deletion_date'],
                is_final=False
            )
            
            if success:
                first_sent += 1
                self.stdout.write(self.style.SUCCESS("✓ Sent\n"))
            else:
                first_failed += 1
                self.stdout.write(self.style.ERROR("✗ Failed\n"))
        
        # Final warnings
        final_warnings = InactiveUserService.get_users_needing_final_warning(
            settings.second_warning_notification_days
        )
        
        for item in final_warnings:
            user = item['user']
            self.stdout.write(
                f"  🚨 Final warning: {user.email} "
                f"(deletion in {item['days_until_deletion']} days)... "
            )
            
            success = InactiveUserService.send_deletion_warning(
                user=user,
                days_until_deletion=item['days_until_deletion'],
                deletion_date=item['deletion_date'],
                is_final=True
            )
            
            if success:
                final_sent += 1
                self.stdout.write(self.style.SUCCESS("✓ Sent\n"))
            else:
                final_failed += 1
                self.stdout.write(self.style.ERROR("✗ Failed\n"))
        
        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Email Summary:\n"
            f"   First warnings: {first_sent} sent, {first_failed} failed\n"
            f"   Final warnings: {final_sent} sent, {final_failed} failed\n"
        ))

    def _execute_deletions(self, settings, force=False, municipality_slug=None):
        """Execute user deletions."""
        if not settings.is_auto_deletion_enabled and not force:
            self.stdout.write(self.style.ERROR(
                "❌ Auto-deletion is DISABLED in global settings.\n"
                "   Enable it in the admin panel, or use --force to override.\n"
            ))
            return
        
        if force and not settings.is_auto_deletion_enabled:
            self.stdout.write(self.style.WARNING(
                "⚠️  FORCE mode: Proceeding despite auto-deletion being disabled.\n"
            ))
        
        pending = InactiveUserService.get_users_pending_deletion()
        
        if municipality_slug:
            pending = [
                p for p in pending 
                if self._get_user_municipality_slug(p['user']) == municipality_slug
            ]
        
        if not pending:
            self.stdout.write(self.style.SUCCESS(
                "✅ No users to delete.\n"
            ))
            return
        
        self.stdout.write(self.style.WARNING(
            f"\n⚠️  DELETING {len(pending)} USERS...\n"
            f"{'─'*60}\n"
        ))
        
        deleted_count = 0
        error_count = 0
        
        for item in pending:
            user = item['user']
            original_email = user.email  # Save before anonymization
            try:
                result = InactiveUserService.anonymize_user(
                    user, 
                    reason=f"Inactive for {item['days_inactive']} days (retention: {item['retention_months']} months)"
                )
                deleted_count += 1
                self.stdout.write(self.style.SUCCESS(
                    f"  ✅ Deleted: {result['original_email']} (ID: {result['user_id']})\n"
                ))
                
                # Send confirmation email to the original email address
                InactiveUserService.send_account_deleted_notification(original_email)
                
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(
                    f"  ❌ Error deleting {user.email}: {str(e)}\n"
                ))
        
        self.stdout.write(
            f"\n{'='*60}\n"
            f"SUMMARY\n"
            f"{'='*60}\n"
            f"Successfully deleted: {deleted_count}\n"
            f"Errors: {error_count}\n"
            f"{'='*60}\n"
        )

    def _get_user_municipality_slug(self, user):
        """Get the municipality slug for a user."""
        if user.preferred_club and user.preferred_club.municipality:
            return user.preferred_club.municipality.slug
        if user.assigned_municipality:
            return user.assigned_municipality.slug
        if user.assigned_club and user.assigned_club.municipality:
            return user.assigned_club.municipality.slug
        return None

