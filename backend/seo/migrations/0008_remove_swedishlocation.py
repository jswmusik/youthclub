# Generated manually to remove old SwedishLocation model
from django.db import migrations


class Migration(migrations.Migration):
    """
    Step 4: Remove the old SwedishLocation model after data migration is complete.
    """

    dependencies = [
        ('seo', '0007_update_foreign_keys'),
    ]

    operations = [
        # First remove the linked_municipality field from SwedishLocation
        # (to avoid foreign key issues)
        migrations.RemoveField(
            model_name='swedishlocation',
            name='linked_municipality',
        ),
        
        # Now delete the old model
        migrations.DeleteModel(
            name='SwedishLocation',
        ),
    ]

