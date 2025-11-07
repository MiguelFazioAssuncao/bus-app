import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faSearch, faMap, faRoute, faLocationDot, faClock, faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";
import { faStar } from "@fortawesome/free-regular-svg-icons";
import { useNavigate } from "react-router-dom";

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [recents, setRecents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState("");
  const userId = React.useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u?.id || 'anon';
    } catch { return 'anon'; }
  }, []);

  useEffect(() => {
    try {
      const f = JSON.parse(localStorage.getItem(`favorites_${userId}`) || "null");
      const r = JSON.parse(localStorage.getItem(`recents_${userId}`) || "null");
      if (Array.isArray(f)) setFavorites(f);
      if (Array.isArray(r)) setRecents(r);
    } catch {}
  }, [userId]);

  useEffect(() => {
    localStorage.setItem(`favorites_${userId}`, JSON.stringify(favorites));
  }, [favorites, userId]);
  useEffect(() => {
    localStorage.setItem(`recents_${userId}`, JSON.stringify(recents));
  }, [recents, userId]);

  const toggleFavoriteFromRecents = (item) => {
    const exists = favorites.some((f) => f.title === item.title);
    if (!exists) {
      setFavorites([{ id: `fav-${Date.now()}`, title: item.title, subtitle: item.subtitle || "", icon: faLocationDot }, ...favorites]);
    }
    setRecents(recents.map((r) => (r.id === item.id ? { ...r, favorite: !r.favorite } : r)));
  };

  const toggleFavoriteFromFavorites = (item) => {
    setFavorites(favorites.filter((f) => f.id !== item.id));
    const exists = recents.some((r) => r.title === item.title);
    if (!exists) setRecents([{ id: `r-${Date.now()}`, title: item.title, subtitle: item.subtitle || "", icon: faClock, favorite: false }, ...recents]);
  };

  const openAddModal = (prefillTitle = "") => {
    setModalTitle(prefillTitle);
    setModalSubtitle("");
    setModalOpen(true);
  };

  const saveChosenLocation = () => {
    if (!modalTitle.trim()) return;
    const newItem = { id: `fav-${Date.now()}`, title: modalTitle.trim(), subtitle: modalSubtitle.trim(), icon: faLocationDot };
    // Add only to recents by default, not as favorite
    setRecents([{ id: `r-${Date.now()}`, title: newItem.title, subtitle: newItem.subtitle, icon: faClock, favorite: false }, ...recents]);
    if (modalTitle.trim().toLowerCase() === 'home') {
      try {
        const existing = JSON.parse(localStorage.getItem('homeInfo') || 'null') || { name: 'Home' };
        const next = { ...existing, name: 'Home' };
        localStorage.setItem('homeInfo', JSON.stringify(next));
      } catch {}
    }
    setModalOpen(false);
  };

  const RowLink = ({ icon, colorClass, label, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3 text-left">
      <FontAwesomeIcon icon={icon} className={`text-2xl ${colorClass}`} />
      <span className={`text-base ${colorClass}`}>{label}</span>
    </button>
  );

  const Card = ({ children, onClick }) => (
    <div onClick={onClick} className="bg-[#2D2B2B] rounded-md px-5 py-4 cursor-pointer">
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#363636] text-gray-200">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <FontAwesomeIcon
            icon={faChevronLeft}
            className="text-2xl text-gray-300 hover:text-white cursor-pointer"
            onClick={() => navigate(-1)}
          />
          <div className="relative w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Where do you want to go?"
              className="w-full bg-[#2D2B2B] text-gray-200 placeholder-[#6C6767] rounded-md pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 px-4 text-gray-300 hover:text-white cursor-pointer"
              aria-label="Search"
            >
              <FontAwesomeIcon icon={faSearch} />
            </button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <RowLink icon={faRoute} colorClass="text-blue-500" label="Search for a line" onClick={() => navigate('/lines')} />
          <hr className="border-gray-700" />
          <RowLink icon={faMap} colorClass="text-blue-500" label="Choose on map" onClick={() => navigate('/stations')} />
          <RowLink icon={faLocationDot} colorClass="text-blue-500" label="Add location" onClick={() => openAddModal('')} />
        </div>

        <div className="mt-6">
          <div className="text-sm text-[#9C9A9A] mb-2">Favorites</div>
          {favorites.map((f) => (
            <div key={f.id} className="bg-[#2D2B2B] rounded-md px-5 py-4">
              <div className="flex items-center">
                <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => navigate('/directions')}>
                  <FontAwesomeIcon icon={f.icon} className="text-2xl text-gray-300" />
                  <div>
                    <div className="text-sm font-semibold">{f.title}</div>
                    {f.subtitle && <div className="text-sm text-[#9C9A9A]">{f.subtitle}</div>}
                  </div>
                </div>
                <button className="p-2 -mr-2 text-white/80 hover:text-white" onClick={() => toggleFavoriteFromFavorites(f)}>
                  <FontAwesomeIcon icon={faStarSolid} className="text-lg" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <hr className="border-gray-700 my-5" />

        <div className="mt-2">
          <div className="text-sm text-[#9C9A9A] mb-2">Recent</div>
          <div className="space-y-3">
            {recents.map((r) => (
              <div key={r.id} className="bg-[#2D2B2B] rounded-md px-5 py-4">
                <div className="flex items-center">
                  <div className="flex items-start gap-3 flex-1">
                    <FontAwesomeIcon icon={r.icon} className="text-xl text-gray-300 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold">{r.title}</div>
                      {r.subtitle && <div className="text-sm text-[#9C9A9A]">{r.subtitle}</div>}
                    </div>
                  </div>
                  <button className="p-2 -mr-2 text-white/80 hover:text-white" onClick={() => r.title.toLowerCase() === 'chosen location' ? openAddModal('') : toggleFavoriteFromRecents(r)}>
                    <FontAwesomeIcon icon={r.title.toLowerCase() === 'chosen location' ? faStar : (r.favorite ? faStarSolid : faStar)} className="text-lg" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="text-sm text-[#9C9A9A] mb-3">Didn’t find what you’re looking for?</p>
          <button onClick={() => navigate('/stations')} className="px-4 py-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors">
            Find on map
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-50">
          <div className="w-full max-w-lg bg-[#2D2B2B] text-gray-200 rounded-lg p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Add location</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#9C9A9A] mb-1">Name</label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full bg-[#262424] rounded-md px-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
                  placeholder="Ex.: home"
                />
              </div>
              <div>
                <label className="block text-sm text-[#9C9A9A] mb-1">Address (optional)</label>
                <input
                  type="text"
                  value={modalSubtitle}
                  onChange={(e) => setModalSubtitle(e.target.value)}
                  className="w-full bg-[#262424] rounded-md px-4 py-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
                  placeholder="Rua ..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600" onClick={() => setModalOpen(false)}>Cancel</button>
                <button className="px-4 py-2 rounded-md bg-orange-400 hover:bg-(--primary-color)" onClick={saveChosenLocation}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
