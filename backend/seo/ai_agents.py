# backend/seo/ai_agents.py
"""
AI Content Agents for SEO Content Generation

Each agent has a distinct persona and writing style tailored to specific audiences:
- YOUTH: Fun, engaging content for young people (13-19)
- GUARDIAN: Trust-building content for parents/guardians
- MUNICIPALITY: Professional B2G content for decision makers
"""

import json
import re
import hashlib
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from analytics.ai_service import get_ai_provider, AIProvider

logger = logging.getLogger(__name__)


# =============================================================================
# PERSONA DEFINITIONS
# =============================================================================

PERSONAS = {
    'YOUTH': {
        'name': 'Youth Writer',
        'description': 'Energisk och engagerande skribent för ungdomar',
        'system_prompt': """Du är en entusiastisk skribent som skapar innehåll för ungdomar (13-19 år) i Sverige.

DIN STIL:
- Energisk och engagerande – använd ett språk som känns relevant och autentiskt
- Fokusera på KUL och MÖJLIGHETER
- Betona gemenskap och tillhörighet
- Lyft fram konkreta aktiviteter: gaming, musik, sport, konst, skapande
- Var inkluderande – alla är välkomna oavsett bakgrund
- Undvik att låta som en vuxen som försöker vara "hip"

TONALITET:
- Autentisk, inte tillgjord
- Positiv men inte överdrivet
- Direkt och ärlig
- "Vi" och "du" – personligt tilltal

FOKUSOMRÅDEN:
- Vad kan man göra på en fritidsgård?
- Vilka aktiviteter och möjligheter finns?
- Hur träffar man nya vänner?
- Varför är det en cool plats att hänga på?
- Evenemang och händelser

UNDVIK:
- Förmaningar om säkerhet (det är föräldrarnas perspektiv)
- Byråkratiskt språk
- Överdrivet entusiastiskt eller "cringe" tonfall
- Nedlåtande förklaringar

SPRÅK: Skriv alltid på svenska.""",
        'cta_style': 'action',
        'cta_examples': [
            'Kolla in vad som händer!',
            'Hitta din närmaste fritidsgård',
            'Se alla aktiviteter',
            'Kom förbi och häng!',
        ]
    },
    
    'GUARDIAN': {
        'name': 'Guardian Writer',
        'description': 'Pålitlig och informativ skribent för föräldrar',
        'system_prompt': """Du är en pålitlig och professionell skribent som skapar innehåll för föräldrar och vårdnadshavare i Sverige.

DIN STIL:
- Trygg och informativ
- Betona SÄKERHET och KVALITET
- Fokusera på UTVECKLING och MENINGSFULL FRITID
- Visa förståelse för föräldrars oro och frågor
- Lyft fram professionell personal och strukturerad verksamhet

TONALITET:
- Professionell men varm
- Lugnande och förtroendeingivande
- Faktabaserad
- Empatisk och förstående

FOKUSOMRÅDEN:
- Hur säkerställs barnens trygghet?
- Vilken personal finns på plats? (utbildad fritidspersonal)
- Hur ser aktiviteterna ut?
- Varför är fritidsgård bra för ungas utveckling?
- Digital närvarokontroll och transparens via Ungdomsappen
- Forskning om fritidsverksamhetens betydelse

LYFT FRAM:
- Utbildad och engagerad personal
- Trygga och drogfria miljöer
- Positiva effekter på ungdomars utveckling
- Struktur och rutiner
- Modern plattform för insyn (Ungdomsappen)
- Möjlighet att följa barnets aktiviteter

UNDVIK:
- Ungdomsslang
- Att tona ner föräldrarnas roll
- Att låta som ren marknadsföring
- Överdrivna löften

SPRÅK: Skriv alltid på svenska.""",
        'cta_style': 'trust',
        'cta_examples': [
            'Läs mer om hur vi arbetar med trygghet',
            'Hitta en fritidsgård nära er',
            'Se hur Ungdomsappen ger dig som förälder insyn',
            'Kontakta oss för mer information',
        ]
    },
    
    'MUNICIPALITY': {
        'name': 'Municipality Writer',
        'description': 'Professionell B2G-skribent för beslutsfattare',
        'system_prompt': """Du är en professionell B2G-skribent som skapar innehåll för kommunala beslutsfattare och tjänstemän i Sverige.

DIN STIL:
- Professionell och koncis
- Fokusera på EFFEKTIVITET och värde
- Betona KVALITET och RAPPORTERING
- Använd data och konkreta exempel
- Visa förståelse för kommunala utmaningar och processer

TONALITET:
- Affärsmässig och saklig
- Lösningsorienterad
- Datadriven
- Respektfull för komplexiteten i kommunal verksamhet

FOKUSOMRÅDEN:
- Hur effektiviserar plattformen administrationen?
- Vilka rapporter och insikter får beslutsfattare?
- Hur förbättras ungdomsverksamhetens kvalitet?
- Kostnadsbesparingar och resursoptimering
- Digitalisering av ungdomsverksamhet
- Uppföljning och kvalitetssäkring

LYFT FRAM:
- Tidsbesparingar för personal
- Förbättrad datakvalitet och uppföljning
- Jämförbar statistik mellan enheter
- Modern och säker plattform
- GDPR-compliance
- Redan använd av kommuner i Sverige

UNDVIK:
- Flummigt eller vagt språk
- Överdriven entusiasm
- Funktioner som inte är relevanta för beslutsfattare
- Teknisk jargong utan förklaring

SPRÅK: Skriv alltid på svenska.""",
        'cta_style': 'professional',
        'cta_examples': [
            'Boka en demonstration',
            'Läs mer om våra kommunlösningar',
            'Kontakta oss för en offert',
            'Se hur andra kommuner använder Ungdomsappen',
        ]
    },
}


# =============================================================================
# CONTENT AGENT CLASS
# =============================================================================

class ContentAgent:
    """
    AI Content Agent with a specific persona for generating SEO content.
    """
    
    def __init__(self, persona: str, provider_name: str = None):
        """
        Initialize the content agent.
        
        Args:
            persona: One of 'YOUTH', 'GUARDIAN', 'MUNICIPALITY'
            provider_name: Optional AI provider override ('anthropic' or 'openai')
        """
        if persona not in PERSONAS:
            raise ValueError(f"Unknown persona: {persona}. Must be one of {list(PERSONAS.keys())}")
        
        self.persona_key = persona
        self.persona = PERSONAS[persona]
        self.ai_provider = get_ai_provider(provider_name)
    
    def generate_local_page_content(
        self,
        location: Dict[str, Any],
        keyword: str,
        page_type: str = 'GENERAL',
        nearby_clubs: List[Dict] = None,
        nearby_events: List[Dict] = None,
        platform_stats: Dict[str, Any] = None
    ) -> Dict[str, str]:
        """
        Generate content for a local landing page.
        
        Args:
            location: Dict with name, region, lat, lng, population
            keyword: Primary target keyword
            page_type: 'EVENTS', 'CLUBS', or 'GENERAL'
            nearby_clubs: List of nearby clubs
            nearby_events: List of upcoming events nearby
            platform_stats: Aggregated platform statistics
        
        Returns:
            Dict with generated content fields
        """
        context = self._build_local_context(
            location, 
            nearby_clubs or [], 
            nearby_events or [], 
            platform_stats
        )
        
        user_prompt = f"""Skapa SEO-innehåll för en lokal landningssida.

MÅLSÖKORD: {keyword}
PLATS: {location['name']} ({location.get('region', 'Sverige')})
SIDTYP: {page_type}
BEFOLKNING: {location.get('population', 'okänt')}

KONTEXT (verklig data från plattformen):
{context}

UPPGIFT:
Generera följande på svenska. Alla fält ska vara optimerade för sökmotorer och naturligt inkludera sökordet.

**SEO METADATA:**
1. **title** (max 60 tecken) - SEO-titel för sökresultat. Format: "[Huvudsökord] i [Plats] | Ungdomsappen"
2. **meta_description** (max 155 tecken) - Lockande beskrivning med call-to-action och sökord

**SYNLIG INNEHÅLL:**
3. **h1_title** (max 80 tecken) - Huvudrubrik (H1). MÅSTE innehålla huvudsökord och platsnamn
4. **hero_tagline** (max 120 tecken) - Kort tagline under H1
5. **intro_content** (2-3 meningar) - Inledande stycke med lokal koppling och sökord
6. **main_content** - VIKTIG: Skapa SEO-optimerat innehåll med RÄTT STRUKTUR:
   - Använd "## " för H2-rubriker (2-3 st, inkludera sökord i minst en)
   - Använd "### " för H3-rubriker (1-2 st under varje H2)
   - Skriv 2-3 stycken under varje rubrik
   - Inkludera sökord naturligt i första meningen av varje sektion
   - Använd punktlistor med "- " för att bryta upp text
   - Totalt ca 400-600 ord
7. **cta_content** (1-2 meningar) - Uppmaning till handling

**HERO IMAGE:**
8. **hero_image_alt** (max 150 tecken) - Alt-text för hero-bild. Beskrivande, inkludera platsnamn

**SOCIAL MEDIA:**
9. **og_title** (max 70 tecken) - Facebook/LinkedIn-titel, mer engagerande
10. **og_description** (max 200 tecken) - Social media beskrivning
11. **twitter_title** (max 70 tecken) - Twitter-titel, kort och catchy
12. **twitter_description** (max 200 tecken) - Twitter beskrivning, informell ton

**FAQ (för rich snippets):**
13. **faq_items** - Array med 3 FAQ-frågor och svar relevanta för sökordet:
    Format: [{{"question": "...", "answer": "..."}}]
    Varje svar ska vara 1-2 meningar.

REGLER:
- Inkludera sökordet naturligt (3-5 gånger i main_content)
- Första stycket MÅSTE innehålla sökordet
- H2-rubriker ska vara beskrivande och gärna inkludera variationer av sökordet
- Använd verklig data där tillgänglig

VIKTIGT OM KLUBBAR:
- Läs KONTEXT ovan noggrant - den anger om kommunen HAR fritidsgårdar eller inte
- Om kommunen INTE har fritidsgårdar: säg ALDRIG "det finns X fritidsgårdar i [Plats]"
- Om kommunen INTE har fritidsgårdar: fokusera på "närmaste fritidsgårdar" och "fritidsgårdar i närheten"
- Om kommunen HAR fritidsgårdar: nämn dem vid namn och att de finns i kommunen
- Var alltid ärlig - ljug aldrig om vad som finns i kommunen
- Matcha tonaliteten för målgruppen

EXEMPEL STRUKTUR FÖR main_content:
```
## Vad kan du göra på fritidsgårdar i [Plats]?

[2-3 meningar om aktiviteter]

### Gaming och esport
[Information om gaming]

### Musik och skapande
[Information om musik]

## Hitta rätt fritidsgård för dig i [Plats]

[Information om hur man hittar rätt ställe]

- Punkt 1
- Punkt 2
```

Svara ENDAST med ett JSON-objekt (ingen annan text):
{{"title": "...", "meta_description": "...", "h1_title": "...", "hero_tagline": "...", "intro_content": "...", "main_content": "...", "cta_content": "...", "hero_image_alt": "...", "og_title": "...", "og_description": "...", "twitter_title": "...", "twitter_description": "...", "faq_items": [{{"question": "...", "answer": "..."}}, ...]}}"""

        response = self.ai_provider.generate_report(
            self.persona['system_prompt'],
            user_prompt
        )
        
        return self._parse_json_response(response)
    
    def generate_article(
        self,
        keyword: str,
        title_suggestion: str = None,
        outline: List[str] = None,
        word_count_target: int = 1000,
        internal_links: List[Dict] = None
    ) -> Dict[str, str]:
        """
        Generate a full SEO article.
        
        Args:
            keyword: Primary target keyword
            title_suggestion: Optional suggested title
            outline: Optional list of section headings
            word_count_target: Target word count
            internal_links: Pages to link to within content
        
        Returns:
            Dict with article content
        """
        outline_text = ""
        if outline:
            outline_text = f"\nFÖRESLAGEN OUTLINE:\n" + "\n".join(f"- {item}" for item in outline)
        
        links_text = ""
        if internal_links:
            links_text = "\nSIDOR ATT LÄNKA TILL:\n" + "\n".join(
                f"- {link['title']}: {link['url']}" for link in internal_links
            )
        
        user_prompt = f"""Skriv en SEO-optimerad artikel.

MÅLSÖKORD: {keyword}
{'FÖRESLAGEN TITEL: ' + title_suggestion if title_suggestion else ''}
MÅLGRUPP: {self.persona['name']}
MÅLANTAL ORD: ca {word_count_target}
{outline_text}
{links_text}

UPPGIFT:
Skriv en fullständig, värdefull artikel på svenska som:
1. Är optimerad för sökordet (naturlig användning, inte stuffing)
2. Har tydlig struktur med H2/H3-rubriker (markdown ##, ###)
3. Inkluderar interna länkar där naturligt (markdown format)
4. Har en engagerande introduktion
5. Ger verkligt värde till läsaren
6. Avslutar med en tydlig call-to-action

GENERERA (JSON-format):
- **title** (max 60 tecken) - SEO-titel
- **meta_description** (max 155 tecken) - Meta-beskrivning
- **h1_title** (max 80 tecken) - Artikelrubrik
- **excerpt** (max 200 tecken) - Kort sammanfattning
- **content** (markdown) - Fullständig artikel
- **suggested_internal_links** - Lista med föreslagna ankarlänkar

Svara ENDAST med ett JSON-objekt (ingen annan text):
{{"title": "...", "meta_description": "...", "h1_title": "...", "excerpt": "...", "content": "...", "suggested_internal_links": [...]}}"""

        response = self.ai_provider.generate_report(
            self.persona['system_prompt'],
            user_prompt
        )
        
        return self._parse_json_response(response)
    
    def generate_meta_only(
        self,
        content: str,
        keyword: str,
        page_type: str = 'article'
    ) -> Dict[str, str]:
        """
        Generate only meta tags for existing content.
        Useful for optimizing existing pages.
        
        Args:
            content: Existing page content
            keyword: Target keyword
            page_type: Type of page
        
        Returns:
            Dict with title and meta_description
        """
        user_prompt = f"""Generera SEO-metadata för befintligt innehåll.

MÅLSÖKORD: {keyword}
SIDTYP: {page_type}

INNEHÅLL (sammanfattning):
{content[:2000]}...

GENERERA:
1. **title** (max 60 tecken) - Optimerad SEO-titel
2. **meta_description** (max 155 tecken) - Lockande beskrivning med CTA

Svara ENDAST med JSON:
{{"title": "...", "meta_description": "..."}}"""

        response = self.ai_provider.generate_report(
            self.persona['system_prompt'],
            user_prompt
        )
        
        return self._parse_json_response(response)
    
    def suggest_internal_links(
        self,
        content: str,
        available_pages: List[Dict]
    ) -> List[Dict]:
        """
        Suggest internal links to add to content.
        
        Args:
            content: The content to add links to
            available_pages: List of available pages to link to
        
        Returns:
            List of suggested links with anchor text
        """
        pages_text = "\n".join(
            f"- {p['title']}: {p['url']} ({p.get('type', 'page')})"
            for p in available_pages[:20]  # Limit to avoid token overflow
        )
        
        user_prompt = f"""Föreslå interna länkar för detta innehåll.

INNEHÅLL:
{content[:3000]}

TILLGÄNGLIGA SIDOR ATT LÄNKA TILL:
{pages_text}

UPPGIFT:
Föreslå 3-5 naturliga interna länkar. För varje:
1. Identifiera en mening/fras i innehållet där en länk passar naturligt
2. Föreslå ankartext (de ord som ska länkas)
3. Välj målsida

Svara ENDAST med JSON:
{{"links": [{{"anchor_text": "...", "target_url": "...", "context": "..."}}]}}"""

        response = self.ai_provider.generate_report(
            self.persona['system_prompt'],
            user_prompt
        )
        
        result = self._parse_json_response(response)
        return result.get('links', [])
    
    def _build_local_context(
        self,
        location: Dict,
        clubs: List[Dict],
        events: List[Dict],
        stats: Dict = None
    ) -> str:
        """Build context string with real data for local pages."""
        parts = []
        location_name = location.get('name', 'området')
        
        # Separate clubs IN the location vs NEARBY
        clubs_in_location = []
        clubs_nearby = []
        
        if clubs:
            for club in clubs:
                # Check if club is in the same municipality (distance ~0 or same name)
                distance = club.get('distance_km', 999)
                club_municipality = club.get('municipality_name', '').lower()
                if distance <= 5 or location_name.lower() in club_municipality:
                    clubs_in_location.append(club)
                else:
                    clubs_nearby.append(club)
        
        # Build context based on what we have
        has_local_clubs = len(clubs_in_location) > 0
        
        if clubs_in_location:
            parts.append(f"FRITIDSGÅRDAR I {location_name.upper()} ({len(clubs_in_location)} st):")
            parts.append("(Kommunen är medlem i Ungdomsappen)")
            for club in clubs_in_location[:5]:
                parts.append(f"- {club['name']}")
        
        if clubs_nearby and not clubs_in_location:
            parts.append(f"INGEN FRITIDSGÅRD I {location_name.upper()} ÄNNU")
            parts.append("(Kommunen är INTE ännu medlem i Ungdomsappen)")
            parts.append(f"\nNÄRMASTE FRITIDSGÅRDAR ({len(clubs_nearby)} st):")
            for club in clubs_nearby[:5]:
                distance = club.get('distance_km', '?')
                municipality = club.get('municipality_name', '')
                parts.append(f"- {club['name']} i {municipality} ({distance} km)")
        elif clubs_nearby and clubs_in_location:
            parts.append(f"\nFLER FRITIDSGÅRDAR I NÄRHETEN ({len(clubs_nearby)} st):")
            for club in clubs_nearby[:3]:
                distance = club.get('distance_km', '?')
                municipality = club.get('municipality_name', '')
                parts.append(f"- {club['name']} i {municipality} ({distance} km)")
        
        if not clubs:
            parts.append(f"INGA FRITIDSGÅRDAR I {location_name.upper()} ELLER NÄRA ÄNNU")
            parts.append("(Visa allmän information om fritidsgårdar)")
        
        # Events info
        if events:
            parts.append(f"\nKOMMANDE EVENEMANG I NÄRHETEN ({len(events)} st):")
            for event in events[:5]:
                parts.append(f"- {event['title']} ({event.get('start_date_formatted', 'snart')})")
        else:
            parts.append("\nINGA KOMMANDE EVENEMANG I NÄRHETEN")
        
        # Platform stats (aggregated, not individual)
        if stats:
            parts.append(f"\nPLATTFORMSSTATISTIK (aggregerad, nationell):")
            if stats.get('total_visits'):
                parts.append(f"- {stats['total_visits']:,} besök senaste månaden (Sverige)")
            if stats.get('total_members'):
                parts.append(f"- {stats['total_members']:,} aktiva medlemmar")
            if stats.get('total_events'):
                parts.append(f"- {stats['total_events']} evenemang kommande veckan")
            if stats.get('total_clubs'):
                parts.append(f"- {stats['total_clubs']} anslutna fritidsgårdar i Sverige")
        
        # Important instructions based on club status
        parts.append(f"\n--- VIKTIGT ---")
        if has_local_clubs:
            parts.append(f"Kommunen {location_name} HAR fritidsgårdar i Ungdomsappen.")
            parts.append("Du kan säga att det finns fritidsgårdar i kommunen.")
        else:
            parts.append(f"Kommunen {location_name} har INTE fritidsgårdar i Ungdomsappen ännu.")
            parts.append("Säg INTE att det finns fritidsgårdar i kommunen.")
            parts.append("Fokusera istället på närmaste alternativ och uppmuntra att kontakta kommunen.")
        
        return "\n".join(parts)
    
    def _parse_json_response(self, response: str) -> Dict:
        """Parse JSON from AI response, handling various formats."""
        if not response:
            return {'error': 'Empty response from AI'}
        
        # Try to extract JSON from response
        # Sometimes AI wraps it in markdown code blocks
        json_patterns = [
            r'```json\s*(.*?)\s*```',  # ```json ... ```
            r'```\s*(.*?)\s*```',       # ``` ... ```
            r'(\{.*\})',                # Raw JSON object
        ]
        
        for pattern in json_patterns:
            match = re.search(pattern, response, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    continue
        
        # If no valid JSON found, return raw text
        logger.warning(f"Could not parse JSON from AI response: {response[:200]}...")
        return {'raw_content': response, 'parse_error': True}
    
    def get_prompt_hash(self, **kwargs) -> str:
        """Generate hash of prompt parameters for change detection."""
        content = json.dumps(kwargs, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:16]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_available_personas() -> List[Dict]:
    """Return list of available personas with descriptions."""
    return [
        {
            'key': key,
            'name': persona['name'],
            'description': persona['description'],
            'cta_style': persona['cta_style'],
            'cta_examples': persona['cta_examples'],
        }
        for key, persona in PERSONAS.items()
    ]


def create_agent(persona: str, provider: str = None) -> ContentAgent:
    """Factory function to create a content agent."""
    return ContentAgent(persona, provider)


# =============================================================================
# BATCH GENERATION HELPERS
# =============================================================================

class ContentGenerationQueue:
    """
    Manages batch content generation tasks.
    Useful for generating content for multiple locations.
    """
    
    def __init__(self):
        self.queue = []
        self.results = []
        self.errors = []
    
    def add_local_page_task(
        self,
        location: Dict,
        keyword: str,
        persona: str,
        page_type: str = 'GENERAL',
        **kwargs
    ):
        """Add a local page generation task to the queue."""
        self.queue.append({
            'type': 'local_page',
            'location': location,
            'keyword': keyword,
            'persona': persona,
            'page_type': page_type,
            **kwargs
        })
    
    def add_article_task(
        self,
        keyword: str,
        persona: str,
        title_suggestion: str = None,
        **kwargs
    ):
        """Add an article generation task to the queue."""
        self.queue.append({
            'type': 'article',
            'keyword': keyword,
            'persona': persona,
            'title_suggestion': title_suggestion,
            **kwargs
        })
    
    def process_queue(self, progress_callback=None) -> Dict:
        """
        Process all tasks in the queue.
        
        Args:
            progress_callback: Optional callback(current, total, task)
        
        Returns:
            Dict with results and errors
        """
        total = len(self.queue)
        
        for i, task in enumerate(self.queue):
            try:
                agent = ContentAgent(task['persona'])
                
                if task['type'] == 'local_page':
                    result = agent.generate_local_page_content(
                        location=task['location'],
                        keyword=task['keyword'],
                        page_type=task.get('page_type', 'GENERAL'),
                        nearby_clubs=task.get('nearby_clubs'),
                        nearby_events=task.get('nearby_events'),
                        platform_stats=task.get('platform_stats'),
                    )
                elif task['type'] == 'article':
                    result = agent.generate_article(
                        keyword=task['keyword'],
                        title_suggestion=task.get('title_suggestion'),
                        outline=task.get('outline'),
                    )
                else:
                    raise ValueError(f"Unknown task type: {task['type']}")
                
                self.results.append({
                    'task': task,
                    'result': result,
                    'success': True,
                })
                
            except Exception as e:
                logger.error(f"Error processing task {i}: {str(e)}")
                self.errors.append({
                    'task': task,
                    'error': str(e),
                    'success': False,
                })
            
            if progress_callback:
                progress_callback(i + 1, total, task)
        
        return {
            'total': total,
            'successful': len(self.results),
            'failed': len(self.errors),
            'results': self.results,
            'errors': self.errors,
        }

