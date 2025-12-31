from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """
    Custom pagination class that allows clients to override page_size via query parameter.
    
    Usage:
        GET /api/events/?page_size=100  # Get 100 items per page
        GET /api/events/?page_size=1000  # Get 1000 items per page
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 1000

