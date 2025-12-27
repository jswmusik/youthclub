from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import HasLicenseFeature


class HealthCheckView(APIView):
    """
    A simple endpoint to check if the backend is running 
    and accessible by the frontend.
    """
    def get(self, request):
        return Response({
            "status": "success",
            "message": "Hello from Django! The Youth App Backend is operational."
        })


class APIAccessView(APIView):
    """
    Base view for API access - requires the 'api' license feature.
    Customers must pay for API access to use external integrations.
    """
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """
        Apply license-based permissions for the API access feature.
        """
        permission_classes = [IsAuthenticated]
        permission_classes.append(HasLicenseFeature('api')())
        return [permission() for permission in permission_classes]