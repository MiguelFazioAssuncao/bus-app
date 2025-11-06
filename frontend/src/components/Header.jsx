import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faSearch } from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useLocation } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <header className="w-full py-4">
      <div className="max-w-5xl mx-auto px-4">
        <div className="w-full flex items-center gap-3">
          <FontAwesomeIcon
            icon={faUser}
            className="text-2xl text-gray-300 hover:text-white cursor-pointer"
            onClick={() => {
              if (location.pathname === '/profile') {
                navigate(-1);
              } else {
                navigate('/profile');
              }
            }}
          />
          <div className="relative w-full">
            <input
              type="text"
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
      </div>
    </header>
  );
};

export default Header;

