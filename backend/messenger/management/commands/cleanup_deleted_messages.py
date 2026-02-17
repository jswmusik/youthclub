# backend/messenger/management/commands/cleanup_deleted_messages.py
"""
Management command to clean up soft-deleted messages older than 90 days.

This command should be run periodically (e.g., daily via cron or APScheduler)
to permanently remove soft-deleted messages and conversation statuses that
are older than the retention period.

Usage:
    python manage.py cleanup_deleted_messages
    python manage.py cleanup_deleted_messages --days=60  # Custom retention period
    python manage.py cleanup_deleted_messages --dry-run  # Preview what would be deleted
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from messenger.models import MessageRecipient, ConversationUserStatus, Message, Conversation


class Command(BaseCommand):
    help = 'Clean up soft-deleted messages and conversation statuses older than 90 days'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Number of days after which to delete soft-deleted records (default: 90)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        cutoff = timezone.now() - timedelta(days=days)

        self.stdout.write(
            self.style.NOTICE(f"{'[DRY RUN] ' if dry_run else ''}Cleaning up records deleted before {cutoff.date()}")
        )

        # 1. Clean up soft-deleted MessageRecipient records
        deleted_recipients = MessageRecipient.objects.filter(
            is_deleted=True,
            deleted_at__lt=cutoff
        )
        recipient_count = deleted_recipients.count()
        
        if not dry_run and recipient_count > 0:
            deleted_recipients.delete()
        
        self.stdout.write(
            f"  - MessageRecipient records: {recipient_count} {'would be ' if dry_run else ''}deleted"
        )

        # 2. Clean up soft-deleted ConversationUserStatus records
        deleted_statuses = ConversationUserStatus.objects.filter(
            is_deleted=True,
            deleted_at__lt=cutoff
        )
        status_count = deleted_statuses.count()
        
        if not dry_run and status_count > 0:
            deleted_statuses.delete()
        
        self.stdout.write(
            f"  - ConversationUserStatus records: {status_count} {'would be ' if dry_run else ''}deleted"
        )

        # 3. Clean up orphaned Messages (no recipients left)
        # This finds messages where ALL recipients have been deleted
        orphaned_messages = Message.objects.filter(
            recipient_statuses__isnull=True
        )
        orphan_count = orphaned_messages.count()
        
        if not dry_run and orphan_count > 0:
            orphaned_messages.delete()
        
        self.stdout.write(
            f"  - Orphaned Message records: {orphan_count} {'would be ' if dry_run else ''}deleted"
        )

        # 4. Clean up orphaned Conversations (no messages left)
        # Only clean up DM conversations that have no messages
        orphaned_conversations = Conversation.objects.filter(
            type='DM',
            messages__isnull=True
        )
        conv_count = orphaned_conversations.count()
        
        if not dry_run and conv_count > 0:
            orphaned_conversations.delete()
        
        self.stdout.write(
            f"  - Orphaned Conversation records: {conv_count} {'would be ' if dry_run else ''}deleted"
        )

        # Summary
        total = recipient_count + status_count + orphan_count + conv_count
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f"\n[DRY RUN] Total: {total} records would be deleted")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"\nCleanup complete! {total} records deleted.")
            )


def cleanup():
    """
    Function to be called by APScheduler.
    Runs the cleanup with default settings.
    """
    from django.core.management import call_command
    call_command('cleanup_deleted_messages')








