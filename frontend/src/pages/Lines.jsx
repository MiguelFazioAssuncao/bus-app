import React, { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";

const Lines = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const formatTa = (ta) => {
    if (!ta) return "—";
    const d = new Date(ta);
    if (isNaN(d.getTime())) return ta;
    return d.toLocaleString();
  };

  useEffect(() => {
    const ctrl = new AbortController();
    const fetchPositions = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("http://localhost:3000/lines/positions", { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = [];
        if (data && Array.isArray(data.l)) {
          data.l.forEach((line) => {
            const lt0 = line.lt0;
            const lt1 = line.lt1;
            const vehicles = Array.isArray(line.vs) ? line.vs : [];
            vehicles.forEach((v) => {
              list.push({ lt0, lt1, ta: v.ta, vehicle: v.p });
            });
          });
        }
        setItems(list);
        setLastUpdated(new Date());
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message || "Failed to load positions");
      } finally {
        setLoading(false);
      }
    };
    fetchPositions();
    const id = setInterval(fetchPositions, 30000);
    return () => {
      clearInterval(id);
      ctrl.abort();
    };
  }, [reloadKey]);

  const filtered = items.filter((it) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      (it.lt0 && it.lt0.toLowerCase().includes(q)) ||
      (it.lt1 && it.lt1.toLowerCase().includes(q)) ||
      (String(it.vehicle || '').toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIdx, startIdx + pageSize);

  const manualRefresh = () => {
    setLoading(true);
    setError("");
    setLastUpdated(null);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-[#363636] text-gray-200">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Lines</h2>
            <p className="text-xs text-[#9C9A9A]">Below we list each bus with its main data.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
              placeholder="Filter by origin/destination/vehicle"
              className="bg-[#2D2B2B] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
            />
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
              className="bg-[#2D2B2B] rounded-md px-3 py-2 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <button
              onClick={manualRefresh}
              className="px-3 py-2 text-sm rounded-md bg-gray-700 hover:bg-gray-600"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Refresh'}
            </button>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-[11px] text-[#9C9A9A] mb-4">Updated at {lastUpdated.toLocaleString()}</p>
        )}

        {loading && (
          <p className="text-sm text-[#9C9A9A]">Loading positions...</p>
        )}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {paginated.map((it, idx) => (
              <div key={`${it.vehicle || idx}-${idx}`} className="bg-[#2D2B2B] rounded-md p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-[11px] text-[#9C9A9A]">Destination (lt0)</div>
                    <div className="text-sm">{it.lt0 || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#9C9A9A]">Origin (lt1)</div>
                    <div className="text-sm">{it.lt1 || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#9C9A9A]">Captured at (ta)</div>
                    <div className="text-sm">{formatTa(it.ta)}</div>
                  </div>
                </div>
                <hr className="border-gray-700 mt-4" />
                <div className="mt-2 text-[11px] text-[#9C9A9A]">
                  Explanation:
                  <ul className="list-disc ml-5 mt-1 space-y-1">
                    <li><span className="text-gray-300">lt0</span>: destination sign text for the line.</li>
                    <li><span className="text-gray-300">lt1</span>: origin sign text for the line.</li>
                    <li><span className="text-gray-300">ta</span>: UTC/ISO 8601 timestamp when the bus position was captured.</li>
                  </ul>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-[#9C9A9A]">No vehicles available at the moment.</p>
            )}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between pt-2">
                <button
                  className="px-3 py-2 text-sm rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  Previous
                </button>
                <div className="text-xs text-[#9C9A9A]">
                  Page {currentPage} of {totalPages} — {filtered.length} items
                </div>
                <button
                  className="px-3 py-2 text-sm rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      <div className="pb-16" />
      <Footer />
    </div>
  );
};

export default Lines;
