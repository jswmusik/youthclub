from django.contrib import admin
from .models import NewsTag, NewsArticle

@admin.register(NewsTag)
class NewsTagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(NewsArticle)
class NewsArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'is_hero', 'is_published', 'published_at')
    list_filter = ('is_hero', 'is_published', 'tags')
    search_fields = ('title', 'excerpt')
    filter_horizontal = ('tags',)