# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('groups', '0002_group_background_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='groupmembership',
            name='rejection_count',
            field=models.IntegerField(default=0),
        ),
    ]

