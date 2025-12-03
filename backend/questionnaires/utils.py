from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from django.http import HttpResponse
import io


def generate_response_pdf(response):
    """
    Generates a PDF for a single user response.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    elements.append(Paragraph(f"Survey Result: {response.questionnaire.title}", styles['Title']))
    elements.append(Spacer(1, 12))
    
    # Meta Info
    meta_style = styles['Normal']
    user_name = "Anonymous" if response.questionnaire.is_anonymous else f"{response.user.first_name} {response.user.last_name}"
    elements.append(Paragraph(f"<b>User:</b> {user_name}", meta_style))
    elements.append(Paragraph(f"<b>Date:</b> {response.completed_at.strftime('%Y-%m-%d %H:%M') if response.completed_at else 'Incomplete'}", meta_style))
    elements.append(Spacer(1, 24))

    # Answers Table
    data = [['Question', 'Answer']]
    
    for answer in response.answers.all():
        q_text = Paragraph(answer.question.text, styles['Normal'])
        
        # Format Answer
        a_text = ""
        if answer.question.question_type == 'FREE_TEXT':
            a_text = answer.text_answer
        elif answer.question.question_type == 'RATING':
            a_text = f"{answer.rating_answer} / 5"
        elif answer.question.question_type in ['SINGLE_CHOICE', 'MULTI_CHOICE']:
            options = [o.text for o in answer.selected_options.all()]
            a_text = ", ".join(options)
            
        # Wrap answer in Paragraph to handle long text
        a_paragraph = Paragraph(str(a_text), styles['Normal'])
        data.append([q_text, a_paragraph])

    # Table Styling
    table = Table(data, colWidths=[250, 200])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    buffer.seek(0)
    return buffer

