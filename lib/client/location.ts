import { LocationLookupResultSchema, type LocationInput } from "@/lib/location/schema";

export async function findLocation(input: LocationInput, signal: AbortSignal) {
  const response = await fetch("/api/location", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input), signal, credentials: "same-origin",
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Location lookup is unavailable. Please try again.";
    throw new Error(error.slice(0, 300));
  }
  return LocationLookupResultSchema.parse(data);
}
