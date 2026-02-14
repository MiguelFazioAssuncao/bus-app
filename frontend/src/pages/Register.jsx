import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock } from "@fortawesome/free-solid-svg-icons";
import { faUser as faUserRegular } from "@fortawesome/free-regular-svg-icons";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      console.log({
        name: fullName,
        email,
        password,
      });

      const response = await axios.post("http://localhost:3000/auth/register", {
        name: fullName,
        email,
        password,   
      });

      setSuccessMsg("User created successfully!");
      setFullName("");
      setEmail("");
      setPassword("");
      if (response?.data?.token) {
        localStorage.setItem("token", response.data.token);
      }
      if (response?.data?.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      } else {
        localStorage.setItem("user", JSON.stringify({ name: fullName, email }));
      }
      navigate("/directions");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMsg(error.response?.data?.message || "Error creating user");
      } else {
        setErrorMsg("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-(--primary-color)">
      <div className="bg-white lg:rounded-tr-3xl lg:rounded-br-3xl p-8 flex flex-col items-center justify-center overflow-auto w-full min-h-screen lg:w-1/2">
        <img
          src="/favicon.ico"
          alt="Logo"
          className="w-20 sm:w-24 md:w-28 lg:w-32"
        />

        <div className="text-3xl sm:text-4xl md:text-5xl text-center text-(--gray-primary) mt-4">
          <h1>Welcome to Bus App!</h1>
        </div>

        <div className="text-(--gray-secondary) text-xs sm:text-sm md:text-base mt-2 tracking-wide text-center">
          <p>Register your account</p>
        </div>

        <form
          className="w-full max-w-md mt-8 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleRegister();
          }}
        >
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center text-gray-400">
              <FontAwesomeIcon
                icon={faUserRegular}
                className="text-base sm:text-lg"
              />
            </div>
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-3xl focus:outline-none focus:ring-4 focus:ring-(--primary-color) focus:border-transparent transition-all duration-300 ease-in-out"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center text-gray-400">
              <FontAwesomeIcon icon={faUser} className="text-base sm:text-lg" />
            </div>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-3xl focus:outline-none focus:ring-4 focus:ring-(--primary-color) focus:border-transparent transition-all duration-300 ease-in-out"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center text-gray-400">
              <FontAwesomeIcon icon={faLock} className="text-base sm:text-lg" />
            </div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-3xl focus:outline-none focus:ring-4 focus:ring-(--primary-color) focus:border-transparent transition-all duration-300 ease-in-out"
              required
              minLength={6}
            />
          </div>

          {errorMsg && (
            <p className="text-red-600 text-center text-sm">{errorMsg}</p>
          )}

          <div className="mt-8 flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="relative inline-flex items-center justify-center px-16 sm:px-20 py-4 overflow-hidden tracking-tighter text-white bg-gray-800 rounded-3xl group cursor-pointer hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                {loading ? "Registering..." : "Sign in"}
              </span>
            </button>
          </div>

          <div className="text-center text-xs sm:text-sm text-(--gray-secondary) mt-4 flex flex-wrap justify-center">
            <span>Have an account?</span>
            <a
              href="/login"
              className="ml-1 underline hover:text-(--gray-primary)"
            >
              Sign in
            </a>
          </div>
        </form>

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
            <span className="text-sm text-gray-800 font-medium">Facebook</span>
          </button>

          <button className="cursor-pointer flex items-center gap-2 border border-gray-300 rounded-full px-4 py-2 bg-white shadow-sm hover:scale-105 transition-transform">
            <img
              src="https://pngimg.com/uploads/microsoft/microsoft_PNG5.png"
              alt="Microsoft"
              className="w-5 h-auto"
            />
            <span className="text-sm text-gray-800 font-medium">Microsoft</span>
          </button>
        </div>
      </div>

      <div className="hidden lg:flex w-1/2 min-h-screen items-center justify-center">
        <img
          src="/bus2.png"
          alt="imagem 1"
          className="w-full h-auto max-h-screen object-contain scale-x-[-1]"
        />
      </div>
    </div>
  );
};

export default Register;
