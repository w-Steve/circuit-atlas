Processed GSI numerical elevation tiles for Suzuka

Source: Geospatial Information Authority of Japan (GSI), Japan.
地理院タイル（標高タイル）を加工して作成。
https://maps.gsi.go.jp/development/ichiran.html
https://maps.gsi.go.jp/development/demtile.html

Public Data License 1.0 (PDL1.0), with the GSI source-credit and processing terms:
https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html
The numerical elevation tiles are listed among data usable with source credit;
they are not the standard cartographic image tiles.

Changes made by this independent project: decoded signed 24-bit RGB elevation
values in metres; retained a 598x385 native numeric window at zoom 15. Missing
DEM5A (nominal 5m airborne-laser source) cells are filled only from valid DEM10B
(nominal 10m contour source) at zoom 14, with a retained fallback mask. Bilinear
pixel-centre resampling to a south-to-north 321x321 geographic grid. Output
spacing about 7.3m east-west and 4.7m north-south does not improve source
resolution. The mixed product is labelled conservatively as 10m. Rendering
subtracts a local reference altitude and applies documented display cuts at
roads and foundations. No height exaggeration or visibility-fitted offsets.

Tile bytes were checked on 2026-10-25. Distribution timestamps are not survey
dates. These are regional ground estimates, not certified 2026 bridge decks,
stand terraces, road engineering or ticket-area boundaries. This processed
model was created by the project, not by GSI, and carries no GSI endorsement.
Original map imagery, official artwork and institutional logos are not bundled.
