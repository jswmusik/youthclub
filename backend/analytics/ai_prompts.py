"""
AI Prompt Templates for Analytics Report Generation

Contains system prompts and user prompt builders for different report types.
"""

from typing import Dict, Any, Optional
from datetime import datetime


# =============================================================================
# SYSTEM PROMPTS
# =============================================================================

SYSTEM_PROMPTS = {
    'en': {
        'base': """You are a professional youth club analytics consultant. Your role is to analyze data from youth clubs and municipalities, providing clear, actionable insights with a balanced and realistic tone.

Your reports should be:
- **Balanced** - Acknowledge both successes and areas needing attention
- **Data-driven** - Always reference specific numbers to back up your insights
- **Actionable** - Provide concrete, practical recommendations
- **Well-structured** - Use clear headings and bullet points for easy reading
- **Concise** - Get to the point without unnecessary fluff

Your tone should be:
- Professional and helpful
- Optimistic but realistic - don't sugarcoat issues
- Solution-oriented - pair challenges with practical suggestions
- Balanced - acknowledge wins without being over-the-top

When analyzing data:
- Lead with key findings (good or bad)
- Cover the main metric categories provided
- Be honest about concerning numbers while offering solutions
- Provide specific, numbered recommendations (3-5 for summaries, 5-7 for detailed reports)
- Keep it practical and actionable

Use markdown formatting:
- ## for main section headings
- **bold** for key metrics
- Bullet points for lists
- Numbered lists for recommendations""",

        'summary': """You are writing a concise executive summary of youth club analytics.

Structure (keep it brief):
1. **Key Highlights** - What stands out? (2-3 bullet points)
2. **Areas of Concern** - What needs attention? (if any)
3. **Quick Stats** - Key numbers at a glance
4. **Recommendations** - 3-5 actionable suggestions

Keep it to 250-400 words. Be direct and useful.""",
        
        'monthly': """You are writing a monthly analytics report for a youth club or municipality.

Structure your report:

## Summary
Brief overview of the month (1 paragraph)

## Traffic & Engagement
Key visit metrics and what they mean

## Demographics
Member breakdown and any notable patterns

## Inventory & Events
Activity highlights and performance

## Recommendations
5-7 specific, actionable suggestions

## Looking Ahead
Brief note on focus areas

Aim for 600-900 words. Be thorough but concise.""",
        
        'trend': """You are analyzing trends and patterns in the data.

Structure:

## Overview
What's the big picture?

## Positive Trends
What's improving?

## Areas to Watch
What needs attention?

## Recommendations
5-7 trend-based actions

Aim for 500-700 words. Focus on actionable insights."""
    },
    
    'sv': {
        'base': """Du är en professionell ungdomsverksamhetsanalytiker. Din roll är att analysera data från ungdomsgårdar och kommuner och ge tydliga, handlingsbara insikter med en balanserad och realistisk ton.

Dina rapporter ska vara:
- **Balanserade** - Erkänn både framgångar och förbättringsområden
- **Datadrivna** - Referera alltid till specifika siffror
- **Handlingsbara** - Ge konkreta, praktiska rekommendationer
- **Välstrukturerade** - Använd tydliga rubriker och punktlistor
- **Koncisa** - Gå rakt på sak

Använd markdown-formatering (## rubriker, **fetstil**, punktlistor).""",

        'summary': """Du skriver en kortfattad sammanfattning. Struktur: Höjdpunkter, Områden att förbättra, Nyckeltal, Rekommendationer (3-5 st). Sikta på 250-400 ord.""",
        
        'monthly': """Du skriver en månadsrapport. Täck trafik, demografi, inventarie, events och rekommendationer. Sikta på 600-900 ord.""",
        
        'trend': """Du analyserar trender och mönster. Fokusera på vad som förbättras, vad som behöver uppmärksamhet, och ge 5-7 rekommendationer. Sikta på 500-700 ord."""
    },
    
    'no': {
        'base': """Du er en profesjonell ungdomsklubbanalytiker. Din rolle er å analysere data fra ungdomsklubber og kommuner og gi klare, handlingsbare innsikter med en balansert og realistisk tone.

Rapportene dine skal være:
- **Balanserte** - Anerkjenn både suksesser og forbedringsområder
- **Datadrevne** - Referer alltid til spesifikke tall
- **Handlingsbare** - Gi konkrete, praktiske anbefalinger
- **Velstrukturerte** - Bruk klare overskrifter og punktlister
- **Konsise** - Gå rett på sak

Bruk markdown-formatering (## overskrifter, **fet skrift**, punktlister).""",

        'summary': """Du skriver et kortfattet sammendrag. Struktur: Høydepunkter, Områder å forbedre, Nøkkeltall, Anbefalinger (3-5 stk). Sikt på 250-400 ord.""",
        
        'monthly': """Du skriver en månedsrapport. Dekk trafikk, demografi, inventar, events og anbefalinger. Sikt på 600-900 ord.""",
        
        'trend': """Du analyserer trender og mønstre. Fokuser på hva som forbedres, hva som trenger oppmerksomhet, og gi 5-7 anbefalinger. Sikt på 500-700 ord."""
    }
}


def build_system_prompt(report_type: str = 'summary', language: str = 'en') -> str:
    """
    Build the system prompt for the AI based on report type and language.
    """
    lang_prompts = SYSTEM_PROMPTS.get(language, SYSTEM_PROMPTS['en'])
    
    base_prompt = lang_prompts.get('base', SYSTEM_PROMPTS['en']['base'])
    type_prompt = lang_prompts.get(report_type, lang_prompts.get('summary'))
    
    return f"{base_prompt}\n\n{type_prompt}"


# =============================================================================
# DATA FORMATTERS
# =============================================================================

def format_traffic_data(traffic: Dict, total_members: int = 0) -> str:
    """Format traffic metrics for the AI."""
    if not traffic:
        return "No traffic data available."
    
    return f"""## Members & Traffic
- **Total Members:** {total_members} (based on current filters)
- **Total Visits:** {traffic.get('total_visits', 0)}
- **Unique Visitors:** {traffic.get('unique_visitors', 0)}
- **Retention Rate:** {traffic.get('retention_rate', 0)}%
- **Avg Visit Duration:** {traffic.get('avg_duration_minutes', 0)} minutes
- **Visits per Member:** {traffic.get('visits_per_member', 0)}"""


def format_demographics_data(demographics: Dict) -> str:
    """Format demographic data for the AI."""
    if not demographics:
        return "No demographic data available."
    
    lines = ["## Demographics"]
    
    # Gender split
    gender_split = demographics.get('gender_split', [])
    if gender_split:
        lines.append("\n### Gender")
        total = sum(g.get('count', 0) for g in gender_split)
        for g in gender_split:
            gender_label = g.get('legal_gender') or 'Unspecified'
            count = g.get('count', 0)
            pct = round((count / total * 100), 1) if total > 0 else 0
            if gender_label == 'MALE':
                gender_label = 'Male'
            elif gender_label == 'FEMALE':
                gender_label = 'Female'
            else:
                gender_label = 'Other'
            lines.append(f"- {gender_label}: {count} ({pct}%)")
    
    # Grade distribution
    grade_dist = demographics.get('grade_distribution', [])
    if grade_dist:
        lines.append("\n### Grade Distribution")
        for g in grade_dist:
            lines.append(f"- Grade {g.get('grade')}: {g.get('count', 0)}")
    
    return "\n".join(lines)


def format_inventory_data(inventory: Dict) -> str:
    """Format inventory metrics for the AI."""
    if not inventory:
        return "No inventory data available."
    
    lines = [f"""## Inventory & Loans
- **Total Loans:** {inventory.get('total_loans', 0)}
- **Unique Borrowers:** {inventory.get('unique_borrowers', 0)}
- **Unused Items:** {inventory.get('dust_collectors', 0)}"""]
    
    # Top items
    top_items = inventory.get('top_items', [])
    if top_items:
        lines.append("\n### Top Borrowed Items")
        for i, item in enumerate(top_items[:5], 1):
            item_name = item.get('item__title', 'Unknown')
            count = item.get('count', 0)
            lines.append(f"{i}. {item_name} - {count} loans")
    
    return "\n".join(lines)


def format_events_data(events: Dict) -> str:
    """Format event metrics for the AI."""
    if not events:
        return "No event data available."
    
    lines = [f"""## Events
- **Total Events:** {events.get('total_events', 0)}
- **Total Registrations:** {events.get('total_registrations', 0)}
- **Show-up Rate:** {events.get('show_up_rate', 0)}%
- **Capacity Utilization:** {events.get('avg_capacity_utilization', 0)}%"""]
    
    # Top events
    top_events = events.get('top_events', [])
    if top_events:
        lines.append("\n### Top Events")
        for i, event in enumerate(top_events[:5], 1):
            title = event.get('title', 'Unknown')
            reg_count = event.get('registration_count', 0)
            lines.append(f"{i}. {title} - {reg_count} registrations")
    
    return "\n".join(lines)


def format_network_data(network: Dict) -> str:
    """Format network/nomad metrics for the AI."""
    if not network:
        return ""
    
    return f"""## Network Activity
- **Cross-Club Visitors:** {network.get('nomad_percentage', 0)}% of members visit multiple clubs
- **Nomad Count:** {network.get('nomad_count', 0)} members"""


def format_club_comparison(comparison: list) -> str:
    """Format club comparison data for the AI."""
    if not comparison:
        return ""
    
    lines = ["## Club Comparison (by traffic)"]
    
    for i, club in enumerate(comparison[:10], 1):
        club_name = club.get('club_name', 'Unknown')
        visits = club.get('visits', 0)
        unique = club.get('unique_users', 0)
        new_members = club.get('new_members', 0)
        lines.append(f"{i}. **{club_name}**: {visits} visits, {unique} unique, +{new_members} new")
    
    return "\n".join(lines)


def format_group_comparison(group_comparison: list) -> str:
    """Format group comparison data for the AI."""
    if not group_comparison:
        return ""
    
    lines = ["## Group Comparison (by members)"]
    
    for i, group in enumerate(group_comparison[:10], 1):
        group_name = group.get('group_name', 'Unknown')
        total = group.get('total_members', 0)
        checkins = group.get('total_checkins', 0)
        new = group.get('new_members', 0)
        lines.append(f"{i}. **{group_name}**: {total} members, {checkins} check-ins, +{new} new")
    
    return "\n".join(lines)


def format_interests_data(interests: list) -> str:
    """Format top interests for the AI."""
    if not interests:
        return ""
    
    lines = ["## Top Interests"]
    for interest in interests[:5]:
        name = interest.get('interests__name') or 'Unspecified'
        count = interest.get('count', 0)
        lines.append(f"- {name}: {count} members")
    
    return "\n".join(lines)


def format_questionnaire_data(questionnaires: Dict) -> str:
    """Format questionnaire analytics for the AI."""
    if not questionnaires:
        return ""
    
    participation = questionnaires.get('participation', {})
    gender = questionnaires.get('gender_breakdown', {})
    
    lines = [f"""## Questionnaire Analytics
- **Total Questionnaires:** {questionnaires.get('total_questionnaires', 0)} (in period)
- **Total Eligible Members:** {questionnaires.get('total_eligible', 0)}
- **Total Responses:** {questionnaires.get('total_responses', 0)}

### Participation Rates
- **Completed:** {participation.get('completed_pct', 0)}% ({participation.get('completed_count', 0)} members)
- **Started (not completed):** {participation.get('started_pct', 0)}% ({participation.get('started_count', 0)} members)
- **Did Not Participate:** {participation.get('not_participated_pct', 0)}% ({participation.get('not_participated_count', 0)} members)

### Gender Breakdown of Participants
- **Male:** {gender.get('male_pct', 0)}% ({gender.get('male_count', 0)})
- **Female:** {gender.get('female_pct', 0)}% ({gender.get('female_count', 0)})
- **Other/Non-binary:** {gender.get('other_pct', 0)}% ({gender.get('other_count', 0)})"""]
    
    return "\n".join(lines)


def format_booking_data(bookings: Dict) -> str:
    """Format booking analytics for the AI."""
    if not bookings:
        return ""
    
    gender = bookings.get('gender_breakdown', {})
    top_resources = bookings.get('top_resources', [])
    
    lines = [f"""## Booking Analytics
- **Total Bookings:** {bookings.get('total_bookings', 0)} (in period)
- **Unique Bookers:** {bookings.get('unique_bookers', 0)}

### Gender Breakdown of Bookers
- **Male:** {gender.get('male_pct', 0)}% ({gender.get('male_count', 0)})
- **Female:** {gender.get('female_pct', 0)}% ({gender.get('female_count', 0)})
- **Other/Non-binary:** {gender.get('other_pct', 0)}% ({gender.get('other_count', 0)})"""]
    
    # Top booked resources
    if top_resources:
        lines.append("\n### Top Booked Resources (Rooms & Equipment)")
        for i, resource in enumerate(top_resources[:8], 1):
            name = resource.get('resource_name', 'Unknown')
            resource_type = resource.get('resource_type', 'UNKNOWN')
            count = resource.get('count', 0)
            type_label = '🚪 Room' if resource_type == 'ROOM' else '🎮 Equipment'
            lines.append(f"{i}. {name} ({type_label}) - {count} bookings")
    
    return "\n".join(lines)


def format_filters_context(filters: Dict) -> str:
    """Format the applied filters for context."""
    if not filters:
        return "**Scope:** All data (no filters)"
    
    lines = ["## Report Scope"]
    
    if filters.get('start_date') and filters.get('end_date'):
        start = filters['start_date'][:10] if isinstance(filters['start_date'], str) else str(filters['start_date'])[:10]
        end = filters['end_date'][:10] if isinstance(filters['end_date'], str) else str(filters['end_date'])[:10]
        lines.append(f"- Date Range: {start} to {end}")
    
    if filters.get('club_id'):
        lines.append(f"- Club ID: {filters['club_id']}")
    
    if filters.get('group_id'):
        lines.append(f"- Group ID: {filters['group_id']}")
    
    if filters.get('grades'):
        lines.append(f"- Grades: {', '.join(map(str, filters['grades']))}")
    
    if filters.get('genders'):
        lines.append(f"- Genders: {', '.join(filters['genders'])}")
    
    return "\n".join(lines) if len(lines) > 1 else "**Scope:** All data"


# =============================================================================
# USER PROMPT BUILDER
# =============================================================================

def build_user_prompt(
    analytics_data: Dict[str, Any],
    user_request: str,
    filters_context: Optional[Dict] = None,
    report_type: str = 'summary',
    visible_sections: Optional[Dict[str, bool]] = None
) -> str:
    """
    Build the complete user prompt with all analytics data.
    
    Args:
        analytics_data: The analytics data from the service
        user_request: The admin's specific request
        filters_context: Applied filters for context
        report_type: Type of report (summary, monthly, trend)
        visible_sections: Dict of section visibility preferences. 
                         If provided, only visible sections are included.
                         Keys: metrics, heatmap, inventory, demographics, interests, 
                               insights, questionnaires, bookings, groupComparison, 
                               clubComparison, events
    """
    sections = []
    
    # Helper to check if a section is visible
    def is_visible(section_key: str) -> bool:
        if visible_sections is None:
            return True  # No preferences = show all
        return visible_sections.get(section_key, True)
    
    # Header
    sections.append(f"# Analytics Report Request")
    sections.append(f"**Type:** {report_type.title()}")
    sections.append(f"**Date:** {datetime.now().strftime('%Y-%m-%d')}\n")
    
    # User's specific request
    sections.append(f"## Request\n{user_request}\n")
    
    # Filters context
    if filters_context:
        sections.append(format_filters_context(filters_context))
    
    # Note about hidden sections if any are hidden
    if visible_sections:
        hidden = [k for k, v in visible_sections.items() if not v]
        if hidden:
            sections.append(f"\n*Note: The admin has hidden the following sections from their dashboard: {', '.join(hidden)}. Only analyze the visible data below.*\n")
    
    sections.append("\n---\n# DATA\n")
    
    # Total Members - always show first
    total_members = analytics_data.get('total_members', 0)
    
    # Traffic/Metrics - includes total members
    if is_visible('metrics') and analytics_data.get('traffic'):
        sections.append(format_traffic_data(analytics_data['traffic'], total_members))
    
    # Demographics
    if is_visible('demographics') and analytics_data.get('demographics'):
        sections.append(format_demographics_data(analytics_data['demographics']))
    
    # Inventory
    if is_visible('inventory') and analytics_data.get('inventory'):
        sections.append(format_inventory_data(analytics_data['inventory']))
    
    # Events
    if is_visible('events') and analytics_data.get('events'):
        sections.append(format_events_data(analytics_data['events']))
    
    # Network/Insights (Municipality only)
    if is_visible('insights') and analytics_data.get('network'):
        sections.append(format_network_data(analytics_data['network']))
    
    # Club Comparison (Municipality only)
    if is_visible('clubComparison') and analytics_data.get('comparison'):
        sections.append(format_club_comparison(analytics_data['comparison']))
    
    # Group Comparison
    if is_visible('groupComparison') and analytics_data.get('group_comparison'):
        sections.append(format_group_comparison(analytics_data['group_comparison']))
    
    # Interests
    if is_visible('interests') and analytics_data.get('top_interests'):
        sections.append(format_interests_data(analytics_data['top_interests']))
    
    # Questionnaire Analytics (NEW)
    if is_visible('questionnaires') and analytics_data.get('questionnaires'):
        sections.append(format_questionnaire_data(analytics_data['questionnaires']))
    
    # Booking Analytics (NEW)
    if is_visible('bookings') and analytics_data.get('bookings'):
        sections.append(format_booking_data(analytics_data['bookings']))
    
    # Final instruction
    sections.append("\n---")
    sections.append("""
## Instructions
- Address the admin's request first
- Only analyze the data sections provided above (hidden sections should not be discussed)
- Cover the key metrics provided
- Be balanced: acknowledge both strengths and areas for improvement
- Provide practical recommendations
- Keep it concise and actionable
""")
    
    return "\n\n".join(sections)
