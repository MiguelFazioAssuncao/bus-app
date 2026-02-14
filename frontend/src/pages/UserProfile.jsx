import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import { useNavigate } from "react-router-dom";

const UserProfile = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    const fetchMe = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("http://localhost:3000/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data?.user) {
          setRemoteUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } catch (e) {
        setError("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [navigate]);

  const user = useMemo(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) return JSON.parse(stored);
    } catch {}
    return { name: "User", email: "you@example.com" };
  }, []);

  const { displayName, displayEmail } = useMemo(() => {
    const source = remoteUser || user;
    let name = source?.name || source?.fullName || source?.username || "";
    const email = source?.email || "";
    if (!name && typeof email === "string" && email.includes("@")) {
      name = email.split("@")[0];
    }
    return { displayName: name, displayEmail: email };
  }, [remoteUser, user]);

  const passwordMasked = useMemo(() => {
    const len = parseInt(localStorage.getItem("passwordLength") || "0", 10);
    const maskLen = Math.max(6, isNaN(len) ? 0 : len);
    return "\u2022".repeat(maskLen);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#363636] text-gray-200">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-[#2D2B2B] rounded-lg p-6 shadow">
          <h1 className="text-xl font-semibold mb-6">Profile</h1>

          <div className="space-y-5">
            <div>
              <label className="block text-sm text-[#9C9A9A] mb-2">Name</label>
              <input
                type="text"
                value={displayName}
                readOnly
                className="w-full bg-[#262424] rounded-md px-4 py-3 text-gray-200 placeholder-[#6C6767] focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
              />
            </div>

            <div>
              <label className="block text-sm text-[#9C9A9A] mb-2">Email</label>
              <input
                type="email"
                value={displayEmail}
                readOnly
                className="w-full bg-[#262424] rounded-md px-4 py-3 text-gray-200 placeholder-[#6C6767] focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
              />
            </div>

            <div>
              <label className="block text-sm text-[#9C9A9A] mb-2">Password</label>
              <div className="relative">
                <input
                  type="text"
                  value={showPassword ? "The real password is not displayed for security reasons." : passwordMasked}
                  readOnly
                  className="w-full bg-[#262424] rounded-md px-4 py-3 text-gray-200 placeholder-[#6C6767] focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-4 text-[#9C9A9A] hover:text-gray-200"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleLogout}
              className="cursor-pointer w-full hover:bg-(--primary-color) bg-orange-400 text-white rounded-md py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-(--primary-color)"
            >
              Log out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;

