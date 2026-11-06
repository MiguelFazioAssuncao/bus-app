import { useEffect, useId, useMemo, useState } from "react";
import {
  locations,
  normalize,
  rememberGeocodedPlaces,
  searchAddressSuggestions,
} from "../lib/locations.js";
import { readStorage, userKey } from "../lib/storage.js";
import { Icon } from "./ui.jsx";

export default function LocationInput({
  label,
  id,
  value,
  onChange,
  onSelectPlace,
  placeholder = "Busque um local ou endereço em São Paulo",
  error,
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [remoteMatches, setRemoteMatches] = useState([]);
  const [searchingRemote, setSearchingRemote] = useState(false);

  const stored = readStorage(userKey("favorites"), []);
  const localMatches = useMemo(() => {
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
    return all
      .filter((place) =>
        normalize(`${place.name} ${place.address}`).includes(normalize(value)),
      )
      .slice(0, 5);
  }, [stored, value]);

  useEffect(() => {
    const trimmed = String(value || "").trim();
    if (!open || trimmed.length < 3 || /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(trimmed)) {
      setRemoteMatches([]);
      setSearchingRemote(false);
      return;
    }
    const controller = new AbortController();
    setSearchingRemote(true);
    const timer = setTimeout(() => {
      searchAddressSuggestions(trimmed, controller.signal)
        .then((places) => {
          if (!controller.signal.aborted) {
            setRemoteMatches(places);
            setSearchingRemote(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSearchingRemote(false);
          }
        });
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, open]);

  const matches = useMemo(() => {
    const seen = new Set(localMatches.map((item) => normalize(item.name)));
    const combined = [...localMatches];
    for (const remote of remoteMatches) {
      const key = normalize(`${remote.name} ${remote.address}`);
      if (!seen.has(normalize(remote.name)) && !seen.has(key)) {
        seen.add(key);
        combined.push(remote);
      }
      if (combined.length >= 7) break;
    }
    return combined;
  }, [localMatches, remoteMatches]);

  const choose = (place) => {
    rememberGeocodedPlaces([place]);
    onChange(place.name);
    onSelectPlace?.(place);
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
          name={inputId}
          role="combobox"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
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
            if (event.nativeEvent?.isComposing) return;
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
        hidden={!open || (!matches.length && !searchingRemote)}
      >
        {matches.map((place, index) => (
          <li
            id={`${inputId}-${index}`}
            key={place.id || `${place.lat},${place.lng}-${index}`}
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
        {searchingRemote && (
          <li className="location-suggestion-loading" aria-live="polite">
            <Icon name="refresh" size={15} className="is-spinning" />
            <span>
              <small>Buscando endereços em São Paulo…</small>
            </span>
          </li>
        )}
      </ul>
      {error && (
        <span className="field-error" id={`${inputId}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}
