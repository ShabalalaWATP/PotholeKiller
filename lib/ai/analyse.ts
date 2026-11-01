import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { RequestFailure } from "../security/errors";
import { ANALYSIS_PROMPT } from "./prompt";
import { defectAnalysisSchema, type DefectAnalysis } from "./schema";

export async function analysePhotograph(imageDataUrl: string): Promise<DefectAnalysis> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new RequestFailure(503, "NOT_CONFIGURED", "Live scanning is not configured yet. Try a labelled sample, or add the server API key.");
  }
  const client = new OpenAI({ apiKey: key, timeout: 45_000, maxRetries: 0 });
  try {
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL || "gpt-6.1-terra",
      store: false,
      max_output_tokens: 2200,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: ANALYSIS_PROMPT },
        { role: "user", content: [
          { type: "input_text", text: "Assess this photograph. Do not infer where it was taken." },
          { type: "input_image", image_url: imageDataUrl, detail: "auto" },
        ] },
      ],
      text: { format: zodTextFormat(defectAnalysisSchema, "defect_analysis") },
    });
    const result = defectAnalysisSchema.safeParse(response.output_parsed);
    if (!result.success) {
      throw new RequestFailure(502, "INVALID_ASSESSMENT", "The scanner could not produce a reliable assessment. Please retry or use another photograph.");
    }
    return result.data;
  } catch (error) {
    if (error instanceof RequestFailure) throw error;
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      throw new RequestFailure(504, "SCAN_TIMEOUT", "The live scan took too long. Please retry, or use a labelled sample.");
    }
    // Do not return or log provider errors: they can include request details.
    throw new RequestFailure(502, "PROVIDER_UNAVAILABLE", "The live scanner is unavailable. Please retry, or try a labelled sample.");
  }
}
