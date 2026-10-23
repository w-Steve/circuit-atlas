# World land geometry
Natural Earth 1:110m land is public domain.
Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
Terms: https://www.naturalearthdata.com/about/terms-of-use/
Checked: 2026-10-23.
Derived src/assets/world-land.json clips latitudes to -60..82 degrees and
simplifies shorelines by 0.16 degrees for a small offline world overview.
Equirectangular projection; no country borders, inferred terrain or seat data.
Circuit anchors come from each existing circuit's start/finish geometry.
Calendar weekends are a verified offline snapshot of
https://www.formula1.com/en/racing/2026 (checked 2026-10-23).
