# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0004_populate_slugs_for_existing_events'),
    ]

    operations = [
        migrations.AlterField(
            model_name='event',
            name='slug',
            field=models.SlugField(help_text='URL-friendly version of the title (auto-generated if not provided)', max_length=255, unique=True),
        ),
    ]

