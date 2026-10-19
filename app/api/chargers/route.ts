const env=process.env;
import { privateJson as json, useGoogleAllowance } from '../../lib/google-places-server';
import { validPoint, stationFromGoogle, type Point } from '../../lib/stations';

async function search(query: string, point?: Point) {
  if(!env.GOOGLE_PLACES_API_KEY) return json({message:'Detailed station cards are not available here yet. Explore real stations, photos and directions in the Google map below.'},503);
  try {
    if(!await useGoogleAllowance()) return json({message:'The on-site request allowance has been reached. Continue exploring in Google Maps.'},429);
    const fieldMask='places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.location,places.businessStatus,places.attributions,places.evChargeOptions,places.currentOpeningHours,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.photos,places.googleMapsLinks';
    const body=point ? {includedTypes:['electric_vehicle_charging_station'],maxResultCount:20,rankPreference:'DISTANCE',locationRestriction:{circle:{center:point,radius:25000}},languageCode:'en'} : {textQuery:`Electric vehicle charging stations near ${query}, India`,includedType:'electric_vehicle_charging_station',strictTypeFiltering:true,regionCode:'IN',languageCode:'en',pageSize:20};
    const response=await fetch(`https://places.googleapis.com/v1/places:${point?'searchNearby':'searchText'}`,{method:'POST',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json','X-Goog-Api-Key':env.GOOGLE_PLACES_API_KEY,'X-Goog-FieldMask':fieldMask},body:JSON.stringify(body)});
    if(!response.ok) return json({message:'Detailed station information is unavailable right now. Explore the Google map or contact the station operator.'},502);
    const data=await response.json() as {places?:Parameters<typeof stationFromGoogle>[0][]};
    return json({stations:(data.places||[]).map(stationFromGoogle).filter(Boolean),fetchedAt:new Date().toISOString()});
  } catch { return json({message:'Station details could not be loaded. Continue exploring in Google Maps.'},503); }
}
export async function GET(request: Request) {
  const query=new URL(request.url).searchParams.get('q')?.trim()||'';
  if(query.length<2 || query.length>120) return json({message:'Enter a city, neighbourhood or PIN code between 2 and 120 characters.'},400);
  return search(query);
}
export async function POST(request: Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return json({message:'This location request must come from ChargeNeighbour.'},403);
  if(!request.headers.get('content-type')?.includes('application/json')) return json({message:'Use a JSON location request.'},415);
  const text=await request.text();
  if(text.length>500) return json({message:'The location request is too large.'},413);
  try {
    const value=JSON.parse(text);
    if(!validPoint(value)) return json({message:'A valid latitude and longitude are required.'},400);
    return search('',{latitude:value.latitude,longitude:value.longitude});
  } catch { return json({message:'The location request could not be read.'},400); }
}
