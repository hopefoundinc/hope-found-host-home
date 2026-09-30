const CENSUS_GEOCODER_URL = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';

// Free, no API key, official U.S. government geocoder — chosen so this check
// doesn't require Hope Found to set up yet another paid account (e.g. Google
// Maps Platform billing) just to verify a mailing address.
export async function geocodeAddress(addressLine) {
  const url = `${CENSUS_GEOCODER_URL}?address=${encodeURIComponent(addressLine)}&benchmark=Public_AR_Current&format=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Census geocoder failed: ${res.status}`);
  }
  const data = await res.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;
  return { lat: match.coordinates.y, lng: match.coordinates.x };
}
