# GEDTM30 v1.2.0 elevation extracts

Yufeng Ho and Tom Hengl, OpenGeoHub, Global Ensemble Digital Terrain Model 30m
(GEDTM30), v1.2.0, published 6 March 2026.

Source: https://zenodo.org/records/18887460
Methods: https://doi.org/10.7717/peerj.19673
License: Creative Commons Attribution 4.0 International (CC BY 4.0)
https://creativecommons.org/licenses/by/4.0/

Changes: local 65x65 bilinear extracts of the native 1-arc-second (~30m)
Float32 ground elevation raster for all 23 current circuit models. Values are in metres.
The app subtracts a local reference altitude and makes downward display-only
cuts at roads and stand foundations; source grids remain unchanged. Shanghai's
estimated road uses periodic Gaussian distance smoothing (sigma 45m), without
vertical scaling. A local cut/fill transition connects this estimate to the native
ground; this earthwork envelope is approximate, not a measured embankment.

These are modelled regional ground estimates, not surveyed track, bridge,
stand or tunnel heights. Previous SRTM v3 extraction metadata remains in the
coverage record; it is not used to render the current Shanghai terrain.

Distribution mirror for the additional 20 extracts:
https://portal.opentopography.org/datasetMetadata?otCollectionID=OT.082025.4326.1
https://opentopography.s3.sdsc.edu/raster/GEDTM30/
The native Monaco and Singapore windows were compared byte-for-byte with the
previous publisher extracts before using this mirror. No TLS validation was disabled.
