from django.contrib import admin
from .models import Questionnaire, Question, QuestionOption, QuestionnaireResponse, Answer

class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    extra = 1

class QuestionInline(admin.StackedInline):
    model = Question
    extra = 0
    show_change_link = True # Important for editing nested logic

@admin.register(Questionnaire)
class QuestionnaireAdmin(admin.ModelAdmin):
    list_display = ('title', 'admin_level', 'status', 'start_date', 'expiration_date', 'created_by')
    list_filter = ('admin_level', 'status', 'municipality', 'club')
    search_fields = ('title', 'description')
    filter_horizontal = ('rewards',)

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('text', 'questionnaire', 'question_type', 'order', 'parent_question')
    list_filter = ('questionnaire', 'question_type')
    inlines = [QuestionOptionInline]
    search_fields = ('text',)

@admin.register(QuestionnaireResponse)
class QuestionnaireResponseAdmin(admin.ModelAdmin):
    list_display = ('user', 'questionnaire', 'status', 'started_at', 'completed_at')
    list_filter = ('status', 'questionnaire')

@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ('response', 'question', 'get_answer_preview')
    
    def get_answer_preview(self, obj):
        if obj.text_answer: return obj.text_answer[:50]
        if obj.rating_answer: return f"{obj.rating_answer} Stars"
        return ", ".join([o.text for o in obj.selected_options.all()])
    get_answer_preview.short_description = "Answer"