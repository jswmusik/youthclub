from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/cms/', include('cms.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/emails/', include('emails.urls')),
    path('api/seo/', include('seo.urls')),
    path('api/audit/', include('audit.urls')),  # GDPR audit logging
    path('api/gdpr/', include('gdpr.urls')),  # GDPR data export
]

# This logic is what serves the image files during development
# It connects the URL '/media/' to your actual 'media' folder
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)