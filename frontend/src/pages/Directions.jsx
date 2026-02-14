import React from "react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faPersonWalking, faBriefcase } from "@fortawesome/free-solid-svg-icons";

const Directions = () => {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState(null); 
  const [name, setName] = React.useState("");
  const [point1, setPoint1] = React.useState("");
  const [point2, setPoint2] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [homeInfo, setHomeInfo] = React.useState({ name: "Home", time: "26 min", distance: "2.4km" });
  const [workInfo, setWorkInfo] = React.useState({ name: "Work", time: null, distance: null });

  React.useEffect(() => {
    try {
      const h = JSON.parse(localStorage.getItem('homeInfo') || 'null');
      const w = JSON.parse(localStorage.getItem('workInfo') || 'null');
      if (h && h.name) setHomeInfo(h);
      if (w && w.name) setWorkInfo(w);
    } catch {}

    const stored = localStorage.getItem("user");
    const userId = stored ? JSON.parse(stored)?.id : null;
    if (!userId) return;
    const fetchPrefs = async () => {
      try {
        const res = await fetch(`http://localhost:3000/directions/preferences?userId=${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.home) {
          const next = {
            name: data.home.name || 'Home',
            time: data.home.time || (data.home.timeMinutes ? `${data.home.timeMinutes} min` : null) || '26 min',
            distance: data.home.distance || (data.home.distanceMeters ? `${(data.home.distanceMeters/1000).toFixed(2)} km` : null) || '2.4km',
          };
          setHomeInfo(next);
          localStorage.setItem('homeInfo', JSON.stringify(next));
        }
        if (data?.work) {
          const next = {
            name: data.work.name || 'Work',
            time: data.work.time || (data.work.timeMinutes ? `${data.work.timeMinutes} min` : null),
            distance: data.work.distance || (data.work.distanceMeters ? `${(data.work.distanceMeters/1000).toFixed(2)} km` : null),
          };
          setWorkInfo(next);
          localStorage.setItem('workInfo', JSON.stringify(next));
        }
      } catch {}
    };
    fetchPrefs();
  }, []);

  const openModal = (type) => {
    setModalType(type);
    setName("");
    setPoint1("");
    setPoint2("");
    setError("");
    setSuccess("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const submitLocation = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const stored = localStorage.getItem("user");
      const userId = stored ? JSON.parse(stored)?.id : null;
      if (!userId) {
        setError("User not identified. Please log in again.");
        return;
      }

      const url = modalType === 'home'
        ? 'http://localhost:3000/directions/setHome'
        : 'http://localhost:3000/directions/setWork';

      const body = {
        userId,
        point1,
        point2,
        ...(modalType === 'home' ? { homeName: name } : { workName: name }),
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSuccess(data?.message || 'Saved successfully');
      if (modalType === 'home') {
        const h = data?.home || {};
        const next = {
          name: h.name || name || 'Home',
          time: h.time || (h.timeMinutes ? `${h.timeMinutes} min` : homeInfo.time),
          distance: h.distance || (h.distanceMeters ? `${(h.distanceMeters/1000).toFixed(2)} km` : homeInfo.distance),
        };
        setHomeInfo(next);
        localStorage.setItem('homeInfo', JSON.stringify(next));
      } else {
        const w = data?.work || {};
        const next = {
          name: w.name || name || 'Work',
          time: w.time || (w.timeMinutes ? `${w.timeMinutes} min` : workInfo.time),
          distance: w.distance || (w.distanceMeters ? `${(w.distanceMeters/1000).toFixed(2)} km` : workInfo.distance),
        };
        setWorkInfo(next);
        localStorage.setItem('workInfo', JSON.stringify(next));
      }
      setTimeout(() => setModalOpen(false), 400);
    } catch (e) {
      setError(e.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#363636]">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-6 text-gray-200">
        <h2 className="text-sm text-gray-200 mb-2">My frequent destinations</h2>
        <hr className="border-gray-600 mb-6" />

        <div className="space-y-4">
          <div className="bg-[#2D2B2B] rounded-md p-5 cursor-pointer" onClick={() => openModal('home')}>
            <div className="flex items-start gap-4">
              <FontAwesomeIcon icon={faHouse} className="text-2xl text-gray-300" />
              <div className="flex-1">
                <div className="text-base mb-3">{homeInfo.name}</div>
                <div className="flex items-center gap-3 text-sm text-[#9C9A9A]">
                  <FontAwesomeIcon icon={faPersonWalking} />
                  <span>{homeInfo.time}</span>
                  <span>{homeInfo.distance}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#2D2B2B] rounded-md p-5 cursor-pointer" onClick={() => openModal('work')}>
            <div className="flex items-start gap-4">
              <FontAwesomeIcon icon={faBriefcase} className="text-2xl text-gray-300" />
              <div className="flex-1">
                <div className="text-base mb-3">{workInfo.name}</div>
                {workInfo.time && workInfo.distance ? (
                  <div className="flex items-center gap-3 text-sm text-[#9C9A9A]">
                    <FontAwesomeIcon icon={faPersonWalking} />
                    <span>{workInfo.time}</span>
                    <span>{workInfo.distance}</span>
                  </div>
                ) : (
                  <div className="text-sm text-[#9C9A9A]">Tap to set</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-lg bg-[#2D2B2B] text-gray-200 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">
              {modalType === 'home' ? 'Set Home' : 'Set Work'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#9C9A9A] mb-1">{modalType === 'home' ? 'Home name' : 'Work name'}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#262424] rounded-md px-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
                  placeholder={modalType === 'home' ? 'Home' : 'Work'}
                />
              </div>
              <div>
                <label className="block text-sm text-[#9C9A9A] mb-1">Point 1 (lat,lng)</label>
                <input
                  type="text"
                  value={point1}
                  onChange={(e) => setPoint1(e.target.value)}
                  className="w-full bg-[#262424] rounded-md px-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
                  placeholder="-23.55,-46.63"
                />
              </div>
              <div>
                <label className="block text-sm text-[#9C9A9A] mb-1">Point 2 (lat,lng)</label>
                <input
                  type="text"
                  value={point2}
                  onChange={(e) => setPoint2(e.target.value)}
                  className="w-full bg-[#262424] rounded-md px-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
                  placeholder="-23.56,-46.64"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
              {success && <p className="text-green-400 text-sm">{success}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600"
                  onClick={closeModal}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-orange-400 hover:bg-(--primary-color) disabled:opacity-50"
                  onClick={submitLocation}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="pb-16" />
      <Footer />
    </div>
  );
};

export default Directions;

