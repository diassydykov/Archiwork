"use client";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import type { SiteMapPickerProps } from "./site-map-types";
import { captureMapSnapshot } from "@/lib/maps/capture-map-snapshot";

const ALMATY_CENTER: [number, number] = [43.238949, 76.945465];

/** Тайлы через наш прокси — надёжнее, чем напрямую с openstreetmap.org */
const TILE_URL = "/api/maps/tile?z={z}&x={x}&y={y}";

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

/** Пересчёт размеров после монтирования (fix: один тайл в углу) */
function MapInvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize({ animate: false });
    const t1 = setTimeout(fix, 0);
    const t2 = setTimeout(fix, 200);
    const t3 = setTimeout(fix, 600);
    window.addEventListener("resize", fix);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", fix);
    };
  }, [map]);
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
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const position: [number, number] | null =
    latitude != null && longitude != null ? [latitude, longitude] : null;

  const handleClick = useCallback(
    async (lat: number, lng: number) => {
      setResolving(true);
      try {
        let mapSnapshot: string | undefined;
        let mapCaptureZoom: number | undefined;
        let mapCaptureWidth: number | undefined;
        let mapCaptureHeight: number | undefined;
        try {
          const captured = await captureMapSnapshot(lat, lng);
          mapSnapshot = captured.dataUrl;
          mapCaptureZoom = captured.zoom;
          mapCaptureWidth = captured.width;
          mapCaptureHeight = captured.height;
          setSnapshotPreview(mapSnapshot);
        } catch {
          /* snapshot optional */
        }

        const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        onLocationChange({
          latitude: lat,
          longitude: lng,
          address: data.address ?? undefined,
          mapSnapshot,
          mapCaptureZoom,
          mapCaptureWidth,
          mapCaptureHeight,
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
        style={{ border: "1px solid var(--border)", height: 320, width: "100%" }}
      >
        <MapContainer
          center={position ?? ALMATY_CENTER}
          zoom={position ? 17 : 6}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={TILE_URL}
            tileSize={256}
            maxZoom={19}
            minZoom={3}
          />
          <MapInvalidateSize />
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
      {position && !resolving && (
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {t("mapCoords")}: {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </p>
      )}
      {resolving && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("mapCapturing")}
        </p>
      )}
      {snapshotPreview && (
        <div
          className="mt-2 overflow-hidden rounded-xl"
          style={{ border: "1px solid var(--border)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={snapshotPreview}
            alt={t("siteBinding")}
            className="w-full bg-[#e5e7eb]"
          />
          <p
            className="px-2 py-1 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {t("mapSnapshotSaved")}
          </p>
        </div>
      )}
    </div>
  );
}
