# Water boundaries and display levels

Water shoreline coordinates in src/circuits/water/ are derived from
© OpenStreetMap contributors, ODbL 1.0:
https://www.openstreetmap.org/copyright
https://opendatacommons.org/licenses/odbl/1-0/

Each feature retains original way/relation URLs. scripts/build-water.py clips
OSM water polygons and oriented coastlines to the terrain extent, retaining
island holes. Complete Singapore and Montreal relations supplement bbox extracts.
No external map artwork is included.

Water levels are display estimates, not surveyed 2026 water observations.
Ocean surfaces use an approximate 0 m datum; inland levels use the median of
GEDTM30 v1.2 source cells inside the water footprint (see GEDTM30 attribution).
Caspian offshore DEM cells are invalid for water level (about +1 m despite
the basin being below sea level). Baku uses -29.4 m, the regional 2025 level
reported by the Shirshov Institute of Oceanology, published 13 August 2026:
https://www.ocean.ru/en/index.php/novosti-instituta/1268-caspian-sea-day-why-the-unique-body-of-water-is-drying-up
This is an approximate visualization datum, not a Baku tide gauge observation;
vertical datum alignment and shoreline epoch differences remain uncertain.

Water masking affects only displayed terrain and contours. It does not alter
the source DEM, track deck, physical lap length, seat elevation or moving car.
