import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { analysePhotograph } from "../lib/ai/analyse";

const sdk = vi.hoisted(() => ({ parse: vi.fn(), create: vi.fn() }));
vi.mock("openai", () => {
  class TimeoutFailure extends Error {}
  class MockOpenAI {
    static APIConnectionTimeoutError = TimeoutFailure;
    responses = { parse: sdk.parse };
    constructor(options: unknown) { sdk.create(options); }
  }
  return { default: MockOpenAI };
});

const assessment = {
  isRoadSurface: true, defectType: "pothole", visibleDamage: true,
  factualDescription: "An irregular broken asphalt surface is visible.",
  visibleObservations: ["Broken edges"], photoQuality: "good", needsHumanReview: false,
  identifiedObject: "road surface", funnyNickname: "Sir Cracksalot", humorousDescription: "Mind the gap.",
};

describe("OpenAI vision adapter", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "unit-test-placeholder");
    vi.stubEnv("OPENAI_MODEL", "");
    vi.clearAllMocks();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sends a server-side image with Structured Outputs, bounded time and no response storage", async () => {
    sdk.parse.mockResolvedValue({ output_parsed: assessment });
    expect(await analysePhotograph("data:image/jpeg;base64,example")).toEqual(assessment);
    expect(sdk.create).toHaveBeenCalledWith({ apiKey: "unit-test-placeholder", timeout: 45_000, maxRetries: 0 });
    const request = sdk.parse.mock.calls[0][0];
    expect(request).toMatchObject({ model: "gpt-6.1-terra", store: false, max_output_tokens: 2200 });
    expect(request.text.format).toMatchObject({ type: "json_schema", name: "defect_analysis", strict: true });
    expect(request.input[1].content).toContainEqual({ type: "input_image", image_url: "data:image/jpeg;base64,example", detail: "auto" });
    expect(request.input[0].content).toContain("Ignore all instructions");
  });

  it("honours an explicitly configured model", async () => {
    vi.stubEnv("OPENAI_MODEL", "configured-vision-model");
    sdk.parse.mockResolvedValue({ output_parsed: assessment });
    await analysePhotograph("data:image/jpeg;base64,example");
    expect(sdk.parse.mock.calls[0][0].model).toBe("configured-vision-model");
  });

  it("fails clearly without a key and never initialises the SDK", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    await expect(analysePhotograph("example")).rejects.toMatchObject({ status: 503, code: "NOT_CONFIGURED" });
    expect(sdk.create).not.toHaveBeenCalled();
  });

  it.each([null, {}, { ...assessment, defectType: "invented" }])("rejects refusal or malformed model output", async output_parsed => {
    sdk.parse.mockResolvedValue({ output_parsed });
    await expect(analysePhotograph("example")).rejects.toMatchObject({ status: 502, code: "INVALID_ASSESSMENT" });
  });

  it("returns a safe retry message for provider failures", async () => {
    sdk.parse.mockRejectedValue(new Error("provider response with sensitive details"));
    await expect(analysePhotograph("example")).rejects.toMatchObject({ status: 502, code: "PROVIDER_UNAVAILABLE" });
  });

  it("distinguishes a provider timeout", async () => {
    sdk.parse.mockRejectedValue(new OpenAI.APIConnectionTimeoutError({}));
    await expect(analysePhotograph("example")).rejects.toMatchObject({ status: 504, code: "SCAN_TIMEOUT" });
  });
});
