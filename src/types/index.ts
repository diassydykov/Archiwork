export type Locale = "kk" | "ru" | "en";

export type Theme = "light" | "dark" | "accessible";

export type BuildingType = "residential" | "commercial";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ProjectDetails {
  buildingType: BuildingType;
  description: string;
  area: string;
  floors: string;
  style: string;
  budget: string;
  location: string;
  wishes: string;
  additional: string;
  latitude?: number;
  longitude?: number;
  /** PNG data URL — map snapshot at picked coordinates */
  mapSnapshot?: string;
  /** OSM zoom used when mapSnapshot was captured */
  mapCaptureZoom?: number;
  mapCaptureWidth?: number;
  mapCaptureHeight?: number;
}

export interface ProjectSheetResult {
  id: string;
  titleKey: string;
  image: string;
  provider?: string;
  error?: string;
}

export interface ArchitecturalProjectResult {
  specification: string;
  sheets: ProjectSheetResult[];
}
