import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lookupLocation } from "../lib/location/lookup";
import { authorityForPostcode, councilContact } from "../lib/location/councils";
import { extractPostcode, lookupPostcode, nearestPostcode, type PostcodeRecord } from "../lib/location/postcodes";

const api = vi.hoisted(() => vi.fn());
vi.mock("../lib/location/http", () => ({ providerJson: api }));

const hackney: PostcodeRecord = {
  postcode: "E8 1DY", country: "England", latitude: 51.54532, longitude: -0.057953,
  admin_district: "Hackney", admin_county: null,
  codes: { admin_district: "E09000012", admin_county: "E99999999" },
};
const kent: PostcodeRecord = {
  ...hackney, postcode: "BR8 7RE", admin_district: "Sevenoaks", admin_county: "Kent",
  codes: { admin_district: "E07000111", admin_county: "E10000016" },
};
const feature = (changes = {}) => ({
  properties: { osm_type: "W", osm_id: 416439002, countrycode: "GB", type: "house", housenumber: "282", street: "Mare Street", city: "London", postcode: "E8 1DY", ...changes },
  geometry: { type: "Point", coordinates: [-0.0549146, 51.545311] },
});
beforeEach(() => { api.mockReset(); });
afterEach(() => vi.useRealTimers());

describe("UK postcode and authority selection", () => {
  it("normalises a full postcode found within an address", () => {
    expect(extractPostcode("19 Mare Street, e81dy")).toBe("E8 1DY");
    expect(extractPostcode("GIR 0AA")).toBe("GIR 0AA");
    expect(extractPostcode("Mare Street London")).toBeNull();
  });
  it("prefers the English county highway authority over a two-tier district", () => {
    expect(authorityForPostcode(kent)?.name).toBe("Kent County Council");
    expect(authorityForPostcode({ ...kent, codes: { ...kent.codes, admin_county: null } })?.name).toBe("Kent County Council");
    expect(authorityForPostcode(hackney)?.name).toBe("London Borough of Hackney");
  });
  it("does not use a directory record from the wrong country", () => {
    expect(authorityForPostcode({ ...hackney, country: "Wales" })).toBeNull();
  });
  it("handles unknown or unavailable postcode data", async () => {
    api.mockResolvedValue(null);
    expect(await lookupPostcode("ZZ1 1ZZ")).toBeNull();
    expect(await nearestPostcode({ lat: 51.5, lng: 0 })).toBeNull();
    api.mockResolvedValue({ result: [] });
    expect(await nearestPostcode({ lat: 51.5, lng: 0 })).toBeNull();
  });
});

describe("verified reporting contacts", () => {
  it("uses Hackney's published reporting email only for Hackney", async () => {
    const result = await councilContact(hackney);
    expect(result.council?.email).toBe("Highway.Inspectors@hackney.gov.uk");
    expect(result.council?.sourceUrl).toContain("hackney.gov.uk/");
    expect(api).not.toHaveBeenCalled();
  });
  it("routes Northern Ireland public roads to DfI rather than the district council", async () => {
    const result = await councilContact({ ...hackney, country: "Northern Ireland", admin_district: "Belfast", codes: { admin_district: "N09000003", admin_county: null } });
    expect(result.council?.name).toBe("DfI Roads");
    expect(result.council?.reportingUrl).toContain("nidirect.gov.uk/services/report-pothole");
    expect(result.council?.email).toBeUndefined();
  });
  it("uses only a matching current official pothole service link", async () => {
    api.mockResolvedValue({ local_authority: { gss: "E10000016" }, local_interaction: {
      lgsl_code: 557, lgil_code: 17, status: "ok", url: "https://www.kent.gov.uk/roads-and-travel/report-a-problem",
    } });
    const result = await councilContact(kent);
    expect(result.council?.reportingUrl).toBe("https://www.kent.gov.uk/roads-and-travel/report-a-problem");
    expect(result.council?.sourceUrl).toContain("local-links-manager.publishing.service.gov.uk/api/link?");
    expect(result.council?.email).toBeUndefined();
    expect(api.mock.calls[0][0].searchParams.get("authority_slug")).toBe("kent");
  });
  it.each([
    { status: "broken", url: "https://www.kent.gov.uk/report" },
    { status: "ok", url: "http://www.kent.gov.uk/report" },
    { status: "ok", url: "javascript:alert(1)" },
  ])("rejects unverified or unsafe published links %j", async interaction => {
    api.mockResolvedValue({ local_authority: { gss: "E10000016" }, local_interaction: { lgsl_code: 557, lgil_code: 17, ...interaction } });
    const result = await councilContact(kent);
    expect(result.council?.reportingUrl).toBe("https://www.gov.uk/report-pothole");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it("rejects a mismatched authority response", async () => {
    api.mockResolvedValue({ local_authority: { gss: "E09000033" }, local_interaction: { lgsl_code: 557, lgil_code: 17, status: "ok", url: "https://westminster.gov.uk/report" } });
    expect((await councilContact(kent)).council?.reportingUrl).toBe("https://www.gov.uk/report-pothole");
  });
  it("preserves official websites and Scottish national reporting fallback during outages", async () => {
    api.mockRejectedValue(new Error("offline"));
    const result = await councilContact({ ...hackney, country: "Scotland", codes: { admin_district: "S12000036", admin_county: null } });
    expect(result.council?.website).toBe("https://www.edinburgh.gov.uk/");
    expect(result.council?.reportingUrl).toBe("https://www.mygov.scot/report-pothole");
  });
  it("does not invent an authority when the directory cannot match it", async () => {
    const result = await councilContact({ ...hackney, codes: { admin_district: null, admin_county: null } });
    expect(result.council).toBeNull();
    expect(result.warnings).not.toHaveLength(0);
  });
});

describe("complete address lookup", () => {
  it("looks up a pure postcode without calling the address geocoder", async () => {
    api.mockResolvedValue({ result: hackney });
    const result = await lookupLocation({ query: "e81dy" });
    expect(result.candidates[0]).toMatchObject({ accuracy: "postcode", postcode: "E8 1DY", council: { id: "E09000012" } });
    expect(result.candidates[0].warnings.join(" ")).toContain("postcode centre");
    expect(api).toHaveBeenCalledTimes(1);
    expect(api.mock.calls[0][0].hostname).toBe("api.postcodes.io");
  });
  it("returns precise address candidates and official reporting contacts", async () => {
    api.mockImplementation(async (url: URL) => url.hostname === "photon.komoot.io" ? { features: [feature()] } : { result: hackney });
    const result = await lookupLocation({ query: "282 Mare Street London" });
    expect(result.candidates[0]).toMatchObject({
      label: "282 Mare Street, London, E8 1DY", accuracy: "address",
      location: { lat: 51.545311, lng: -0.0549146 }, council: { email: "Highway.Inspectors@hackney.gov.uk" },
    });
    expect(api.mock.calls[0][0].searchParams.get("countrycode")).toBe("GB");
    expect(result.attribution).toContain("OpenStreetMap");
  });
  it("bounds three slow candidate chains in parallel within the route time budget", async () => {
    vi.useFakeTimers();
    api.mockImplementation(async (url: URL) => {
      await new Promise(resolve => setTimeout(resolve, 7000));
      if (url.hostname === "photon.komoot.io") return { features: [
        feature({ osm_id: 1, postcode: "BR8 7RE" }), feature({ osm_id: 2, postcode: "DA1 1AA" }), feature({ osm_id: 3, postcode: "TN1 1AA" }),
      ] };
      if (url.hostname === "api.postcodes.io") return { result: kent };
      return { local_authority: { gss: "E10000016" }, local_interaction: {
        lgsl_code: 557, lgil_code: 17, status: "ok", url: "https://www.kent.gov.uk/roads-and-travel/report-a-problem",
      } };
    });
    const result = lookupLocation({ query: "Three address suggestions" });
    let finished = false;
    void result.then(() => { finished = true; });
    await vi.advanceTimersByTimeAsync(20_999);
    expect(finished).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await result).candidates).toHaveLength(3);
    expect(finished).toBe(true);
  });
  it("falls back to a labelled postcode centre when address search fails", async () => {
    api.mockImplementation(async (url: URL) => {
      if (url.hostname === "photon.komoot.io") throw new Error("offline");
      return { result: hackney };
    });
    expect((await lookupLocation({ query: "19 Mare Street E8 1DY" })).candidates[0].accuracy).toBe("postcode");
  });
  it("rejects a failed address query with no postcode fallback", async () => {
    api.mockRejectedValue(new Error("offline"));
    await expect(lookupLocation({ query: "Mare Street London" })).rejects.toThrow("offline");
  });
  it("keeps address suggestions usable during council lookup failures", async () => {
    api.mockImplementation(async (url: URL) => {
      if (url.hostname === "photon.komoot.io") return { features: [feature({ housenumber: undefined, postcode: undefined })] };
      throw new Error("postcode provider unavailable");
    });
    const result = await lookupLocation({ query: "Mare Street London" });
    expect(result.candidates[0].accuracy).toBe("street");
    expect(result.candidates[0].council).toBeNull();
  });
  it("ignores non-UK, malformed and out-of-range results", async () => {
    api.mockResolvedValue({ features: [feature({ countrycode: "US" }), {}, { ...feature(), geometry: { type: "Point", coordinates: [-74, 40] } }] });
    await expect(lookupLocation({ query: "Unmatched Road" })).rejects.toMatchObject({ code: "LOCATION_NOT_FOUND" });
  });
  it("handles invalid provider payloads and postcodes without coordinates", async () => {
    api.mockResolvedValue({ invalid: true });
    await expect(lookupLocation({ query: "Some Road" })).rejects.toMatchObject({ status: 404 });
    api.mockResolvedValue({ result: { ...hackney, latitude: null } });
    await expect(lookupLocation({ query: "E8 1DY" })).rejects.toMatchObject({ status: 404 });
  });
  it("preserves the exact user pin instead of replacing it with a postcode centre", async () => {
    api.mockResolvedValue({ result: [hackney] });
    const location = { lat: 51.544567, lng: -0.056789 };
    const result = await lookupLocation(location);
    expect(result.candidates[0]).toMatchObject({ location, accuracy: "pin", country: "England" });
    expect(result.candidates[0].warnings.join(" ")).toContain("nearest postcode");
    expect(api.mock.calls[0][0].searchParams.get("radius")).toBe("2000");
  });
  it("can return an unclassified pin without inventing a council", async () => {
    api.mockResolvedValue({ result: null });
    const result = await lookupLocation({ lat: 55, lng: -4 });
    expect(result.candidates[0]).toMatchObject({ label: "Selected map pin", country: null, council: null });
  });
});
