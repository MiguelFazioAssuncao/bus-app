import { useId, useState } from "react";
import { locations, normalize } from "../lib/locations.js";
import { readStorage, userKey } from "../lib/storage.js";
import { Icon } from "./ui.jsx";

export default function LocationInput({
  label,
  id,
  value,
  onChange,
  placeholder = "Busque um local em São Paulo",
  error,
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const stored = readStorage(userKey("favorites"), []);
  const all = [
    ...locations,
    ...(Array.isArray(stored)
      ? stored
          .filter(
            (place) =>
              place &&
              typeof place === "object" &&
              place.lat != null &&
              place.lng != null &&
              !locations.some((known) => known.id === place.id),
          )
          .map((place) => ({
            ...place,
            name: place.name || place.title,
            address: place.address || place.subtitle,
          }))
      : []),
  ];
  const matches = all
    .filter((place) =>
      normalize(`${place.name} ${place.address}`).includes(normalize(value)),
    )
    .slice(0, 5);
  const choose = (place) => {
    onChange(place.name);
    setOpen(false);
    setActive(-1);
  };
  return (
    <div className="field location-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="location-input-wrap">
        <Icon name="pin" size={18} />
        <input
          className="input"
          id={inputId}
          role="combobox"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open && matches.length > 0}
          aria-controls={`${inputId}-list`}
          aria-activedescendant={
            open && active >= 0 ? `${inputId}-${active}` : undefined
          }
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              setActive((index) =>
                event.key === "ArrowDown"
                  ? Math.min(index + 1, matches.length - 1)
                  : Math.max(index - 1, 0),
              );
            }
            if (
              event.key === "Enter" &&
              open &&
              active >= 0 &&
              matches[active]
            ) {
              event.preventDefault();
              choose(matches[active]);
            }
          }}
        />
      </div>
      <ul
        id={`${inputId}-list`}
        role="listbox"
        aria-label={`Sugestões de ${label}`}
        className="location-suggestions"
        hidden={!open || !matches.length}
      >
        {matches.map((place, index) => (
          <li
            id={`${inputId}-${index}`}
            key={place.id}
            role="option"
            aria-selected={active === index}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => choose(place)}
          >
            <Icon name="pin" size={17} />
            <span>
              <strong>{place.name}</strong>
              <small>{place.address}</small>
            </span>
          </li>
        ))}
      </ul>
      {error && (
        <span className="field-error" id={`${inputId}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}
