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
  kind: "grandstand" | "grass";
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
    /** Geographic road reference across the seating face; not the nearest road end. */
    frontReference?: [number,number];
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
