# backend/seo/management/commands/import_nordic_locations.py
"""
Management command to import Danish and Norwegian municipalities.

Denmark has 98 municipalities (kommuner).
Norway has 356 municipalities (kommuner).

This command populates the Location model with municipalities from these countries.

Usage:
    python manage.py import_nordic_locations
    python manage.py import_nordic_locations --country=DK  # Only Denmark
    python manage.py import_nordic_locations --country=NO  # Only Norway
    python manage.py import_nordic_locations --clear  # Clear existing first
"""

from django.core.management.base import BaseCommand
from django.utils.text import slugify
from seo.models import Location


# =============================================================================
# DANISH MUNICIPALITIES DATA
# =============================================================================

# All 98 Danish municipalities with approximate center coordinates
# Format: (name, official_code, lat, lng, population, region)
# Population data from Statistics Denmark 2024
DANISH_MUNICIPALITIES = [
    # Region Hovedstaden (Capital Region)
    ("København", "0101", 55.6761, 12.5683, 644431, "Region Hovedstaden"),
    ("Frederiksberg", "0147", 55.6786, 12.5311, 104410, "Region Hovedstaden"),
    ("Dragør", "0155", 55.5933, 12.6733, 14632, "Region Hovedstaden"),
    ("Tårnby", "0185", 55.6300, 12.6000, 43262, "Region Hovedstaden"),
    ("Albertslund", "0165", 55.6567, 12.3639, 28209, "Region Hovedstaden"),
    ("Ballerup", "0151", 55.7317, 12.3633, 49500, "Region Hovedstaden"),
    ("Brøndby", "0153", 55.6500, 12.4167, 35600, "Region Hovedstaden"),
    ("Gentofte", "0157", 55.7500, 12.5500, 75500, "Region Hovedstaden"),
    ("Gladsaxe", "0159", 55.7333, 12.4833, 70000, "Region Hovedstaden"),
    ("Glostrup", "0161", 55.6667, 12.4000, 23000, "Region Hovedstaden"),
    ("Herlev", "0163", 55.7333, 12.4333, 29000, "Region Hovedstaden"),
    ("Hvidovre", "0167", 55.6500, 12.4833, 53500, "Region Hovedstaden"),
    ("Høje-Taastrup", "0169", 55.6500, 12.2667, 51000, "Region Hovedstaden"),
    ("Ishøj", "0183", 55.6167, 12.3500, 23000, "Region Hovedstaden"),
    ("Lyngby-Taarbæk", "0173", 55.7833, 12.5000, 56000, "Region Hovedstaden"),
    ("Rødovre", "0175", 55.6833, 12.4500, 40500, "Region Hovedstaden"),
    ("Vallensbæk", "0187", 55.6333, 12.3833, 16500, "Region Hovedstaden"),
    ("Allerød", "0201", 55.8667, 12.3500, 26000, "Region Hovedstaden"),
    ("Egedal", "0240", 55.7667, 12.2000, 44000, "Region Hovedstaden"),
    ("Fredensborg", "0210", 55.9667, 12.4333, 41000, "Region Hovedstaden"),
    ("Frederikssund", "0250", 55.8333, 12.0667, 45500, "Region Hovedstaden"),
    ("Furesø", "0190", 55.8000, 12.3667, 41500, "Region Hovedstaden"),
    ("Gribskov", "0270", 56.0667, 12.2667, 42000, "Region Hovedstaden"),
    ("Halsnæs", "0260", 55.9667, 11.9333, 31500, "Region Hovedstaden"),
    ("Helsingør", "0217", 56.0333, 12.6167, 63000, "Region Hovedstaden"),
    ("Hillerød", "0219", 55.9333, 12.3000, 52500, "Region Hovedstaden"),
    ("Hørsholm", "0223", 55.8833, 12.5000, 25000, "Region Hovedstaden"),
    ("Rudersdal", "0230", 55.8333, 12.4833, 57000, "Region Hovedstaden"),
    ("Bornholm", "0400", 55.1167, 14.9167, 39500, "Region Hovedstaden"),
    
    # Region Sjælland (Zealand Region)
    ("Greve", "0253", 55.5833, 12.3000, 51000, "Region Sjælland"),
    ("Køge", "0259", 55.4583, 12.1833, 62000, "Region Sjælland"),
    ("Lejre", "0350", 55.6000, 11.9667, 28000, "Region Sjælland"),
    ("Roskilde", "0265", 55.6417, 12.0833, 88000, "Region Sjælland"),
    ("Solrød", "0269", 55.5333, 12.2167, 23500, "Region Sjælland"),
    ("Faxe", "0320", 55.2500, 12.1167, 36500, "Region Sjælland"),
    ("Guldborgsund", "0376", 54.7667, 11.8667, 60500, "Region Sjælland"),
    ("Holbæk", "0316", 55.7167, 11.7167, 72000, "Region Sjælland"),
    ("Kalundborg", "0326", 55.6833, 11.0833, 49000, "Region Sjælland"),
    ("Lolland", "0360", 54.7667, 11.5000, 40500, "Region Sjælland"),
    ("Næstved", "0370", 55.2333, 11.7667, 83000, "Region Sjælland"),
    ("Odsherred", "0306", 55.8333, 11.6167, 33500, "Region Sjælland"),
    ("Ringsted", "0329", 55.4500, 11.7833, 35000, "Region Sjælland"),
    ("Slagelse", "0330", 55.4000, 11.3500, 79500, "Region Sjælland"),
    ("Sorø", "0340", 55.4333, 11.5667, 30000, "Region Sjælland"),
    ("Stevns", "0336", 55.3333, 12.3333, 23000, "Region Sjælland"),
    ("Vordingborg", "0390", 55.0167, 11.9000, 46500, "Region Sjælland"),
    
    # Region Syddanmark (Southern Denmark)
    ("Assens", "0420", 55.2667, 9.9000, 41000, "Region Syddanmark"),
    ("Billund", "0530", 55.7333, 9.1167, 27000, "Region Syddanmark"),
    ("Esbjerg", "0561", 55.4667, 8.4500, 116000, "Region Syddanmark"),
    ("Fanø", "0563", 55.4333, 8.4000, 3500, "Region Syddanmark"),
    ("Fredericia", "0607", 55.5667, 9.7500, 52000, "Region Syddanmark"),
    ("Faaborg-Midtfyn", "0430", 55.1000, 10.2333, 52000, "Region Syddanmark"),
    ("Haderslev", "0510", 55.2500, 9.4833, 56000, "Region Syddanmark"),
    ("Kerteminde", "0440", 55.4500, 10.6500, 24000, "Region Syddanmark"),
    ("Kolding", "0621", 55.4833, 9.4667, 93000, "Region Syddanmark"),
    ("Langeland", "0482", 54.9333, 10.7333, 12500, "Region Syddanmark"),
    ("Middelfart", "0410", 55.5000, 9.7333, 39000, "Region Syddanmark"),
    ("Nordfyns", "0480", 55.5000, 10.2333, 30000, "Region Syddanmark"),
    ("Nyborg", "0450", 55.3167, 10.7833, 32000, "Region Syddanmark"),
    ("Odense", "0461", 55.4000, 10.3833, 205000, "Region Syddanmark"),
    ("Svendborg", "0479", 55.0667, 10.6167, 59000, "Region Syddanmark"),
    ("Sønderborg", "0540", 54.9167, 9.7833, 74000, "Region Syddanmark"),
    ("Tønder", "0550", 54.9333, 8.8667, 37500, "Region Syddanmark"),
    ("Varde", "0573", 55.6167, 8.4833, 51000, "Region Syddanmark"),
    ("Vejen", "0575", 55.4833, 9.1333, 43000, "Region Syddanmark"),
    ("Vejle", "0630", 55.7083, 9.5333, 118000, "Region Syddanmark"),
    ("Ærø", "0492", 54.8667, 10.4000, 6000, "Region Syddanmark"),
    ("Aabenraa", "0580", 55.0500, 9.4167, 59500, "Region Syddanmark"),
    
    # Region Midtjylland (Central Jutland)
    ("Favrskov", "0710", 56.3000, 9.9667, 49000, "Region Midtjylland"),
    ("Hedensted", "0766", 55.7667, 9.7000, 47000, "Region Midtjylland"),
    ("Herning", "0657", 56.1333, 8.9833, 90000, "Region Midtjylland"),
    ("Holstebro", "0661", 56.3667, 8.6167, 59000, "Region Midtjylland"),
    ("Horsens", "0615", 55.8667, 9.8500, 93000, "Region Midtjylland"),
    ("Ikast-Brande", "0756", 56.1333, 9.1500, 42000, "Region Midtjylland"),
    ("Lemvig", "0665", 56.5500, 8.3167, 20000, "Region Midtjylland"),
    ("Norddjurs", "0707", 56.4500, 10.5333, 38000, "Region Midtjylland"),
    ("Odder", "0727", 55.9667, 10.1500, 23000, "Region Midtjylland"),
    ("Randers", "0730", 56.4667, 10.0333, 99000, "Region Midtjylland"),
    ("Ringkøbing-Skjern", "0760", 56.0833, 8.2500, 57000, "Region Midtjylland"),
    ("Samsø", "0741", 55.8667, 10.6000, 3700, "Region Midtjylland"),
    ("Silkeborg", "0740", 56.1667, 9.5500, 95000, "Region Midtjylland"),
    ("Skanderborg", "0746", 56.0333, 9.9333, 63000, "Region Midtjylland"),
    ("Skive", "0779", 56.5667, 9.0333, 47000, "Region Midtjylland"),
    ("Struer", "0671", 56.4833, 8.5833, 21000, "Region Midtjylland"),
    ("Syddjurs", "0706", 56.3000, 10.5333, 43000, "Region Midtjylland"),
    ("Viborg", "0791", 56.4500, 9.4000, 98000, "Region Midtjylland"),
    ("Aarhus", "0751", 56.1567, 10.2108, 352000, "Region Midtjylland"),
    
    # Region Nordjylland (North Jutland)
    ("Aalborg", "0851", 57.0500, 9.9167, 220000, "Region Nordjylland"),
    ("Brønderslev", "0810", 57.2667, 9.9500, 36500, "Region Nordjylland"),
    ("Frederikshavn", "0813", 57.4333, 10.5333, 60000, "Region Nordjylland"),
    ("Hjørring", "0860", 57.4667, 9.9833, 65000, "Region Nordjylland"),
    ("Jammerbugt", "0849", 57.1500, 9.5500, 38500, "Region Nordjylland"),
    ("Læsø", "0825", 57.2833, 11.0000, 1800, "Region Nordjylland"),
    ("Mariagerfjord", "0846", 56.6500, 9.9833, 42500, "Region Nordjylland"),
    ("Morsø", "0773", 56.7833, 8.8500, 20500, "Region Nordjylland"),
    ("Rebild", "0840", 56.8333, 9.8000, 30500, "Region Nordjylland"),
    ("Thisted", "0787", 56.9500, 8.6833, 44000, "Region Nordjylland"),
    ("Vesthimmerland", "0820", 56.8000, 9.4667, 37000, "Region Nordjylland"),
]

# =============================================================================
# NORWEGIAN MUNICIPALITIES DATA
# =============================================================================

# Major Norwegian municipalities (selection of most populated ones)
# Format: (name, official_code, lat, lng, population, region)
# Population data from Statistics Norway 2024
NORWEGIAN_MUNICIPALITIES = [
    # Oslo
    ("Oslo", "0301", 59.9139, 10.7522, 709037, "Oslo"),
    
    # Viken (former Akershus, Østfold, Buskerud)
    ("Bærum", "3024", 59.8942, 10.5200, 128000, "Viken"),
    ("Asker", "3025", 59.8333, 10.4333, 95000, "Viken"),
    ("Lillestrøm", "3030", 59.9550, 11.0500, 90000, "Viken"),
    ("Fredrikstad", "3004", 59.2181, 10.9298, 83000, "Viken"),
    ("Drammen", "3005", 59.7439, 10.2045, 102000, "Viken"),
    ("Sarpsborg", "3003", 59.2839, 11.1097, 58000, "Viken"),
    ("Moss", "3002", 59.4339, 10.6589, 50000, "Viken"),
    ("Lørenskog", "3029", 59.9333, 10.9667, 47000, "Viken"),
    ("Ski", "3040", 59.7200, 10.8400, 33000, "Viken"),
    ("Sandvika", "3024", 59.8900, 10.5300, 128000, "Viken"),
    ("Jessheim", "3034", 60.1500, 11.1700, 45000, "Viken"),
    ("Kongsberg", "3006", 59.6631, 9.6500, 28000, "Viken"),
    ("Halden", "3001", 59.1228, 11.3875, 31500, "Viken"),
    ("Ringerike", "3007", 60.1667, 10.2500, 30000, "Viken"),
    
    # Innlandet (former Hedmark, Oppland)
    ("Hamar", "3403", 60.7945, 11.0680, 32000, "Innlandet"),
    ("Lillehammer", "3405", 61.1153, 10.4662, 28500, "Innlandet"),
    ("Gjøvik", "3407", 60.7958, 10.6917, 30500, "Innlandet"),
    ("Elverum", "3420", 60.8817, 11.5631, 21500, "Innlandet"),
    ("Ringsaker", "3411", 60.8833, 10.8000, 35000, "Innlandet"),
    ("Stange", "3413", 60.7167, 11.1667, 21000, "Innlandet"),
    
    # Vestfold og Telemark
    ("Sandefjord", "3804", 59.1308, 10.2167, 66000, "Vestfold og Telemark"),
    ("Tønsberg", "3803", 59.2669, 10.4078, 57000, "Vestfold og Telemark"),
    ("Larvik", "3805", 59.0500, 10.0333, 48000, "Vestfold og Telemark"),
    ("Porsgrunn", "3806", 59.1400, 9.6567, 37000, "Vestfold og Telemark"),
    ("Skien", "3807", 59.2097, 9.6089, 55000, "Vestfold og Telemark"),
    ("Horten", "3801", 59.4167, 10.4833, 28000, "Vestfold og Telemark"),
    
    # Agder (former Aust-Agder, Vest-Agder)
    ("Kristiansand", "4204", 58.1467, 7.9956, 115000, "Agder"),
    ("Arendal", "4203", 58.4617, 8.7722, 46000, "Agder"),
    ("Grimstad", "4202", 58.3406, 8.5936, 24000, "Agder"),
    
    # Rogaland
    ("Stavanger", "1103", 58.9700, 5.7331, 145000, "Rogaland"),
    ("Sandnes", "1108", 58.8525, 5.7356, 82000, "Rogaland"),
    ("Haugesund", "1106", 59.4136, 5.2681, 37500, "Rogaland"),
    ("Karmøy", "1149", 59.2833, 5.3000, 42500, "Rogaland"),
    ("Sola", "1124", 58.8833, 5.6500, 28000, "Rogaland"),
    ("Randaberg", "1127", 59.0000, 5.6167, 11500, "Rogaland"),
    
    # Vestland (former Hordaland, Sogn og Fjordane)
    ("Bergen", "4601", 60.3913, 5.3221, 289000, "Vestland"),
    ("Askøy", "4627", 60.4667, 5.1833, 30000, "Vestland"),
    ("Fjell", "4628", 60.3500, 5.0833, 26000, "Vestland"),
    ("Os", "4635", 60.1833, 5.4667, 20000, "Vestland"),
    ("Stord", "4617", 59.7833, 5.5000, 19000, "Vestland"),
    ("Førde", "4649", 61.4528, 5.8514, 13500, "Vestland"),
    
    # Møre og Romsdal
    ("Ålesund", "1507", 62.4722, 6.1549, 67000, "Møre og Romsdal"),
    ("Molde", "1506", 62.7378, 7.1611, 32000, "Møre og Romsdal"),
    ("Kristiansund", "1505", 63.1106, 7.7281, 24500, "Møre og Romsdal"),
    
    # Trøndelag
    ("Trondheim", "5001", 63.4305, 10.3951, 210000, "Trøndelag"),
    ("Stjørdal", "5035", 63.4667, 10.9167, 24500, "Trøndelag"),
    ("Steinkjer", "5006", 64.0147, 11.4953, 24000, "Trøndelag"),
    ("Levanger", "5037", 63.7500, 11.3000, 20500, "Trøndelag"),
    ("Verdal", "5038", 63.7833, 11.4833, 15500, "Trøndelag"),
    ("Namsos", "5007", 64.4667, 11.5000, 13500, "Trøndelag"),
    
    # Nordland
    ("Bodø", "1804", 67.2804, 14.4049, 53000, "Nordland"),
    ("Rana", "1833", 66.3167, 14.1667, 26500, "Nordland"),
    ("Narvik", "1806", 68.4386, 17.4272, 22000, "Nordland"),
    ("Vefsn", "1824", 65.8333, 13.2000, 13500, "Nordland"),
    
    # Troms og Finnmark
    ("Tromsø", "5401", 69.6489, 18.9551, 78000, "Troms og Finnmark"),
    ("Harstad", "5402", 68.7983, 16.5417, 25000, "Troms og Finnmark"),
    ("Alta", "5403", 69.9689, 23.2717, 21000, "Troms og Finnmark"),
    ("Hammerfest", "5405", 70.6634, 23.6821, 11500, "Troms og Finnmark"),
    ("Kirkenes", "5444", 69.7272, 30.0456, 3500, "Troms og Finnmark"),
]


class Command(BaseCommand):
    help = 'Import Danish and Norwegian municipalities into the Location model'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing locations for selected countries before import',
        )
        parser.add_argument(
            '--country',
            type=str,
            choices=['DK', 'NO', 'all'],
            default='all',
            help='Which country to import (DK, NO, or all)',
        )
    
    def handle(self, *args, **options):
        country = options['country']
        
        if options['clear']:
            if country == 'all' or country == 'DK':
                self.stdout.write('Clearing existing Danish locations...')
                Location.objects.filter(country='DK').delete()
            if country == 'all' or country == 'NO':
                self.stdout.write('Clearing existing Norwegian locations...')
                Location.objects.filter(country='NO').delete()
        
        created_count = 0
        updated_count = 0
        
        # Import Danish municipalities
        if country == 'all' or country == 'DK':
            self.stdout.write(f'\nImporting {len(DANISH_MUNICIPALITIES)} Danish municipalities...')
            
            for name, code, lat, lng, population, region in DANISH_MUNICIPALITIES:
                base_slug = slugify(name)
                
                # Handle potential duplicate slugs within Denmark
                existing = Location.objects.filter(slug=base_slug, country='DK').exclude(official_code=code).first()
                if existing:
                    slug = f"{base_slug}-{code}"
                else:
                    slug = base_slug
                
                obj, created = Location.objects.update_or_create(
                    official_code=code,
                    country='DK',
                    defaults={
                        'name': name,
                        'name_genitive': self._get_danish_genitive(name),
                        'slug': slug,
                        'latitude': lat,
                        'longitude': lng,
                        'population': population,
                        'region': region,
                        'location_type': 'MUNICIPALITY',
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
            
            self.stdout.write(self.style.SUCCESS(f'Danish import complete!'))
        
        # Import Norwegian municipalities
        if country == 'all' or country == 'NO':
            self.stdout.write(f'\nImporting {len(NORWEGIAN_MUNICIPALITIES)} Norwegian municipalities...')
            
            for name, code, lat, lng, population, region in NORWEGIAN_MUNICIPALITIES:
                base_slug = slugify(name)
                
                # Handle potential duplicate slugs within Norway
                existing = Location.objects.filter(slug=base_slug, country='NO').exclude(official_code=code).first()
                if existing:
                    slug = f"{base_slug}-{code}"
                else:
                    slug = base_slug
                
                obj, created = Location.objects.update_or_create(
                    official_code=code,
                    country='NO',
                    defaults={
                        'name': name,
                        'name_genitive': self._get_norwegian_genitive(name),
                        'slug': slug,
                        'latitude': lat,
                        'longitude': lng,
                        'population': population,
                        'region': region,
                        'location_type': 'MUNICIPALITY',
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
            
            self.stdout.write(self.style.SUCCESS(f'Norwegian import complete!'))
        
        self.stdout.write(self.style.SUCCESS(
            f'\nTotal: Created: {created_count}, Updated: {updated_count}'
        ))
        
        # Print summary by country
        self.stdout.write('\nLocations by country:')
        from django.db.models import Count
        countries = Location.objects.values('country').annotate(count=Count('id'))
        for c in countries:
            country_name = dict(Location._meta.get_field('country').choices).get(c['country'], c['country'])
            self.stdout.write(f"  {country_name}: {c['count']} locations")
    
    def _get_danish_genitive(self, name):
        """Generate Danish genitive form (add 's' unless ends in s/x/z)."""
        if name.endswith(('s', 'x', 'z')):
            return name
        return f"{name}s"
    
    def _get_norwegian_genitive(self, name):
        """Generate Norwegian genitive form (add 's' unless ends in s/x/z)."""
        if name.endswith(('s', 'x', 'z')):
            return name
        return f"{name}s"

