# Generated manually to update foreign keys
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Step 3: Update foreign keys to point to Location instead of SwedishLocation.
    """

    dependencies = [
        ('seo', '0006_location_model'),
    ]

    operations = [
        # Update LocalLandingPage unique_together first (remove old constraint)
        migrations.AlterUniqueTogether(
            name='locallandingpage',
            unique_together=set(),
        ),
        
        # Update Keyword.detected_location to point to Location
        migrations.AlterField(
            model_name='keyword',
            name='detected_location',
            field=models.ForeignKey(
                blank=True,
                help_text='Auto-detected location from keyword text',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='detected_keywords',
                to='seo.location'
            ),
        ),
        
        # Update LocalLandingPage.location to point to Location
        migrations.AlterField(
            model_name='locallandingpage',
            name='location',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='landing_pages',
                to='seo.location'
            ),
        ),
        
        # Set new unique_together for LocalLandingPage
        migrations.AlterUniqueTogether(
            name='locallandingpage',
            unique_together={('location', 'page_type', 'target_audience', 'language')},
        ),
        
        # Add indexes for LocalLandingPage
        migrations.AddIndex(
            model_name='locallandingpage',
            index=models.Index(fields=['status', 'language'], name='seo_localla_status_e74d12_idx'),
        ),
        migrations.AddIndex(
            model_name='locallandingpage',
            index=models.Index(fields=['language', 'page_type'], name='seo_localla_languag_387fea_idx'),
        ),
    ]

