"use client";

import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";

function LocationPicker({ latitude, longitude, onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  if (latitude === null || longitude === null) {
    return null;
  }

  return (
    <CircleMarker center={[latitude, longitude]} radius={10} pathOptions={{ color: "#8d6416", fillColor: "#c9972f", fillOpacity: 0.9 }} />
  );
}

export function CompanyLocationMap({ latitude, longitude, onSelect = null, interactive = false, className = "", height = 220 }) {
  const safeLatitude = Number.isFinite(latitude) ? latitude : 30.0444;
  const safeLongitude = Number.isFinite(longitude) ? longitude : 31.2357;
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);
  const center = hasLocation ? [latitude, longitude] : [safeLatitude, safeLongitude];

  return (
    <div className={className} style={{ height }}>
      <MapContainer
        center={center}
        zoom={hasLocation ? 14 : 6}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {interactive && onSelect ? (
          <LocationPicker latitude={hasLocation ? latitude : null} longitude={hasLocation ? longitude : null} onSelect={onSelect} />
        ) : hasLocation ? (
          <CircleMarker center={[latitude, longitude]} radius={10} pathOptions={{ color: "#8d6416", fillColor: "#c9972f", fillOpacity: 0.9 }} />
        ) : null}
      </MapContainer>
    </div>
  );
}
