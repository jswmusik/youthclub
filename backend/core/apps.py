from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        """
        Called when Django starts up. 
        We use this to connect our image optimization signals.
        """
        # Import here to avoid circular imports
        from core.image_signals import connect_image_optimization_signals
        
        # Connect signals for automatic image optimization
        connect_image_optimization_signals()
















