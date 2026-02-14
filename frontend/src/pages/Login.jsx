import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const response = await axios.post("http://localhost:3000/auth/login", {
        email,
        password,
      });

      if (response?.data?.token) {
        localStorage.setItem("token", response.data.token);
      }
      if (response?.data?.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      } else {
        const inferredName = typeof email === 'string' && email.includes('@') ? email.split('@')[0] : '';
        localStorage.setItem("user", JSON.stringify({ name: inferredName, email }));
      }
      localStorage.setItem("passwordLength", String((password || '').length));
      navigate("/directions");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMsg(error.response?.data?.message || "Error logging in");
      } else {
        setErrorMsg("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-(--primary-color) min-h-screen h-screen overflow-y-auto w-full max-w-full box-border flex flex-col lg:flex-row">
      <div className="hidden 2xl:flex w-[45%] max-w-[900px] h-full items-center justify-center overflow-hidden">
        <img
          src="/bus1.png"
          alt="Bus Illustration"
          className="w-full h-full object-contain"
        />
      </div>

      <div className="bg-white flex flex-1 flex-col items-center justify-center px-4 sm:px-8 md:px-12 xl:px-20 2xl:px-32 py-6 sm:py-8 md:py-10 xl:py-14 2xl:py-20 xl:rounded-l-4xl max-w-full box-border">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-y-5 sm:gap-y-6">
          <img src="/favicon.ico" alt="Logo" className="w-14 sm:w-16 md:w-20" />

          <h1 className="text-[clamp(1.5rem,2.5vw,2.5rem)] font-semibold text-center text-(--gray-primary)">
            Welcome
          </h1>
          <p className="text-[clamp(0.75rem,1.2vw,1rem)] text-(--gray-secondary) text-center">
            Log in to your account to continue
          </p>

          <div className="w-full flex flex-col gap-4">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-4 flex items-center text-gray-400">
                <FontAwesomeIcon icon={faUser} className="text-base sm:text-lg" />
              </div>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-3xl text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-(--primary-color) focus:border-transparent transition-all duration-300 ease-in-out"
              />
            </div>

            <div className="relative w-full">
              <div className="absolute inset-y-0 left-4 flex items-center text-gray-400">
                <FontAwesomeIcon icon={faLock} className="text-base sm:text-lg" />
              </div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-3xl text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-(--primary-color) focus:border-transparent transition-all duration-300 ease-in-out"
              />
            </div>

            {errorMsg && (
              <p className="text-red-600 text-sm text-center">{errorMsg}</p>
            )}

            <div className="text-right w-full text-xs sm:text-sm text-(--gray-secondary)">
              <Link
                to="/forgot-password"
                className="underline hover:text-(--gray-primary)"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div className="mt-2">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="relative inline-flex items-center justify-center px-16 sm:px-20 py-3 sm:py-4 overflow-hidden tracking-tighter text-white bg-gray-800 rounded-4xl group cursor-pointer hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-orange-600 rounded-full group-hover:w-72 group-hover:h-72"></span>
              <span className="absolute bottom-0 left-0 h-full -ml-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-auto h-full opacity-100 object-stretch"
                  viewBox="0 0 487 487"
                >
                  <path
                    fillOpacity=".1"
                    fillRule="nonzero"
                    fill="#FFF"
                    d="M0 .3c67 2.1 134.1 4.3 186.3 37 52.2 32.7 89.6 95.8 112.8 150.6 23.2 54.8 32.3 101.4 61.2 149.9 28.9 48.4 77.7 98.8 126.4 149.2H0V.3z"
                  />
                </svg>
              </span>
              <span className="absolute top-0 right-0 w-14 h-full -mr-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="object-cover w-full h-full"
                  viewBox="0 0 487 487"
                >
                  <path
                    fillOpacity=".1"
                    fillRule="nonzero"
                    fill="#FFF"
                    d="M487 486.7c-66.1-3.6-132.3-7.3-186.3-37s-95.9-85.3-126.2-137.2c-30.4-51.8-49.3-99.9-76.5-151.4C70.9 109.6 35.6 54.8.3 0H487v486.7z"
                  />
                </svg>
              </span>
              <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-linear-to-b from-transparent via-transparent to-gray-200"></span>
              <span className="relative text-base sm:text-lg font-semibold">
                {loading ? "Loading..." : "Login"}
              </span>
            </button>
          </div>

          <div className="text-center text-xs sm:text-sm text-(--gray-secondary) mt-4 flex flex-wrap justify-center">
            <span>Don't have an account?</span>
            <Link
              to="/register"
              className="ml-1 underline hover:text-(--gray-primary)"
            >
              Sign up
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <button
              onClick={() => {
                window.location.href = "http://localhost:8000/auth/google";
              }}
              className="cursor-pointer flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 bg-white shadow-sm hover:scale-105 transition-transform"
            >
              <img
                src="https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png"
                alt="Google"
                className="w-5 h-auto"
              />
              <span className="text-sm text-gray-800 font-medium">Google</span>
            </button>

            <button className="cursor-pointer flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 bg-white shadow-sm hover:scale-105 transition-transform">
              <img
                src="https://logodownload.org/wp-content/uploads/2014/09/facebook-logo-3-1.png"
                alt="Facebook"
                className="w-5 h-auto"
              />
              <span className="text-sm text-gray-800 font-medium">
                Facebook
              </span>
            </button>

            <button className="cursor-pointer flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 bg-white shadow-sm hover:scale-105 transition-transform">
              <img
                src="https://pngimg.com/uploads/microsoft/microsoft_PNG5.png"
                alt="Microsoft"
                className="w-5 h-auto"
              />
              <span className="text-sm text-gray-800 font-medium">
                Microsoft
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
