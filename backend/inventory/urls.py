from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ItemViewSet, 
    LendingSessionViewSet, 
    ItemCategoryViewSet, 
    InventoryTagViewSet
)

router = DefaultRouter()
router.register(r'items', ItemViewSet, basename='inventory-items')
router.register(r'history', LendingSessionViewSet, basename='inventory-history')
router.register(r'categories', ItemCategoryViewSet)
router.register(r'tags', InventoryTagViewSet, basename='inventory-tags')

urlpatterns = [
    path('', include(router.urls)),
]