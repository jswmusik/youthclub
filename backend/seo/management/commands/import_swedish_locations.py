# backend/seo/management/commands/import_swedish_locations.py
"""
Management command to import Swedish municipalities and major cities.

Sweden has 290 municipalities (kommuner) and 21 regions (län).
This command populates the SwedishLocation model with all of them,
including coordinates and population data.

Usage:
    python manage.py import_swedish_locations
    python manage.py import_swedish_locations --clear  # Clear existing first
"""

from django.core.management.base import BaseCommand
from seo.models import SwedishLocation


# =============================================================================
# SWEDISH MUNICIPALITIES DATA
# =============================================================================

# All 290 Swedish municipalities with approximate center coordinates
# Format: (name, scb_code, lat, lng, population, region, region_code)
# Population data from SCB 2024
MUNICIPALITIES = [
    # Stockholm County (Stockholms län) - Code 01
    ("Stockholm", "0180", 59.3293, 18.0686, 984748, "Stockholms län", "01"),
    ("Huddinge", "0126", 59.2373, 17.9817, 115818, "Stockholms län", "01"),
    ("Nacka", "0182", 59.3108, 18.1636, 112320, "Stockholms län", "01"),
    ("Södertälje", "0181", 59.1955, 17.6253, 100510, "Stockholms län", "01"),
    ("Botkyrka", "0127", 59.2000, 17.8167, 96078, "Stockholms län", "01"),
    ("Haninge", "0136", 59.1667, 18.1333, 95432, "Stockholms län", "01"),
    ("Järfälla", "0123", 59.4333, 17.8333, 82645, "Stockholms län", "01"),
    ("Sollentuna", "0163", 59.4333, 17.9500, 77104, "Stockholms län", "01"),
    ("Täby", "0160", 59.4333, 18.0833, 75621, "Stockholms län", "01"),
    ("Upplands Väsby", "0114", 59.5167, 17.9167, 49524, "Stockholms län", "01"),
    ("Tyresö", "0138", 59.2500, 18.2333, 49305, "Stockholms län", "01"),
    ("Österåker", "0117", 59.4833, 18.3000, 48267, "Stockholms län", "01"),
    ("Vallentuna", "0115", 59.5333, 18.0833, 36642, "Stockholms län", "01"),
    ("Sigtuna", "0191", 59.6167, 17.7167, 51876, "Stockholms län", "01"),
    ("Norrtälje", "0188", 59.7583, 18.7042, 66134, "Stockholms län", "01"),
    ("Värmdö", "0120", 59.3167, 18.5500, 47483, "Stockholms län", "01"),
    ("Lidingö", "0186", 59.3667, 18.1500, 49482, "Stockholms län", "01"),
    ("Ekerö", "0125", 59.2833, 17.8000, 29954, "Stockholms län", "01"),
    ("Solna", "0184", 59.3600, 18.0000, 85611, "Stockholms län", "01"),
    ("Sundbyberg", "0183", 59.3667, 17.9667, 55115, "Stockholms län", "01"),
    ("Salem", "0128", 59.2000, 17.7833, 17810, "Stockholms län", "01"),
    ("Nykvarn", "0140", 59.1833, 17.4333, 12643, "Stockholms län", "01"),
    ("Danderyd", "0162", 59.4000, 18.0333, 34165, "Stockholms län", "01"),
    ("Nynäshamn", "0192", 58.9000, 17.9500, 30028, "Stockholms län", "01"),
    ("Vaxholm", "0187", 59.4000, 18.3500, 12674, "Stockholms län", "01"),
    ("Upplands-Bro", "0139", 59.5000, 17.6333, 31155, "Stockholms län", "01"),
    
    # Uppsala County (Uppsala län) - Code 03
    ("Uppsala", "0380", 59.8585, 17.6389, 239626, "Uppsala län", "03"),
    ("Enköping", "0381", 59.6333, 17.0833, 49142, "Uppsala län", "03"),
    ("Östhammar", "0382", 60.2500, 18.3667, 23176, "Uppsala län", "03"),
    ("Tierp", "0360", 60.3500, 17.5167, 21757, "Uppsala län", "03"),
    ("Älvkarleby", "0319", 60.5667, 17.4500, 9585, "Uppsala län", "03"),
    ("Knivsta", "0330", 59.7167, 17.7833, 21108, "Uppsala län", "03"),
    ("Heby", "0331", 60.0000, 16.8667, 14294, "Uppsala län", "03"),
    ("Håbo", "0305", 59.5333, 17.5333, 23028, "Uppsala län", "03"),
    
    # Södermanland County - Code 04
    ("Eskilstuna", "0484", 59.3667, 16.5000, 109034, "Södermanlands län", "04"),
    ("Nyköping", "0480", 58.7500, 17.0000, 59085, "Södermanlands län", "04"),
    ("Strängnäs", "0486", 59.3833, 17.0333, 39339, "Södermanlands län", "04"),
    ("Katrineholm", "0483", 59.0000, 16.2000, 36219, "Södermanlands län", "04"),
    ("Flen", "0482", 59.0667, 16.5833, 16908, "Södermanlands län", "04"),
    ("Oxelösund", "0481", 58.6667, 17.1000, 12454, "Södermanlands län", "04"),
    ("Vingåker", "0428", 59.0500, 15.8667, 8954, "Södermanlands län", "04"),
    ("Gnesta", "0461", 59.0500, 17.3167, 11893, "Södermanlands län", "04"),
    ("Trosa", "0488", 58.8833, 17.5500, 13905, "Södermanlands län", "04"),
    
    # Östergötland County - Code 05
    ("Linköping", "0580", 58.4108, 15.6214, 167637, "Östergötlands län", "05"),
    ("Norrköping", "0581", 58.5942, 16.1826, 145882, "Östergötlands län", "05"),
    ("Motala", "0583", 58.5333, 15.0333, 44454, "Östergötlands län", "05"),
    ("Mjölby", "0586", 58.3333, 15.1333, 28878, "Östergötlands län", "05"),
    ("Finspång", "0562", 58.7000, 15.7667, 22698, "Östergötlands län", "05"),
    ("Vadstena", "0584", 58.4500, 14.8833, 7436, "Östergötlands län", "05"),
    ("Åtvidaberg", "0561", 58.2000, 16.0000, 11775, "Östergötlands län", "05"),
    ("Kinda", "0513", 58.0000, 15.6333, 10174, "Östergötlands län", "05"),
    ("Boxholm", "0560", 58.2000, 15.0500, 5731, "Östergötlands län", "05"),
    ("Ödeshög", "0509", 58.2167, 14.6500, 5585, "Östergötlands län", "05"),
    ("Söderköping", "0582", 58.4833, 16.3167, 15306, "Östergötlands län", "05"),
    ("Valdemarsvik", "0563", 58.2000, 16.6000, 7939, "Östergötlands län", "05"),
    ("Ydre", "0512", 57.8500, 15.2667, 3810, "Östergötlands län", "05"),
    
    # Jönköping County - Code 06
    ("Jönköping", "0680", 57.7826, 14.1618, 147136, "Jönköpings län", "06"),
    ("Värnamo", "0683", 57.1833, 14.0333, 35571, "Jönköpings län", "06"),
    ("Nässjö", "0682", 57.6500, 14.6833, 32833, "Jönköpings län", "06"),
    ("Vetlanda", "0685", 57.4333, 15.0833, 27977, "Jönköpings län", "06"),
    ("Gislaved", "0662", 57.3000, 13.5333, 30407, "Jönköpings län", "06"),
    ("Tranås", "0687", 58.0333, 14.9667, 19348, "Jönköpings län", "06"),
    ("Eksjö", "0686", 57.6667, 14.9667, 17569, "Jönköpings län", "06"),
    ("Sävsjö", "0684", 57.4000, 14.6667, 11733, "Jönköpings län", "06"),
    ("Vaggeryd", "0665", 57.5000, 14.1333, 14782, "Jönköpings län", "06"),
    ("Aneby", "0604", 57.8333, 14.8000, 7093, "Jönköpings län", "06"),
    ("Gnosjö", "0617", 57.3500, 13.7333, 10447, "Jönköpings län", "06"),
    ("Mullsjö", "0642", 57.9167, 13.8833, 7505, "Jönköpings län", "06"),
    ("Habo", "0643", 57.9167, 14.0833, 12778, "Jönköpings län", "06"),
    
    # Kronoberg County - Code 07
    ("Växjö", "0780", 56.8789, 14.8059, 97798, "Kronobergs län", "07"),
    ("Ljungby", "0781", 56.8333, 13.9333, 29525, "Kronobergs län", "07"),
    ("Älmhult", "0765", 56.5500, 14.1333, 17682, "Kronobergs län", "07"),
    ("Alvesta", "0764", 56.9000, 14.5500, 21021, "Kronobergs län", "07"),
    ("Tingsryd", "0763", 56.5333, 14.9667, 12580, "Kronobergs län", "07"),
    ("Uppvidinge", "0760", 57.0833, 15.7500, 9629, "Kronobergs län", "07"),
    ("Lessebo", "0761", 56.7500, 15.2667, 8904, "Kronobergs län", "07"),
    ("Markaryd", "0767", 56.4500, 13.5833, 10283, "Kronobergs län", "07"),
    
    # Kalmar County - Code 08
    ("Kalmar", "0880", 56.6634, 16.3566, 72841, "Kalmar län", "08"),
    ("Västervik", "0883", 57.7500, 16.6333, 37875, "Kalmar län", "08"),
    ("Oskarshamn", "0882", 57.2667, 16.4500, 28055, "Kalmar län", "08"),
    ("Nybro", "0881", 56.7333, 15.9000, 20826, "Kalmar län", "08"),
    ("Vimmerby", "0884", 57.6667, 15.8500, 16232, "Kalmar län", "08"),
    ("Hultsfred", "0860", 57.4833, 15.8500, 14373, "Kalmar län", "08"),
    ("Mörbylånga", "0840", 56.5167, 16.3833, 16170, "Kalmar län", "08"),
    ("Emmaboda", "0862", 56.6333, 15.5333, 9551, "Kalmar län", "08"),
    ("Mönsterås", "0861", 57.0500, 16.4500, 13789, "Kalmar län", "08"),
    ("Torsås", "0834", 56.4167, 16.0000, 7365, "Kalmar län", "08"),
    ("Borgholm", "0885", 56.8833, 16.6500, 11286, "Kalmar län", "08"),
    ("Högsby", "0821", 57.1667, 16.0333, 5919, "Kalmar län", "08"),
    
    # Gotland County - Code 09
    ("Gotland", "0980", 57.6348, 18.2948, 61005, "Gotlands län", "09"),
    
    # Blekinge County - Code 10
    ("Karlskrona", "1080", 56.1612, 15.5869, 67138, "Blekinge län", "10"),
    ("Karlshamn", "1082", 56.1667, 14.8500, 33382, "Blekinge län", "10"),
    ("Ronneby", "1081", 56.2000, 15.2833, 30182, "Blekinge län", "10"),
    ("Sölvesborg", "1083", 56.0500, 14.5833, 18279, "Blekinge län", "10"),
    ("Olofström", "1060", 56.2833, 14.5333, 14002, "Blekinge län", "10"),
    
    # Skåne County - Code 12
    ("Malmö", "1280", 55.6050, 13.0038, 357377, "Skåne län", "12"),
    ("Helsingborg", "1283", 56.0465, 12.6945, 152761, "Skåne län", "12"),
    ("Lund", "1281", 55.7047, 13.1910, 130730, "Skåne län", "12"),
    ("Kristianstad", "1290", 56.0294, 14.1567, 86889, "Skåne län", "12"),
    ("Landskrona", "1282", 55.8708, 12.8303, 48126, "Skåne län", "12"),
    ("Trelleborg", "1287", 55.3758, 13.1569, 47591, "Skåne län", "12"),
    ("Ängelholm", "1292", 56.2500, 12.8500, 44992, "Skåne län", "12"),
    ("Ystad", "1286", 55.4333, 13.8167, 31268, "Skåne län", "12"),
    ("Eslöv", "1285", 55.8333, 13.3000, 35161, "Skåne län", "12"),
    ("Hässleholm", "1293", 56.1667, 13.7667, 55211, "Skåne län", "12"),
    ("Höganäs", "1284", 56.2000, 12.5500, 27906, "Skåne län", "12"),
    ("Staffanstorp", "1230", 55.6333, 13.2000, 26336, "Skåne län", "12"),
    ("Vellinge", "1233", 55.4667, 13.0167, 38611, "Skåne län", "12"),
    ("Kävlinge", "1261", 55.7833, 13.1000, 34067, "Skåne län", "12"),
    ("Lomma", "1262", 55.6667, 13.0667, 26704, "Skåne län", "12"),
    ("Svedala", "1263", 55.5000, 13.2333, 23156, "Skåne län", "12"),
    ("Skurup", "1264", 55.4667, 13.5000, 16527, "Skåne län", "12"),
    ("Sjöbo", "1265", 55.6333, 13.7000, 19874, "Skåne län", "12"),
    ("Hörby", "1266", 55.8500, 13.6667, 15935, "Skåne län", "12"),
    ("Höör", "1267", 55.9333, 13.5333, 17466, "Skåne län", "12"),
    ("Tomelilla", "1270", 55.5500, 14.0167, 14008, "Skåne län", "12"),
    ("Bromölla", "1272", 56.0667, 14.4667, 13360, "Skåne län", "12"),
    ("Osby", "1273", 56.3833, 13.9833, 13443, "Skåne län", "12"),
    ("Perstorp", "1275", 56.1333, 13.4000, 7609, "Skåne län", "12"),
    ("Klippan", "1276", 56.1333, 13.1333, 18188, "Skåne län", "12"),
    ("Åstorp", "1277", 56.1333, 12.9500, 16392, "Skåne län", "12"),
    ("Båstad", "1278", 56.4333, 12.8500, 15698, "Skåne län", "12"),
    ("Simrishamn", "1291", 55.5500, 14.3500, 20026, "Skåne län", "12"),
    ("Örkelljunga", "1257", 56.2833, 13.2833, 10611, "Skåne län", "12"),
    ("Bjuv", "1260", 56.0833, 12.9167, 16280, "Skåne län", "12"),
    ("Burlöv", "1231", 55.6333, 13.1000, 20252, "Skåne län", "12"),
    ("Östra Göinge", "1256", 56.2667, 14.1000, 15063, "Skåne län", "12"),
    
    # Halland County - Code 13
    ("Halmstad", "1380", 56.6745, 12.8578, 107630, "Hallands län", "13"),
    ("Varberg", "1383", 57.1167, 12.2500, 67645, "Hallands län", "13"),
    ("Kungsbacka", "1384", 57.4833, 12.0667, 87102, "Hallands län", "13"),
    ("Falkenberg", "1382", 56.9000, 12.4833, 47209, "Hallands län", "13"),
    ("Laholm", "1381", 56.5167, 13.0500, 26544, "Hallands län", "13"),
    ("Hylte", "1315", 56.9333, 13.2333, 11178, "Hallands län", "13"),
    
    # Västra Götaland County - Code 14
    ("Göteborg", "1480", 57.7089, 11.9746, 594446, "Västra Götalands län", "14"),
    ("Borås", "1490", 57.7210, 12.9401, 116156, "Västra Götalands län", "14"),
    ("Trollhättan", "1488", 58.2833, 12.2833, 61030, "Västra Götalands län", "14"),
    ("Skövde", "1496", 58.3833, 13.8500, 59025, "Västra Götalands län", "14"),
    ("Uddevalla", "1485", 58.3500, 11.9333, 59036, "Västra Götalands län", "14"),
    ("Lidköping", "1494", 58.5000, 13.1667, 42055, "Västra Götalands län", "14"),
    ("Mölndal", "1481", 57.6500, 12.0167, 71168, "Västra Götalands län", "14"),
    ("Alingsås", "1489", 57.9333, 12.5333, 43629, "Västra Götalands län", "14"),
    ("Kungälv", "1482", 57.8667, 11.9667, 49973, "Västra Götalands län", "14"),
    ("Vänersborg", "1487", 58.3833, 12.3333, 41773, "Västra Götalands län", "14"),
    ("Mariestad", "1493", 58.7000, 13.8167, 25968, "Västra Götalands län", "14"),
    ("Lerum", "1441", 57.7667, 12.2667, 45058, "Västra Götalands län", "14"),
    ("Partille", "1402", 57.7333, 12.1000, 41421, "Västra Götalands län", "14"),
    ("Stenungsund", "1415", 58.0667, 11.8167, 28932, "Västra Götalands län", "14"),
    ("Falköping", "1499", 58.1833, 13.5500, 34283, "Västra Götalands län", "14"),
    ("Härryda", "1401", 57.6667, 12.2500, 41714, "Västra Götalands län", "14"),
    ("Mark", "1463", 57.5333, 12.4667, 35920, "Västra Götalands län", "14"),
    ("Lysekil", "1484", 58.2667, 11.4333, 14811, "Västra Götalands län", "14"),
    ("Strömstad", "1486", 58.9333, 11.1667, 13762, "Västra Götalands län", "14"),
    ("Tjörn", "1419", 57.9833, 11.5333, 16301, "Västra Götalands län", "14"),
    ("Orust", "1421", 58.1833, 11.6167, 15848, "Västra Götalands län", "14"),
    ("Sotenäs", "1427", 58.4500, 11.3167, 9488, "Västra Götalands län", "14"),
    ("Munkedal", "1430", 58.4667, 11.6667, 10762, "Västra Götalands län", "14"),
    ("Tanum", "1435", 58.7167, 11.3167, 13210, "Västra Götalands län", "14"),
    ("Dals-Ed", "1438", 58.8500, 11.9167, 4866, "Västra Götalands län", "14"),
    ("Färgelanda", "1439", 58.5667, 12.1333, 6851, "Västra Götalands län", "14"),
    ("Ale", "1440", 57.9500, 12.2333, 32879, "Västra Götalands län", "14"),
    ("Lilla Edet", "1462", 58.1333, 12.1167, 14393, "Västra Götalands län", "14"),
    ("Öckerö", "1407", 57.7000, 11.6667, 12938, "Västra Götalands län", "14"),
    ("Vara", "1470", 58.2667, 13.1167, 16410, "Västra Götalands län", "14"),
    ("Götene", "1471", 58.5333, 13.4833, 13806, "Västra Götalands län", "14"),
    ("Tibro", "1472", 58.4167, 14.1500, 11442, "Västra Götalands län", "14"),
    ("Töreboda", "1473", 58.7000, 14.1167, 9547, "Västra Götalands län", "14"),
    ("Skara", "1495", 58.3833, 13.4333, 19927, "Västra Götalands län", "14"),
    ("Hjo", "1497", 58.3000, 14.2833, 9506, "Västra Götalands län", "14"),
    ("Tidaholm", "1498", 58.1833, 13.9500, 13054, "Västra Götalands län", "14"),
    ("Karlsborg", "1446", 58.5333, 14.5000, 7191, "Västra Götalands län", "14"),
    ("Gullspång", "1447", 58.9833, 14.0833, 5174, "Västra Götalands län", "14"),
    ("Tranemo", "1452", 57.4833, 13.3500, 11920, "Västra Götalands län", "14"),
    ("Bengtsfors", "1460", 58.9333, 12.2333, 10171, "Västra Götalands län", "14"),
    ("Mellerud", "1461", 58.7000, 12.4500, 9564, "Västra Götalands län", "14"),
    ("Åmål", "1492", 59.0500, 12.7000, 12965, "Västra Götalands län", "14"),
    ("Grästorp", "1444", 58.3333, 12.7000, 5932, "Västra Götalands län", "14"),
    ("Essunga", "1445", 58.2000, 12.9500, 5978, "Västra Götalands län", "14"),
    ("Herrljunga", "1466", 57.9833, 13.0333, 9754, "Västra Götalands län", "14"),
    ("Vårgårda", "1442", 57.9833, 12.8000, 12171, "Västra Götalands län", "14"),
    ("Bollebygd", "1443", 57.6667, 12.5667, 9905, "Västra Götalands län", "14"),
    ("Svenljunga", "1465", 57.4833, 13.1167, 11120, "Västra Götalands län", "14"),
    ("Ulricehamn", "1491", 57.8000, 13.4000, 25861, "Västra Götalands län", "14"),
    
    # Värmland County - Code 17
    ("Karlstad", "1780", 59.3793, 13.5036, 97428, "Värmlands län", "17"),
    ("Arvika", "1784", 59.6500, 12.5833, 26730, "Värmlands län", "17"),
    ("Kristinehamn", "1781", 59.3167, 14.1167, 25095, "Värmlands län", "17"),
    ("Hagfors", "1783", 60.0333, 13.6500, 11875, "Värmlands län", "17"),
    ("Filipstad", "1782", 59.7167, 14.1667, 10797, "Värmlands län", "17"),
    ("Sunne", "1766", 59.8333, 13.1333, 13551, "Värmlands län", "17"),
    ("Säffle", "1785", 59.1333, 12.9333, 16085, "Värmlands län", "17"),
    ("Hammarö", "1761", 59.3000, 13.5000, 17176, "Värmlands län", "17"),
    ("Grums", "1764", 59.3500, 13.1000, 9261, "Värmlands län", "17"),
    ("Forshaga", "1763", 59.5333, 13.4833, 11945, "Värmlands län", "17"),
    ("Kil", "1715", 59.5000, 13.3167, 12502, "Värmlands län", "17"),
    ("Eda", "1730", 59.8833, 12.2833, 8735, "Värmlands län", "17"),
    ("Torsby", "1737", 60.1333, 12.9833, 11697, "Värmlands län", "17"),
    ("Storfors", "1760", 59.5333, 14.2667, 4236, "Värmlands län", "17"),
    ("Munkfors", "1762", 59.8333, 13.5500, 3720, "Värmlands län", "17"),
    ("Årjäng", "1765", 59.4000, 12.1333, 10383, "Värmlands län", "17"),
    
    # Örebro County - Code 18
    ("Örebro", "1880", 59.2753, 15.2134, 162666, "Örebro län", "18"),
    ("Karlskoga", "1883", 59.3167, 14.5333, 31838, "Örebro län", "18"),
    ("Lindesberg", "1885", 59.5833, 15.2500, 24451, "Örebro län", "18"),
    ("Kumla", "1881", 59.1167, 15.1333, 23078, "Örebro län", "18"),
    ("Hallsberg", "1861", 59.0667, 15.1000, 16437, "Örebro län", "18"),
    ("Laxå", "1860", 58.9833, 14.6167, 5864, "Örebro län", "18"),
    ("Askersund", "1882", 58.8833, 14.9000, 11892, "Örebro län", "18"),
    ("Degerfors", "1862", 59.2333, 14.4333, 9704, "Örebro län", "18"),
    ("Nora", "1884", 59.5167, 15.0333, 11056, "Örebro län", "18"),
    ("Hällefors", "1863", 59.7833, 14.5167, 6920, "Örebro län", "18"),
    ("Ljusnarsberg", "1864", 59.9000, 14.8667, 4856, "Örebro län", "18"),
    ("Lekeberg", "1814", 59.1000, 14.9000, 8255, "Örebro län", "18"),
    
    # Västmanland County - Code 19
    ("Västerås", "1980", 59.6099, 16.5448, 158382, "Västmanlands län", "19"),
    ("Sala", "1981", 59.9167, 16.6000, 23500, "Västmanlands län", "19"),
    ("Köping", "1982", 59.5167, 15.9833, 26682, "Västmanlands län", "19"),
    ("Arboga", "1984", 59.3833, 15.8333, 14628, "Västmanlands län", "19"),
    ("Fagersta", "1982", 60.0000, 15.8000, 13622, "Västmanlands län", "19"),
    ("Hallstahammar", "1961", 59.6167, 16.2333, 17107, "Västmanlands län", "19"),
    ("Surahammar", "1907", 59.7000, 16.2167, 10517, "Västmanlands län", "19"),
    ("Kungsör", "1960", 59.4333, 16.1000, 8710, "Västmanlands län", "19"),
    ("Skinnskatteberg", "1904", 59.8333, 15.6833, 4596, "Västmanlands län", "19"),
    ("Norberg", "1962", 60.0667, 15.9333, 5883, "Västmanlands län", "19"),
    
    # Dalarna County - Code 20
    ("Falun", "2080", 60.6065, 15.6355, 60063, "Dalarnas län", "20"),
    ("Borlänge", "2081", 60.4833, 15.4167, 53746, "Dalarnas län", "20"),
    ("Mora", "2062", 61.0000, 14.5333, 21347, "Dalarnas län", "20"),
    ("Avesta", "2084", 60.1500, 16.1667, 23686, "Dalarnas län", "20"),
    ("Ludvika", "2085", 60.1500, 15.1833, 27519, "Dalarnas län", "20"),
    ("Leksand", "2029", 60.7333, 14.9833, 16242, "Dalarnas län", "20"),
    ("Rättvik", "2031", 60.8833, 15.1167, 11232, "Dalarnas län", "20"),
    ("Säter", "2082", 60.3500, 15.7500, 11534, "Dalarnas län", "20"),
    ("Hedemora", "2083", 60.2833, 15.9667, 15726, "Dalarnas län", "20"),
    ("Gagnef", "2026", 60.5833, 15.0833, 10652, "Dalarnas län", "20"),
    ("Malung-Sälen", "2023", 61.0000, 13.7167, 10436, "Dalarnas län", "20"),
    ("Orsa", "2034", 61.1167, 14.6167, 7213, "Dalarnas län", "20"),
    ("Älvdalen", "2039", 61.2167, 14.0333, 7186, "Dalarnas län", "20"),
    ("Vansbro", "2021", 60.8833, 14.3500, 6906, "Dalarnas län", "20"),
    ("Smedjebacken", "2061", 60.1333, 15.4167, 11091, "Dalarnas län", "20"),
    
    # Gävleborg County - Code 21
    ("Gävle", "2180", 60.6749, 17.1413, 104943, "Gävleborgs län", "21"),
    ("Sandviken", "2181", 60.6167, 16.7833, 40122, "Gävleborgs län", "21"),
    ("Hudiksvall", "2184", 61.7333, 17.1000, 38240, "Gävleborgs län", "21"),
    ("Söderhamn", "2182", 61.3000, 17.0667, 26339, "Gävleborgs län", "21"),
    ("Bollnäs", "2183", 61.3500, 16.3667, 27610, "Gävleborgs län", "21"),
    ("Ljusdal", "2161", 61.8333, 16.0833, 19353, "Gävleborgs län", "21"),
    ("Hofors", "2104", 60.5500, 16.2833, 9542, "Gävleborgs län", "21"),
    ("Ockelbo", "2101", 60.8833, 16.7167, 6103, "Gävleborgs län", "21"),
    ("Nordanstig", "2132", 62.0333, 17.0500, 9688, "Gävleborgs län", "21"),
    ("Ovanåker", "2121", 61.3500, 15.7000, 11874, "Gävleborgs län", "21"),
    
    # Västernorrland County - Code 22
    ("Sundsvall", "2281", 62.3908, 17.3069, 101755, "Västernorrlands län", "22"),
    ("Örnsköldsvik", "2284", 63.2833, 18.7167, 57035, "Västernorrlands län", "22"),
    ("Härnösand", "2280", 62.6333, 17.9333, 25897, "Västernorrlands län", "22"),
    ("Timrå", "2262", 62.4833, 17.3333, 18762, "Västernorrlands län", "22"),
    ("Sollefteå", "2283", 63.1667, 17.2667, 20103, "Västernorrlands län", "22"),
    ("Ånge", "2260", 62.5333, 15.6500, 9831, "Västernorrlands län", "22"),
    ("Kramfors", "2282", 62.9333, 17.8000, 18859, "Västernorrlands län", "22"),
    
    # Jämtland County - Code 23
    ("Östersund", "2380", 63.1792, 14.6357, 65450, "Jämtlands län", "23"),
    ("Åre", "2303", 63.4000, 13.0833, 12380, "Jämtlands län", "23"),
    ("Krokom", "2309", 63.3333, 14.4500, 15442, "Jämtlands län", "23"),
    ("Strömsund", "2313", 63.8333, 15.5500, 12014, "Jämtlands län", "23"),
    ("Berg", "2326", 62.5000, 14.5333, 7385, "Jämtlands län", "23"),
    ("Härjedalen", "2361", 62.0833, 14.1000, 10415, "Jämtlands län", "23"),
    ("Ragunda", "2321", 63.0833, 16.0000, 5431, "Jämtlands län", "23"),
    ("Bräcke", "2305", 62.7500, 15.4167, 6667, "Jämtlands län", "23"),
    
    # Västerbotten County - Code 24
    ("Umeå", "2480", 63.8258, 20.2630, 133117, "Västerbottens län", "24"),
    ("Skellefteå", "2482", 64.7500, 20.9500, 74216, "Västerbottens län", "24"),
    ("Lycksele", "2481", 64.5833, 18.6833, 12680, "Västerbottens län", "24"),
    ("Vindeln", "2460", 64.2000, 19.7167, 5465, "Västerbottens län", "24"),
    ("Robertsfors", "2409", 64.1833, 20.8333, 6842, "Västerbottens län", "24"),
    ("Nordmaling", "2401", 63.5667, 19.5000, 7452, "Västerbottens län", "24"),
    ("Vännäs", "2462", 63.9167, 19.7500, 9163, "Västerbottens län", "24"),
    ("Bjurholm", "2403", 63.9333, 19.2000, 2495, "Västerbottens län", "24"),
    ("Vilhelmina", "2462", 64.6167, 16.6500, 6943, "Västerbottens län", "24"),
    ("Åsele", "2463", 64.1667, 17.3333, 3033, "Västerbottens län", "24"),
    ("Dorotea", "2425", 64.2667, 16.4167, 2698, "Västerbottens län", "24"),
    ("Malå", "2417", 65.1833, 18.7500, 3209, "Västerbottens län", "24"),
    ("Storuman", "2421", 64.9667, 17.1167, 5985, "Västerbottens län", "24"),
    ("Sorsele", "2422", 65.5333, 17.5333, 2595, "Västerbottens län", "24"),
    ("Norsjö", "2418", 64.9167, 19.5000, 4220, "Västerbottens län", "24"),
    
    # Norrbotten County - Code 25
    ("Luleå", "2580", 65.5848, 22.1547, 81832, "Norrbottens län", "25"),
    ("Piteå", "2581", 65.3167, 21.4833, 43062, "Norrbottens län", "25"),
    ("Boden", "2582", 66.0000, 21.6833, 28764, "Norrbottens län", "25"),
    ("Kiruna", "2584", 67.8558, 20.2253, 22885, "Norrbottens län", "25"),
    ("Gällivare", "2583", 67.1333, 20.6500, 18093, "Norrbottens län", "25"),
    ("Kalix", "2514", 65.8500, 23.1500, 16495, "Norrbottens län", "25"),
    ("Haparanda", "2583", 65.8333, 24.1333, 10042, "Norrbottens län", "25"),
    ("Älvsbyn", "2560", 65.6833, 21.0000, 8376, "Norrbottens län", "25"),
    ("Arvidsjaur", "2505", 65.5833, 19.1833, 6384, "Norrbottens län", "25"),
    ("Jokkmokk", "2510", 66.6167, 19.8333, 5053, "Norrbottens län", "25"),
    ("Överkalix", "2513", 66.3333, 22.8333, 3447, "Norrbottens län", "25"),
    ("Övertorneå", "2518", 66.3833, 23.6500, 4560, "Norrbottens län", "25"),
    ("Pajala", "2521", 66.9667, 23.3667, 6089, "Norrbottens län", "25"),
    ("Arjeplog", "2506", 66.0500, 17.8833, 2906, "Norrbottens län", "25"),
]


class Command(BaseCommand):
    help = 'Import all Swedish municipalities and major cities into SwedishLocation model'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing locations before import',
        )
        parser.add_argument(
            '--link-municipalities',
            action='store_true',
            help='Try to link to existing platform municipalities by name',
        )
    
    def handle(self, *args, **options):
        from organization.models import Municipality
        
        if options['clear']:
            self.stdout.write('Clearing existing Swedish locations...')
            SwedishLocation.objects.all().delete()
        
        created_count = 0
        updated_count = 0
        linked_count = 0
        
        self.stdout.write(f'Importing {len(MUNICIPALITIES)} Swedish municipalities...')
        
        for name, scb_code, lat, lng, population, region, region_code in MUNICIPALITIES:
            # Generate unique slug using name and scb_code
            from django.utils.text import slugify
            base_slug = slugify(name)
            
            obj, created = SwedishLocation.objects.update_or_create(
                scb_code=scb_code,
                defaults={
                    'name': name,
                    'slug': f"{base_slug}-{scb_code}" if SwedishLocation.objects.filter(slug=base_slug).exclude(scb_code=scb_code).exists() else base_slug,
                    'latitude': lat,
                    'longitude': lng,
                    'population': population,
                    'region': region,
                    'region_code': region_code,
                    'location_type': 'MUNICIPALITY',
                }
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
            
            # Try to link to existing municipality
            if options['link_municipalities'] and not obj.linked_municipality:
                try:
                    municipality = Municipality.objects.get(name__iexact=name)
                    obj.linked_municipality = municipality
                    obj.save()
                    linked_count += 1
                    self.stdout.write(f'  Linked: {name}')
                except Municipality.DoesNotExist:
                    pass
                except Municipality.MultipleObjectsReturned:
                    self.stdout.write(self.style.WARNING(f'  Multiple matches for: {name}'))
        
        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Created: {created_count}, Updated: {updated_count}, Linked: {linked_count}'
        ))
        
        # Print summary by region
        self.stdout.write('\nLocations by region:')
        from django.db.models import Count
        regions = SwedishLocation.objects.values('region').annotate(
            count=Count('id')
        ).order_by('region')
        
        for r in regions:
            self.stdout.write(f"  {r['region']}: {r['count']}")

