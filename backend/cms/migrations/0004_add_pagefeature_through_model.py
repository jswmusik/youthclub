# Generated manually to handle M2M through model migration
import django.db.models.deletion
from django.db import migrations, models


def migrate_existing_features(apps, schema_editor):
    """Copy existing M2M relationships to the new through model."""
    Page = apps.get_model('cms', 'Page')
    PageFeature = apps.get_model('cms', 'PageFeature')
    
    for page in Page.objects.all():
        # Get existing features through the old M2M table
        for order, feature in enumerate(page.features.all()):
            PageFeature.objects.create(
                page=page,
                feature=feature,
                order=order
            )


def reverse_migrate_features(apps, schema_editor):
    """Reverse migration - data will be preserved in old M2M table."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0003_alter_featureshowcase_alt_text_and_more'),
    ]

    operations = [
        # Step 1: Create the through model
        migrations.CreateModel(
            name='PageFeature',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order', models.PositiveIntegerField(default=0)),
                ('feature', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='cms.featureshowcase')),
                ('page', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='cms.page')),
            ],
            options={
                'ordering': ['order'],
                'unique_together': {('page', 'feature')},
            },
        ),
        # Step 2: Migrate existing data
        migrations.RunPython(migrate_existing_features, reverse_migrate_features),
        # Step 3: Remove the old M2M field
        migrations.RemoveField(
            model_name='page',
            name='features',
        ),
        # Step 4: Add the new M2M field with through model
        migrations.AddField(
            model_name='page',
            name='features',
            field=models.ManyToManyField(
                blank=True,
                help_text='Select features to display on creative pages',
                related_name='pages',
                through='cms.PageFeature',
                to='cms.featureshowcase'
            ),
        ),
    ]

