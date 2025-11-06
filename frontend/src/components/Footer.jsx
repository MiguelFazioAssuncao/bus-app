import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRoute, faLocationDot, faEllipsis } from "@fortawesome/free-solid-svg-icons";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (p) => location.pathname.startsWith(p);

  const itemBase = "flex flex-col items-center gap-1 cursor-pointer select-none";
  const labelBase = "text-xs";

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#2D2B2B] py-3">
      <div className="max-w-5xl mx-auto px-6">
        <div className="w-full flex items-center justify-between">
          <div
            className={itemBase}
            onClick={() => navigate("/directions")}
          >
            <FontAwesomeIcon
              icon={faRoute}
              className={isActive("/directions") ? "text-blue-500" : "text-white"}
            />
            <span className={`${labelBase} ${isActive("/directions") ? "text-blue-500" : "text-white"}`}>
              Directions
            </span>
          </div>

          <div
            className={itemBase}
            onClick={() => navigate("/stations")}
          >
            <FontAwesomeIcon
              icon={faLocationDot}
              className={isActive("/stations") ? "text-blue-500" : "text-white"}
            />
            <span className={`${labelBase} ${isActive("/stations") ? "text-blue-500" : "text-white"}`}>
              Stations
            </span>
          </div>

          <div
            className={itemBase}
            onClick={() => navigate("/lines")}
          >
            <FontAwesomeIcon
              icon={faEllipsis}
              className={isActive("/lines") ? "text-blue-500" : "text-white"}
            />
            <span className={`${labelBase} ${isActive("/lines") ? "text-blue-500" : "text-white"}`}>
              Lines
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

