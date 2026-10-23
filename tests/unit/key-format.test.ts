import { describe, expect, it } from "vitest";
import { apiKeyFormatIssue } from "@/lib/football/key-format";

/** A well-formed API-Sports key: 64 hexadecimal characters. */
const VALID = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("apiKeyFormatIssue", () => {
  it("accepts a well-formed API-Sports key (case-insensitive)", () => {
    expect(apiKeyFormatIssue(VALID)).toBeNull();
    expect(apiKeyFormatIssue(VALID.toUpperCase())).toBeNull();
  });

  it("ignores absence — that case is reported as 'not configured' elsewhere", () => {
    expect(apiKeyFormatIssue(null)).toBeNull();
    expect(apiKeyFormatIssue(undefined)).toBeNull();
    expect(apiKeyFormatIssue("")).toBeNull();
  });

  it("detects the whole env line pasted as the value", () => {
    expect(apiKeyFormatIssue(`FOOTBALL_API_KEY=${VALID}`)).toMatch(/FOOTBALL_API_KEY=/);
    expect(apiKeyFormatIssue(`FOOTBALL_API_KEY=${VALID}`)).toMatch(/وحده/);
  });

  it("detects RapidAPI-style keys (32 hex chars or UUID)", () => {
    expect(apiKeyFormatIssue("0123456789abcdef0123456789abcdef")).toMatch(/RapidAPI/);
    expect(apiKeyFormatIssue("123e4567-e89b-12d3-a456-426614174000")).toMatch(/RapidAPI/);
  });

  it("detects internal whitespace from bad copy/paste", () => {
    const spaced = `${VALID.slice(0, 40)} ${VALID.slice(40)}`;
    expect(apiKeyFormatIssue(spaced)).toMatch(/مسافة/);
  });

  it("reports unexpected values with their length and the expected format", () => {
    const issue = apiKeyFormatIssue("my-secret-key");
    expect(issue).toMatch(/64/);
    expect(issue).toMatch(/13 حرفًا/);
  });
});
