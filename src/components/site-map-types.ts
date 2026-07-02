export interface SiteMapPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (coords: {
    latitude: number;
    longitude: number;
    address?: string;
    mapSnapshot?: string;
    mapCaptureZoom?: number;
    mapCaptureWidth?: number;
    mapCaptureHeight?: number;
  }) => void;
}
