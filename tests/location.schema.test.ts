import { describe, expect, it } from "vitest";
import { CouncilContactSchema, LocationInputSchema, LocationLookupResultSchema } from "../lib/location/schema";

const council = {
  id: "E09000012", name: "London Borough of Hackney", website: "https://www.hackney.gov.uk/",
  reportingUrl: "https://www.hackney.gov.uk/parking-streets-and-transport/roads-streets-and-pavements/report-roads-streets-and-pavement-problems",
  sourceUrl: "https://www.hackney.gov.uk/parking-streets-and-transport/roads-streets-and-pavements/report-roads-streets-and-pavement-problems",
  email: "Highway.Inspectors@hackney.gov.uk",
};

describe("location boundary schemas", () => {
  it("accepts a trimmed UK address or bounded UK pin", () => {
    expect(LocationInputSchema.parse({ query: "  282 Mare Street, London  " })).toEqual({ query: "282 Mare Street, London" });
    expect(LocationInputSchema.parse({ lat: 54.6, lng: -5.9 })).toEqual({ lat: 54.6, lng: -5.9 });
  });
  it.each([
    {}, { query: "x" }, { query: "x".repeat(181) }, { query: "Road\ncommand" },
    { query: "London", lat: 51.5, lng: 0 }, { lat: 0, lng: 0 }, { lat: 51.5, lng: -100 },
    { lat: Number.NaN, lng: 0 }, { lat: 51.5, lng: 0, url: "https://untrusted.example" },
  ])("rejects ambiguous or excessive lookup input %j", input => {
    expect(LocationInputSchema.safeParse(input).success).toBe(false);
  });
  it("allows only bounded, published-contact-shaped metadata", () => {
    expect(CouncilContactSchema.parse(council)).toEqual(council);
    expect(CouncilContactSchema.safeParse({ ...council, extra: "untrusted" }).success).toBe(false);
    expect(CouncilContactSchema.safeParse({ ...council, name: "x".repeat(181) }).success).toBe(false);
    expect(CouncilContactSchema.safeParse({ ...council, email: "good@example.gov.uk\r\nBcc: someone@example.com" }).success).toBe(false);
  });
  it.each([
    "not-a-url", "javascript:alert(1)", "http://example.gov.uk", "https://user:password@example.gov.uk",
    "https://example.gov.uk/\ncontact", " https://example.gov.uk", "https://example.gov.uk/\u0000path",
    "https://www.hackney.gov.uk:8443/report", "https://127.0.0.1/report", "https://localhost/report",
  ])("rejects unsafe contact URL %s without throwing from safeParse", url => {
    expect(CouncilContactSchema.safeParse({ ...council, reportingUrl: url }).success).toBe(false);
  });
  it("rejects forged contacts even when they reuse a real council identity", () => {
    expect(CouncilContactSchema.safeParse({ ...council, reportingUrl: "https://attacker.example/report" }).success).toBe(false);
    expect(CouncilContactSchema.safeParse({ ...council, email: "reports@attacker.example" }).success).toBe(false);
    expect(CouncilContactSchema.safeParse({ ...council, sourceUrl: "https://attacker.example/source" }).success).toBe(false);
    expect(CouncilContactSchema.safeParse({ ...council, website: "https://attacker.example/" }).success).toBe(false);
    expect(CouncilContactSchema.safeParse({ ...council, id: "invented" }).success).toBe(false);
  });
  it("accepts an official county fallback without inventing an email", () => {
    const kent = {
      id: "E10000016", name: "Kent County Council", website: "https://www.kent.gov.uk/",
      reportingUrl: "https://www.gov.uk/report-pothole",
      sourceUrl: "https://github.com/alphagov/local-links-manager/blob/main/data/local-authorities.csv",
    };
    expect(CouncilContactSchema.safeParse(kent).success).toBe(true);
    expect(CouncilContactSchema.safeParse({ ...kent, email: "highways@kent.gov.uk" }).success).toBe(false);
    expect(CouncilContactSchema.safeParse({ ...kent, sourceUrl: "https://attacker.example" }).success).toBe(false);
    expect(CouncilContactSchema.safeParse({ ...kent, reportingUrl: "https://www.kent.gov.uk.attacker.example/report" }).success).toBe(false);
    expect(CouncilContactSchema.safeParse({ ...kent,
      reportingUrl: "https://report.kent.gov.uk/potholes",
      sourceUrl: "https://local-links-manager.publishing.service.gov.uk/api/link?authority_slug=kent&lgsl=557&lgil=17",
    }).success).toBe(true);
  });
  it("validates the entire response including bounded candidates", () => {
    const candidate = {
      id: "postcode-E81DY", label: "E8 1DY, Hackney", location: { lat: 51.54532, lng: -0.057953 },
      postcode: "E8 1DY", country: "England", accuracy: "postcode", council, warnings: ["Confirm the pin."],
    };
    const response = { candidates: [candidate], attribution: "Postcodes.io", warnings: [] };
    expect(LocationLookupResultSchema.parse(response)).toEqual(response);
    expect(LocationLookupResultSchema.safeParse({ ...response, candidates: Array(4).fill(candidate) }).success).toBe(false);
    expect(LocationLookupResultSchema.safeParse({ ...response, warnings: Array(9).fill("warning") }).success).toBe(false);
  });
});
