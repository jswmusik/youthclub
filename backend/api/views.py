from rest_framework.views import APIView
from rest_framework.response import Response

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