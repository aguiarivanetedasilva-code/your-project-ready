import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface DeviceSession {
  id: string;
  placa: string;
  ip_address: string | null;
  device_model: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  action: string;
  page_visited: string | null;
  is_online: boolean;
  created_at: string;
}

interface DeviceMapProps {
  devices: DeviceSession[];
}

const actionLabels: Record<string, string> = {
  pix_copy: "🟢 Copiou Pix",
  page_visit: "🔵 Visitou página",
};

const pageLabels: Record<string, string> = {
  "/": "Página Inicial",
  "/debitos": "Débitos",
  "/pix": "Pagamento Pix",
};

const DeviceMap = ({ devices }: DeviceMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([-14.235, -51.925], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
      }).addTo(mapInstance.current);
    }

    const map = mapInstance.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    // Add markers for devices with coordinates
    const devicesWithCoords = devices.filter((d) => d.latitude && d.longitude);

    devicesWithCoords.forEach((d) => {
      const isRecent = new Date(d.created_at) > new Date(Date.now() - 5 * 60 * 1000);
      const isPix = d.action === "pix_copy";

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="
          width: ${isPix ? 16 : 12}px; 
          height: ${isPix ? 16 : 12}px; 
          border-radius: 50%; 
          background: ${isPix ? "#22c55e" : "#3b82f6"}; 
          border: 2px solid white; 
          box-shadow: 0 0 ${isRecent ? "8px" : "4px"} ${isPix ? "#22c55e" : "#3b82f6"}${isRecent ? "" : "80"};
          ${isRecent ? "animation: pulse 2s infinite;" : ""}
        "></div>`,
        iconSize: [isPix ? 16 : 12, isPix ? 16 : 12],
        iconAnchor: [isPix ? 8 : 6, isPix ? 8 : 6],
      });

      const location = [d.city, d.region].filter(Boolean).join(", ") || "Local desconhecido";
      const action = actionLabels[d.action] || d.action;
      const page = pageLabels[d.page_visited || "/"] || d.page_visited || "/";
      const time = new Date(d.created_at).toLocaleString("pt-BR");

      L.marker([d.latitude!, d.longitude!], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; min-width: 180px;">
            <div style="font-weight: 700; margin-bottom: 6px;">${action}</div>
            <div style="margin-bottom: 3px;">📍 ${location}</div>
            <div style="margin-bottom: 3px;">📄 ${page}</div>
            <div style="margin-bottom: 3px;">🚗 Placa: <b>${d.placa}</b></div>
            <div style="margin-bottom: 3px;">📱 ${d.device_model || "Desconhecido"}</div>
            <div style="margin-bottom: 3px;">🌐 ${d.ip_address || "-"}</div>
            <div style="color: #888; font-size: 11px;">🕐 ${time}</div>
          </div>
        `);
    });

    return () => {};
  }, [devices]);

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="relative">
      <div ref={mapRef} style={{ height: 420, borderRadius: 12 }} />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-3 z-[1000]">
        <p className="text-xs font-bold text-foreground mb-2">Legenda</p>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          <span className="text-xs text-muted-foreground">Copiou Pix</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
          <span className="text-xs text-muted-foreground">Visita</span>
        </div>
      </div>
    </div>
  );
};

export default DeviceMap;
