"use client";

import { getMapProvider } from "@/lib/maps/provider";
import { SiteMapPickerGoogle } from "./SiteMapPickerGoogle";
import { SiteMapPickerOsm } from "./SiteMapPickerOsm";
import type { SiteMapPickerProps } from "./site-map-types";

export type { SiteMapPickerProps } from "./site-map-types";

export function SiteMapPicker(props: SiteMapPickerProps) {
  const provider = getMapProvider();

  if (provider === "google") {
    return <SiteMapPickerGoogle {...props} />;
  }

  return <SiteMapPickerOsm {...props} />;
}
