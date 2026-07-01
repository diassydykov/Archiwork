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
}
