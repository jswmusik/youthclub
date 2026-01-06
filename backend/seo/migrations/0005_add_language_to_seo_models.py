# Generated manually for language support
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Step 1: Add language fields to existing models (Keyword, LocalLandingPage, SEOArticle).
    This doesn't touch SwedishLocation yet.
    """

    dependencies = [
        ('seo', '0004_make_article_fields_optional'),
    ]

    operations = [
        # Add language to Keyword
        migrations.AddField(
            model_name='keyword',
            name='language',
            field=models.CharField(
                choices=[('sv', 'Svenska'), ('en', 'English'), ('da', 'Dansk'), ('nb', 'Norsk'), ('fi', 'Suomi'), ('ar', 'العربية'), ('so', 'Soomaali'), ('prs', 'دری')],
                db_index=True,
                default='sv',
                help_text='Language/market for this keyword',
                max_length=10
            ),
        ),
        
        # Add language to LocalLandingPage
        migrations.AddField(
            model_name='locallandingpage',
            name='language',
            field=models.CharField(
                choices=[('sv', 'Svenska'), ('en', 'English'), ('da', 'Dansk'), ('nb', 'Norsk'), ('fi', 'Suomi'), ('ar', 'العربية'), ('so', 'Soomaali'), ('prs', 'دری')],
                db_index=True,
                default='sv',
                help_text='Language for this landing page',
                max_length=10
            ),
        ),
        
        # Add language to SEOArticle
        migrations.AddField(
            model_name='seoarticle',
            name='language',
            field=models.CharField(
                choices=[('sv', 'Svenska'), ('en', 'English'), ('da', 'Dansk'), ('nb', 'Norsk'), ('fi', 'Suomi'), ('ar', 'العربية'), ('so', 'Soomaali'), ('prs', 'دری')],
                db_index=True,
                default='sv',
                help_text='Language for this article',
                max_length=10
            ),
        ),
        
        # Add indexes for SEOArticle
        migrations.AddIndex(
            model_name='seoarticle',
            index=models.Index(fields=['language', 'status'], name='seo_seoarti_languag_727bc4_idx'),
        ),
        
        # Modify Keyword fields
        migrations.AlterField(
            model_name='keyword',
            name='keyword',
            field=models.CharField(db_index=True, max_length=255),
        ),
        migrations.AlterField(
            model_name='keyword',
            name='slug',
            field=models.SlugField(blank=True, max_length=255),
        ),
        
        # Update unique_together for Keyword (now unique per language)
        migrations.AlterUniqueTogether(
            name='keyword',
            unique_together={('keyword', 'language')},
        ),
    ]

