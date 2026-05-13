import { useEffect, useRef, useState } from "react";

const API_KEY = process.env.REACT_APP_MAP_API_KEY || "";

/**
 * Ensure the Google Maps Places library is available.
 * Handles three scenarios:
 *   1. Already fully loaded (e.g. user visited maps page first)
 *   2. google.maps exists but Places not yet loaded → use importLibrary
 *   3. Nothing loaded yet → inject a fresh <script> tag
 */
let loadPromise = null;
function ensurePlacesLibrary() {
  if (loadPromise) return loadPromise;

  // Case 1: Already available
  if (window.google?.maps?.places?.Autocomplete) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  // Case 2: google.maps is loaded (e.g. by @vis.gl/react-google-maps on the
  // maps page) but Places hasn't been imported yet.
  if (window.google?.maps?.importLibrary) {
    loadPromise = window.google.maps
      .importLibrary("places")
      .then(() => {})
      .catch(() => {
        loadPromise = null;
      });
    return loadPromise;
  }

  // Case 3: Google Maps not loaded at all → inject script
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      `https://maps.googleapis.com/maps/api/js` +
      `?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Component that renders address fields with Google Places Autocomplete
 * and a static map image preview (no Map ID required).
 */
function AddressFields({ formData, onChange, onAddressSelect }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [apiReady, setApiReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Stable callback ref so the autocomplete listener doesn't go stale
  const onAddressSelectRef = useRef(onAddressSelect);
  useEffect(() => {
    onAddressSelectRef.current = onAddressSelect;
  }, [onAddressSelect]);

  // Inject a style so the autocomplete dropdown renders above Bootstrap modals
  useEffect(() => {
    const styleId = "pac-container-zindex-fix";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `.pac-container { z-index: 1100 !important; }`;
      document.head.appendChild(style);
    }
  }, []);

  // Load the Google Maps Places library
  useEffect(() => {
    console.log("[AddressAutocomplete] Loading Places library…");
    ensurePlacesLibrary()
      .then(() => {
        console.log("[AddressAutocomplete] Places library loaded ✓");
        console.log(
          "[AddressAutocomplete] Autocomplete available:",
          !!window.google?.maps?.places?.Autocomplete,
        );
        setApiReady(true);
      })
      .catch((err) => {
        console.error("[AddressAutocomplete] Failed to load Places:", err);
        setLoadError(true);
      });
  }, []);

  // Initialise the Autocomplete widget once the API is ready
  useEffect(() => {
    if (!apiReady || !inputRef.current || autocompleteRef.current) return;

    const PlacesAutocomplete = window.google?.maps?.places?.Autocomplete;
    if (!PlacesAutocomplete) {
      console.warn(
        "[AddressAutocomplete] apiReady=true but Autocomplete class not found",
      );
      return;
    }

    console.log("[AddressAutocomplete] Attaching Autocomplete to input…");
    const autocomplete = new PlacesAutocomplete(inputRef.current, {
      componentRestrictions: { country: "us" },
      fields: ["address_components", "geometry", "formatted_address"],
      types: ["address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      // Parse address components
      let streetNumber = "";
      let route = "";
      let city = "";
      let state = "";
      let zip = "";

      for (const component of place.address_components) {
        const type = component.types[0];
        switch (type) {
          case "street_number":
            streetNumber = component.long_name;
            break;
          case "route":
            route = component.long_name;
            break;
          case "locality":
          case "sublocality_level_1":
            if (!city) city = component.long_name;
            break;
          case "administrative_area_level_1":
            state = component.short_name;
            break;
          case "postal_code":
            zip = component.long_name;
            break;
          default:
            break;
        }
      }

      const streetAddress = `${streetNumber} ${route}`.trim();

      setMapCenter({ lat, lng });
      onAddressSelectRef.current({
        street_address: streetAddress,
        city,
        state,
        zip,
        latitude: lat,
        longitude: lng,
      });
    });

    autocompleteRef.current = autocomplete;
  }, [apiReady]);

  // If formData already has valid lat/lng (e.g. after selection), show on map
  useEffect(() => {
    if (formData.latitude && formData.longitude) {
      setMapCenter({
        lat: Number(formData.latitude),
        lng: Number(formData.longitude),
      });
    }
  }, [formData.latitude, formData.longitude]);

  return (
    <>
      {/* Street Address — enhanced with Places Autocomplete */}
      <div className="mb-3">
        <label className="form-label">
          <strong>
            Street Address <span className="text-danger">*</span>
          </strong>
        </label>
        <input
          ref={inputRef}
          type="text"
          className="form-control"
          name="street_address"
          placeholder="Start typing an address…"
          value={formData.street_address}
          onChange={onChange}
          required
          autoComplete="off"
        />
        {loadError ? (
          <small className="text-danger">
            Could not load address suggestions. You can still type the address
            manually.
          </small>
        ) : (
          <small className="text-muted">
            Select a suggestion to auto-fill city, state, zip and verify the
            location on the map.
          </small>
        )}
      </div>

      {/* City / State / Zip — auto-filled by autocomplete, still editable */}
      <div className="row mb-3">
        <div className="col-md-5">
          <label className="form-label">
            <strong>
              City <span className="text-danger">*</span>
            </strong>
          </label>
          <input
            type="text"
            className="form-control"
            name="city"
            placeholder="City"
            value={formData.city}
            onChange={onChange}
            required
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">
            <strong>
              State <span className="text-danger">*</span>
            </strong>
          </label>
          <input
            type="text"
            className="form-control"
            name="state"
            placeholder="State"
            value={formData.state}
            onChange={onChange}
            maxLength={2}
            required
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">
            <strong>
              Zip Code <span className="text-danger">*</span>
            </strong>
          </label>
          <input
            type="text"
            className="form-control"
            name="zip"
            placeholder="Zip Code"
            value={formData.zip}
            onChange={onChange}
            maxLength={9}
            required
          />
        </div>
      </div>

      {/* Confirmation that address was verified */}
      {mapCenter && (
        <div className="mb-3">
          <small className="text-success">
            ✓ Address verified (lat: {mapCenter.lat.toFixed(4)}, lng:{" "}
            {mapCenter.lng.toFixed(4)})
          </small>
        </div>
      )}
    </>
  );
}

/**
 * AddressAutocomplete
 *
 * Drop-in replacement for the address input section of a form.
 * Loads the Google Places Autocomplete directly (no Map ID needed)
 * and shows a static map image preview.
 *
 * Props:
 *   formData        – object with street_address, city, state, zip (and optionally latitude, longitude)
 *   onChange         – standard input onChange handler for manual edits
 *   onAddressSelect – called with { street_address, city, state, zip, latitude, longitude }
 *                     when the user picks a Places suggestion
 */
function AddressAutocomplete({ formData, onChange, onAddressSelect }) {
  if (!API_KEY) {
    // Fall back to plain inputs if no API key is configured
    return <AddressFieldsFallback formData={formData} onChange={onChange} />;
  }

  return (
    <AddressFields
      formData={formData}
      onChange={onChange}
      onAddressSelect={onAddressSelect}
    />
  );
}

/**
 * Plain address fields (no autocomplete) used when the API key is missing.
 */
function AddressFieldsFallback({ formData, onChange }) {
  return (
    <>
      <div className="mb-3">
        <label className="form-label">
          <strong>
            Street Address <span className="text-danger">*</span>
          </strong>
        </label>
        <input
          type="text"
          className="form-control"
          name="street_address"
          placeholder="Enter street address"
          value={formData.street_address}
          onChange={onChange}
          required
        />
      </div>
      <div className="row mb-3">
        <div className="col-md-5">
          <label className="form-label">
            <strong>
              City <span className="text-danger">*</span>
            </strong>
          </label>
          <input
            type="text"
            className="form-control"
            name="city"
            placeholder="City"
            value={formData.city}
            onChange={onChange}
            required
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">
            <strong>
              State <span className="text-danger">*</span>
            </strong>
          </label>
          <input
            type="text"
            className="form-control"
            name="state"
            placeholder="State"
            value={formData.state}
            onChange={onChange}
            maxLength={2}
            required
          />
        </div>
        <div className="col-md-4">
          <label className="form-label">
            <strong>
              Zip Code <span className="text-danger">*</span>
            </strong>
          </label>
          <input
            type="text"
            className="form-control"
            name="zip"
            placeholder="Zip Code"
            value={formData.zip}
            onChange={onChange}
            maxLength={9}
            required
          />
        </div>
      </div>
    </>
  );
}

export default AddressAutocomplete;
