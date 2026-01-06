# Generated manually for multi-country location support
import django.db.models.deletion
from django.db import migrations, models


def copy_swedish_locations_to_location(apps, schema_editor):
    """Copy data from SwedishLocation to Location model."""
    SwedishLocation = apps.get_model('seo', 'SwedishLocation')
    Location = apps.get_model('seo', 'Location')
    
    for sl in SwedishLocation.objects.all():
        Location.objects.create(
            id=sl.id,  # Keep same ID to preserve foreign key references
            country='SE',
            name=sl.name,
            name_genitive=sl.name_genitive,
            slug=sl.slug,
            location_type=sl.location_type,
            official_code=sl.scb_code,  # Map scb_code to official_code
            latitude=sl.latitude,
            longitude=sl.longitude,
            population=sl.population,
            region=sl.region,
            region_code=sl.region_code,
            priority=sl.priority,
            linked_municipality_id=sl.linked_municipality_id if hasattr(sl, 'linked_municipality_id') else None,
        )


def reverse_copy(apps, schema_editor):
    """Reverse: copy Location back to SwedishLocation."""
    Location = apps.get_model('seo', 'Location')
    SwedishLocation = apps.get_model('seo', 'SwedishLocation')
    
    for loc in Location.objects.filter(country='SE'):
        SwedishLocation.objects.create(
            id=loc.id,
            name=loc.name,
            name_genitive=loc.name_genitive,
            slug=loc.slug,
            location_type=loc.location_type,
            scb_code=loc.official_code,
            latitude=loc.latitude,
            longitude=loc.longitude,
            population=loc.population,
            region=loc.region,
            region_code=loc.region_code,
            priority=loc.priority,
        )


class Migration(migrations.Migration):
    """
    Step 2: Create Location model and migrate data from SwedishLocation.
    """

    dependencies = [
        ('organization', '0011_trial_period'),
        ('seo', '0005_add_language_to_seo_models'),
    ]

    operations = [
        # Create the new Location model
        migrations.CreateModel(
            name='Location',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('country', models.CharField(choices=[('SE', 'Sweden'), ('DK', 'Denmark'), ('NO', 'Norway'), ('FI', 'Finland')], db_index=True, default='SE', help_text='Country for this location', max_length=2)),
                ('name', models.CharField(db_index=True, max_length=100)),
                ('name_genitive', models.CharField(blank=True, help_text="Genitive form, e.g., 'Stockholms' for 'Stockholm', 'Københavns' for 'København'", max_length=100)),
                ('slug', models.SlugField(max_length=100)),
                ('location_type', models.CharField(choices=[('MUNICIPALITY', 'Municipality/Kommune'), ('CITY', 'City/Town'), ('REGION', 'Region')], max_length=20)),
                ('official_code', models.CharField(blank=True, db_index=True, help_text='Official municipality code (SCB for Sweden, etc.)', max_length=20)),
                ('latitude', models.FloatField()),
                ('longitude', models.FloatField()),
                ('population', models.PositiveIntegerField(blank=True, help_text='Population count', null=True)),
                ('region', models.CharField(blank=True, help_text='Region/County name', max_length=100)),
                ('region_code', models.CharField(blank=True, help_text='Region code', max_length=10)),
                ('priority', models.PositiveIntegerField(default=0, help_text='Higher = more important for SEO (0-100)')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('linked_municipality', models.OneToOneField(blank=True, help_text="Link to our platform's municipality if active", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='seo_location', to='organization.municipality')),
            ],
            options={
                'verbose_name': 'Location',
                'verbose_name_plural': 'Locations',
                'ordering': ['-population', 'name'],
            },
        ),
        
        # Add indexes to Location
        migrations.AddIndex(
            model_name='location',
            index=models.Index(fields=['latitude', 'longitude'], name='seo_locatio_latitud_a698bc_idx'),
        ),
        migrations.AddIndex(
            model_name='location',
            index=models.Index(fields=['location_type', 'region'], name='seo_locatio_locatio_67b256_idx'),
        ),
        migrations.AddIndex(
            model_name='location',
            index=models.Index(fields=['country', 'location_type'], name='seo_locatio_country_4d883a_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='location',
            unique_together={('slug', 'country')},
        ),
        
        # Copy data from SwedishLocation to Location
        migrations.RunPython(copy_swedish_locations_to_location, reverse_copy),
    ]

