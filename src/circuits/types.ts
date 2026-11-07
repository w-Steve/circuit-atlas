export type Availability = "available" | "preparing";
export type SpectatorTier = 'lower'|'upper'|'platinum'|'trackside-t1'|'trackside-t20';
export interface DataSource {
  url: string;
  checkedAt: string;
  method: "published" | "extracted" | "estimated";
  confidence: "high" | "medium" | "low";
  notes: string;
}
export interface Corner {
  number: number;
  name?: string;
  coordinate: [number, number];
  source: DataSource;
}
export interface Elevation {
  attribution?:{label:string;url:string};
  status: "unavailable" | "partial" | "verified";
  samples: { fraction: number; metres: number }[];
  source?: DataSource;
  notes: string;
  /** Estimated road profile from a coarse DTM. Gaussian distance smoothing
   * suppresses unresolved pixel-scale bumps; never rescales vertical metres. */
  roadModel?: { smoothingSigmaMetres:number; source:DataSource };
  overpasses?: { upperIndex:number; lowerIndex:number; halfSpan:number; separationMetres:number; source:DataSource }[];
  grid?: {
    bounds: [number, number, number, number];
    size: number;
    heights: number[];
    referenceAltitude: number;
    resolutionMetres: number;
  };
}
export interface SpectatorZone {
  zoneId: string;
  name: string;
  /** Verified product identity is distinct from surveyed seating geometry. */
  ticketCodes?:string[];
  identitySource?:DataSource;
  kind: "grandstand" | "grass" | "general-admission";
  availability: Availability;
  boundary: [number, number][];
  surface: {
    baseHeight: number;
    rise: number;
    depth: number;
    eyeHeight: number;
  };
  source: DataSource;
  openingSource?: DataSource;
  surfaceSource?: DataSource;
  description?: string;
  /** Eligibility information needed when choosing a restricted public area. */
  admissionNote?:string;
  requiredBarrierIds?:string[];
  /** Source-informed starting position only; continuous picking remains unrestricted. */
  defaultViewpoint?: {surfaceId:string;coordinate:[number,number];source:DataSource};
  /** Close the estimated seating platform to the sampled terrain datum. */
  supportToTerrain?: boolean;
  passRangeMetres?:[number,number];
  mapLabelPosition?:[number,number,number];
  geometryReview?: {checkedAt:string;issues:string[];method:string};
  surfaces?: {
    surfaceId: string;
    boundary: [number, number][];
    baseHeight: number;
    rise: number;
    /** Authored seated-eye height. Public ground uses the shared1.65m standing
     * rule; legacy factual packages can retain their original seated preset. */
    eyeHeight: number;
    rows: number;
    /** Approximate overhead structure, never part of the eye-height formula. */
    canopy?: {rearClearanceMetres:number;crownMetres:number;postWidthMetres:number;supportU:number[];supportEdges:[[number,number],[number,number]];coverageStartV?:number;source:DataSource};
    /** Optional metre-based steps from an explicit straight front. Rows/rise
     * are maximum bounds; shallow sections end sooner at the source footprint. */
    rowPitch?:{treadMetres:number;riserMetres:number;source:DataSource};
    tier?:SpectatorTier;
    rowDirection?:[number,number];
    absoluteBase?:boolean;
    fenceMode?:'authored';
    visualRows?:number;
    viewTargetFrame?:{origin:[number,number,number];along:[number,number];length:number};
    /** Unseated public ground follows the source terrain, with baseHeight as
     * clearance above ground instead of a flat seating-bank elevation. */
    terrainFollow?:boolean;
    /** Optional maximum ground triangle edge in metres; defaults to8m. */
    terrainMeshSpacingMetres?:number;
    /** Optional organizer-identified road for ground between nearby branches.
     * This selects a road identity, never a ray-tested visible viewpoint. */
    viewRoadReference?:{coordinate:[number,number];source:DataSource};
    /** Maximum numbered row in a sourced permanent seating chart. Combined
     * blocks may have fewer rows; vertical riser remains an explicit estimate. */
    rowCountSource?: DataSource;
    rowRiserMetres?:number;
    /** Explicit ground anchor for the front floor. A building/roof centroid can
     * lie uphill from the actual seating bank; never use this as an eye offset. */
    groundReference?:{coordinate:[number,number];source:DataSource};
    /** Earth-supported bank grade from independent front/rear terrain anchors.
     * Numbered rows are discretized over that grade; not a surveyed riser. */
    terrainRiseReference?:{coordinate:[number,number];source:DataSource};
    /** Follow a curved row's local normal instead of the whole footprint PCA. */
    rowBearing?:'local-normal';
    /** Paired original front/back bend vertices; continuous rows across joins. */
    rowStrip?:{front:[number,number][];back:[number,number][];source:DataSource};
    /** A verified straight seating front, independent of an irregular rear
     * footprint. Coordinates must identify one original boundary edge. */
    rowFrontEdge?:{coordinates:[[number,number],[number,number]];source:DataSource};
    frontRailing?:{heightMetres:number;source:DataSource};
    /** Geographic road reference across the seating face; not the nearest road end. */
    frontReference?: [number,number];
    /** Upper-tier front floor, relative to a lower tier's back floor.
     * This is a structural datum, not an eye-height or visibility adjustment. */
    baseReference?: {zoneId:string;surfaceId:string;offsetMetres:number;source:DataSource};
  }[];
}
export interface CircuitSummary {
  circuitId: string;
  name: string;
  country: string;
  location: string;
  season: 2026;
  round: number;
  grandPrix: string;
  lengthMetres: number;
  cornerCount: number;
  mapAvailability: Availability;
  simulationAvailability: Availability;
  dataSources: DataSource[];
  spectatorZoneIds?: string[];
}
export interface CircuitPackage extends CircuitSummary {
  barriers?:CircuitBarrierPackage;
  /** Retired region links may resolve to an existing, accepted physical region. */
  spectatorZoneAliases?:Record<string,string>;
  scene?:CircuitSceneData;
  timing?:CircuitTiming;
  water?: CircuitWater;
  facilities?: CircuitFacilities;
  trackGeometry: {
    coordinates: [number, number][];
    direction: "clockwise" | "counterclockwise";
    widthMetres: number;
    widthSource: DataSource;
  };
  corners: Corner[];
  elevation: Elevation;
  pitLocation: { coordinate: [number, number]; source: DataSource } | null;
  spectatorZones: SpectatorZone[];
  validation: {
    layout: "verified" | "pending";
    corners: "verified" | "pending";
  };
}
export interface CircuitSceneData {
 foundations:{base:number;ring:{x:number;z:number}[]}[];
 boxes:{position:[number,number,number];rotation:number;size:[number,number,number];color:string}[];
 wireMeshes:{origin:[number,number,number];along:[number,number];normal:[number,number];start:number;end:number;offset:number;height:number}[];
 cylinders:{position:[number,number,number];radius:number;height:number;color:string}[];
 regions?:{zoneId:string;tier:SpectatorTier;label:string;selectionLabel:string;surfaceId:string;uRange:[number,number];vRange:[number,number]}[];
 landmarks?:{label:string;measurementLabel:string;role:'pit';position:[number,number,number];labelPosition:[number,number,number]}[];
 source:DataSource;
}
export interface CircuitTiming {
 circuitId:string;sourceSeason:number;pdfSha256:string;mapPage:number;mapSize:[number,number];
 cornerLabels:{number:number;point:[number,number]}[];
 diagramMarks:{start:[number,number];control:[number,number]};
 sectorLengthsMetres:[number,number,number]|null;
 splitAnchors:[TimingAnchor,TimingAnchor];
 source:DataSource;
}
export interface TimingAnchor{corner:number;offsetMetres:number;reference?:'entry';diagramPoint?:[number,number]}
export interface CircuitWater {
  circuitId:string;
  checkedAt:string;
  license:string;
  notes:string;
  features:{id:string;kind:'sea'|'inland';rings:[number,number][][];altitudeMetres:number;levelEstimated:boolean;levelSource:string;levelMethod?:string;hydrologySource?:string;sources:string[]}[];
}
export interface CircuitBarrier {
  id:string;kind:'chain-link'|'concrete-wall';coordinates:[number,number][];
  heightMetres:number;widthMetres?:number;source:DataSource;
}
export interface CircuitBarrierPackage {circuitId:string;availability?:Availability;barriers:CircuitBarrier[];notes:string}
export interface CircuitFacilities {
  circuitId: string;
  /** Sourced ground-level barriers. No implicit road relocation or height guess. */
  barriers?:CircuitBarrier[];
  buildings: {
    id:string; name:string; boundary:[number,number][]; heightMetres:number;
    foundationToTerrain?:boolean;
    heightEstimated:boolean; source:DataSource;
  }[];
  pitLanes:{id:string; coordinates:[number,number][]; widthMetres:number; underground?:boolean;
    /** Vertical-only DEM draping; preserves the source horizontal envelope. */
    terrainMeshSpacingMetres?:number;
    /** Estimated road-width envelope trimmed to sourced garage boundaries.
     * Polygons contain outer ring followed by holes; centerline stays original. */
    surfaceBoundary?:[number,number][][][];source:DataSource}[];
  notes:string;
}
