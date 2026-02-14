import React from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

const Stations = () => {
  const mapRef = React.useRef(null);
  const leafletRef = React.useRef({ L: null, map: null, layer: null, markers: [] });
  const [point1, setPoint1] = React.useState("-23.55052,-46.633308");
  const [point2, setPoint2] = React.useState("-23.589, -46.658");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [summary, setSummary] = React.useState(null); 

  React.useEffect(() => {
    const ensureLeaflet = async () => {
      if (window.L) return window.L;
      await new Promise((resolve) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
        link.onload = resolve;
        link.onerror = resolve;
      });
      await new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        document.body.appendChild(script);
        script.onload = resolve;
        script.onerror = resolve;
      });
      return window.L;
    };

    ensureLeaflet().then((L) => {
      if (!mapRef.current || leafletRef.current.map) return;
      const map = L.map(mapRef.current).setView([-23.55, -46.63], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      }).addTo(map);
      leafletRef.current = { L, map, layer: null, markers: [] };
      setTimeout(() => map.invalidateSize(), 0);
    });
  }, []);

  React.useEffect(() => {
    const onResize = () => {
      const { map } = leafletRef.current;
      if (map) map.invalidateSize();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const decodePolyline = (str, precision = 5) => {
    let index = 0, lat = 0, lng = 0, coordinates = [];
    const factor = Math.pow(10, precision);
    while (index < str.length) {
      let b, shift = 0, result = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0; result = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      coordinates.push([lat / factor, lng / factor]);
    }
    return coordinates;
  };

  const drawRoute = (latlngs, start, end) => {
    const { L, map, layer, markers } = leafletRef.current;
    if (!L || !map) return;
    if (layer) { map.removeLayer(layer); leafletRef.current.layer = null; }
    if (markers && markers.length) { markers.forEach(m => map.removeLayer(m)); leafletRef.current.markers = []; }
    const poly = L.polyline(latlngs, { color: "#FFA652", weight: 5 }).addTo(map);
    const m1 = L.marker(start).addTo(map);
    const m2 = L.marker(end).addTo(map);
    leafletRef.current.layer = poly;
    leafletRef.current.markers = [m1, m2];
    map.fitBounds(poly.getBounds(), { padding: [32, 32] });
  };

  const handleRoute = async () => {
    try {
      setLoading(true);
      setError("");
      setSummary(null);
      const p1 = point1.replace(/\s+/g, "");
      const p2 = point2.replace(/\s+/g, "");
      const res = await fetch(`http://localhost:3000/stations/route?point1=${encodeURIComponent(p1)}&point2=${encodeURIComponent(p2)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const path = data?.paths?.[0];
      if (!path) throw new Error("Route not found");
      let latlngs = [];
      if (data?.info?.points_encoded === true || path?.points_encoded === true || typeof path?.points === 'string') {
        const encoded = typeof path.points === 'string' ? path.points : (data?.paths?.[0]?.points);
        latlngs = decodePolyline(encoded, 5);
      } else if (path?.points?.coordinates) {
        latlngs = path.points.coordinates.map(([lng, lat]) => [lat, lng]);
      }
      if (!latlngs.length) throw new Error("Failed to decode route polyline");

      const start = p1.split(',').map(Number)
      const end = p2.split(',').map(Number);
      drawRoute(latlngs, start, end);
      setSummary({
        distanceKm: (path.distance / 1000).toFixed(2),
        timeMin: Math.round(path.time / 60000)
      });
    } catch (e) {
      setError(e.message || 'Failed to fetch route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#363636] text-gray-200 flex flex-col">
      <Header />
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex-1 overflow-hidden w-full">
        <h2 className="text-lg font-semibold mb-3">Stations / Routes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-sm text-[#9C9A9A] mb-1">Point 1 (lat,lng)</label>
            <input
              type="text"
              className="w-full bg-[#2D2B2B] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
              value={point1}
              onChange={(e) => setPoint1(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-[#9C9A9A] mb-1">Point 2 (lat,lng)</label>
            <input
              type="text"
              className="w-full bg-[#2D2B2B] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
              value={point2}
              onChange={(e) => setPoint2(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleRoute}
              disabled={loading}
              className="w-full md:w-auto px-4 py-2 rounded-md bg-orange-400 hover:bg-(--primary-color) disabled:opacity-50"
            >
              {loading ? 'Fetching...' : 'Plot route'}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
        {summary && (
          <p className="text-sm text-[#9C9A9A] mb-3">Distance: <span className="text-gray-200">{summary.distanceKm} km</span> · Time: <span className="text-gray-200">{summary.timeMin} min</span></p>
        )}
        <div className="min-h-[30vh] h-[40vh] md:h-[50vh]">
          <div ref={mapRef} className="w-full h-full rounded-md overflow-hidden bg-[#2D2B2B]" />
        </div>
      </main>
      <div className="pb-16" />
      <Footer />
    </div>
  );
};

export default Stations;

