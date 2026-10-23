# Pinned historical source

F1DB contributors, v2026.17.0 (2026-10-11), CC BY 4.0.
https://github.com/f1db/f1db/releases/tag/v2026.17.0

Downloaded release asset:
https://github.com/f1db/f1db/releases/download/v2026.17.0/f1db-json-splitted.zip
SHA256: 0f1717eaebae646b7ced9ca96f6be3282c1c1d435d0a9d75f2c00f40feb7d2a8
This matches the publisher's release checksum.

Only four JSON files and the complete license were retained, unchanged. See
src/atlas/provenance.json for individual file hashes. The release ZIP itself is
not redistributed. Data was retrieved through the task's explicit HTTP proxy;
no system proxy or TLS settings were changed.

Reproduce derived data offline from the retained files:

    python scripts/build-atlas.py

No Python or network service is required for the normal Node production build.
Historical dates/venues/layout IDs are compared against these source files in
tests/historical-atlas.test.ts. Source coordinates are location anchors, not a
historical circuit geometry, and no SVG layout assets are copied from F1DB.
