const https = require("https");

/**
 * Geocode a street address into latitude / longitude using the
 * Google Maps Geocoding API.
 *
 * @param {object} address
 * @param {string} address.street  – street address line
 * @param {string} address.city
 * @param {string} address.state   – two-letter state code
 * @param {string} address.zip
 * @returns {Promise<{lat: number, lng: number} | null>}
 *   Resolves with `{ lat, lng }` on success, or `null` when the
 *   address could not be geocoded.
 */
function geocodeAddress({ street, city, state, zip }) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("GOOGLE_MAPS_API_KEY is not set in .env");
      return resolve(null);
    }

    const addressString = `${street}, ${city}, ${state} ${zip}`;
    const encodedAddress = encodeURIComponent(addressString);
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodedAddress}&key=${apiKey}`;

    https
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);

            if (
              json.status === "OK" &&
              json.results &&
              json.results.length > 0
            ) {
              const { lat, lng } = json.results[0].geometry.location;
              resolve({ lat, lng });
            } else {
              console.warn(
                `Geocoding returned status "${json.status}" for: ${addressString}`,
              );
              resolve(null);
            }
          } catch (parseErr) {
            console.error("Failed to parse geocoding response:", parseErr);
            resolve(null);
          }
        });
      })
      .on("error", (err) => {
        console.error("Geocoding request failed:", err);
        resolve(null);
      });
  });
}

module.exports = { geocodeAddress };
