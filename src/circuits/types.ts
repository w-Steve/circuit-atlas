export type Availability = "available" | "preparing";
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
  /** Close the estimated seating platform to the sampled terrain datum. */
  supportToTerrain?: boolean;
  geometryReview?: {checkedAt:string;issues:string[];method:string};
  surfaces?: {
    surfaceId: string;
    boundary: [number, number][];
    baseHeight: number;
    rise: number;
    eyeHeight: number;
    rows: number;
    /** Unseated public ground follows the source terrain, with baseHeight as
     * clearance above ground instead of a flat seating-bank elevation. */
    terrainFollow?:boolean;
    /** Maximum numbered row in a sourced permanent seating chart. Combined
     * blocks may have fewer rows; vertical riser remains an explicit estimate. */
    rowCountSource?: DataSource;
    rowRiserMetres?:number;
    /** Explicit ground anchor for the front floor. A building/roof centroid can
     * lie uphill from the actual seating bank; never use this as an eye offset. */
    groundReference?:{coordinate:[number,number];source:DataSource};
    /** Follow a curved row's local normal instead of the whole footprint PCA. */
    rowBearing?:'local-normal';
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
export interface CircuitFacilities {
  circuitId: string;
  buildings: {
    id:string; name:string; boundary:[number,number][]; heightMetres:number;
    heightEstimated:boolean; source:DataSource;
  }[];
  pitLanes:{id:string; coordinates:[number,number][]; widthMetres:number; underground?:boolean;
    /** Estimated road-width envelope trimmed to sourced garage boundaries.
     * Polygons contain outer ring followed by holes; centerline stays original. */
    surfaceBoundary?:[number,number][][][];source:DataSource}[];
  notes:string;
}
