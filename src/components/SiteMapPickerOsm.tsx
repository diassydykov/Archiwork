"use client";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMapEvents,
} from "react-leaflet";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { SiteMapPickerProps } from "./site-map-types";
import "leaflet/dist/leaflet.css";

const ALMATY_CENTER: [number, number] = [43.238949, 76.945465];

function MapClickHandler({
  onClick,
}: {
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export function SiteMapPickerOsm({
  latitude,
  longitude,
  onLocationChange,
}: SiteMapPickerProps) {
  const { t } = useI18n();
  const [resolving, setResolving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const position: [number, number] | null =
    latitude != null && longitude != null ? [latitude, longitude] : null;

  const handleClick = useCallback(
    async (lat: number, lng: number) => {
      setResolving(true);
      try {
        const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        onLocationChange({
          latitude: lat,
          longitude: lng,
          address: data.address ?? undefined,
        });
      } catch {
        onLocationChange({ latitude: lat, longitude: lng });
      } finally {
        setResolving(false);
      }
    },
    [onLocationChange]
  );

  if (!mounted) {
    return (
      <div
        className="flex h-80 items-center justify-center rounded-xl"
        style={{ backgroundColor: "var(--bg-accent)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {t("mapLoading")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {t("mapSiteTitle")}
        </p>
        <span
          className="rounded-md px-2 py-0.5 text-xs"
          style={{
            backgroundColor: "var(--bg-accent)",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
          }}
        >
          OpenStreetMap
        </span>
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {t("mapSiteHint")}
      </p>
      <div
        className="overflow-hidden rounded-xl"
        style={{ border: "1px solid var(--border)" }}
      >
        <MapContainer
          center={position ?? ALMATY_CENTER}
          zoom={position ? 17 : 11}
          style={{ height: 320, width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onClick={handleClick} />
          {position && (
            <CircleMarker
              center={position}
              radius={10}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#2563eb",
                fillOpacity: 0.9,
                weight: 2,
              }}
            />
          )}
        </MapContainer>
      </div>
      {resolving && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("mapResolving")}
        </p>
      )}
      {position && !resolving && (
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {t("mapCoords")}: {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </p>
      )}
    </div>
  );
}
