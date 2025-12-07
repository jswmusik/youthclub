from django.contrib import admin
from .models import Conversation, Message, MessageRecipient, MessageTemplate

class MessageInline(admin.TabularInline):
    model = Message
    extra = 0

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'type', 'subject', 'created_at')
    list_filter = ('type',)
    inlines = [MessageInline]

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'conversation', 'created_at')

@admin.register(MessageRecipient)
class MessageRecipientAdmin(admin.ModelAdmin):
    list_display = ('message', 'recipient', 'is_read', 'is_deleted')
    list_filter = ('is_read', 'is_deleted')

admin.site.register(MessageTemplate)