"use client";

import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { SiteMapPickerOsm } from "./SiteMapPickerOsm";
import type { SiteMapPickerProps } from "./site-map-types";

const ALMATY_CENTER = { lat: 43.238949, lng: 76.945465 };

const mapContainerStyle = {
  width: "100%",
  height: "320px",
  borderRadius: "12px",
};

export function SiteMapPickerGoogle(props: SiteMapPickerProps) {
  const { t } = useI18n();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyState, setKeyState] = useState<"loading" | "ready" | "missing">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;

    async function loadKey() {
      const envKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (envKey) {
        if (!cancelled) {
          setApiKey(envKey);
          setKeyState("ready");
        }
        return;
      }

      try {
        const res = await fetch("/api/maps/config");
        const data = await res.json();
        if (!cancelled) {
          if (data.apiKey) {
            setApiKey(data.apiKey);
            setKeyState("ready");
          } else {
            setKeyState("missing");
          }
        }
      } catch {
        if (!cancelled) setKeyState("missing");
      }
    }

    loadKey();
    return () => {
      cancelled = true;
    };
  }, []);

  if (keyState === "loading") {
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

  if (keyState === "missing" || !apiKey) {
    return <SiteMapPickerOsm {...props} />;
  }

  return <SiteMapPickerGoogleMap apiKey={apiKey} {...props} />;
}

function SiteMapPickerGoogleMap({
  apiKey,
  latitude,
  longitude,
  onLocationChange,
}: SiteMapPickerProps & { apiKey: string }) {
  const { t } = useI18n();
  const [mapType, setMapType] = useState<"hybrid" | "roadmap">("hybrid");
  const [resolving, setResolving] = useState(false);
  const [useOsmFallback, setUseOsmFallback] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  useEffect(() => {
    const win = window as Window & { gm_authFailure?: () => void };
    win.gm_authFailure = () => setUseOsmFallback(true);
    return () => {
      delete win.gm_authFailure;
    };
  }, []);

  useEffect(() => {
    if (!loadError) return;
    const msg = loadError.message ?? String(loadError);
    if (/billingnotenabled|billing/i.test(msg)) {
      setUseOsmFallback(true);
    }
  }, [loadError]);

  const position =
    latitude != null && longitude != null
      ? { lat: latitude, lng: longitude }
      : null;

  const reverseGeocode = useCallback(
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

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const lat = e.latLng?.lat();
      const lng = e.latLng?.lng();
      if (lat == null || lng == null) return;
      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  if (useOsmFallback) {
    return <SiteMapPickerOsm {...{ latitude, longitude, onLocationChange }} />;
  }

  if (loadError) {
    return <SiteMapPickerOsm {...{ latitude, longitude, onLocationChange }} />;
  }

  if (!isLoaded) {
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
        <div className="flex gap-1">
          <MapTypeButton
            active={mapType === "hybrid"}
            label={t("mapSatellite")}
            onClick={() => setMapType("hybrid")}
          />
          <MapTypeButton
            active={mapType === "roadmap"}
            label={t("mapScheme")}
            onClick={() => setMapType("roadmap")}
          />
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {t("mapSiteHint")}
      </p>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={position ?? ALMATY_CENTER}
        zoom={position ? 18 : 11}
        mapTypeId={mapType}
        onClick={handleMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {position && <Marker position={position} />}
      </GoogleMap>
      {resolving && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {t("mapResolving")}
        </p>
      )}
      {position && !resolving && (
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {t("mapCoords")}: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}

function MapTypeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
      style={{
        backgroundColor: active ? "var(--accent)" : "var(--bg-accent)",
        color: active ? "#fff" : "var(--text-secondary)",
        border: "1px solid var(--border)",
      }}
    >
      {label}
    </button>
  );
}
