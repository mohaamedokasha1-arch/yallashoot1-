import { describe, expect, it } from "vitest";
import { getMonitoringSnapshot, recordProviderRequest } from "@/lib/monitoring";

describe("provider request monitoring", () => {
  it("records the exact provider detail for failed requests", async () => {
    await recordProviderRequest({
      at: "2026-10-21T12:00:00.000Z",
      endpoint: "fixtures",
      params: "date=2026-10-21&timezone=Africa%2FCairo",
      status: 200,
      ok: false,
      ms: 42,
      errorKind: "auth",
      errorDetail: "token: Error/Missing application key.",
    });

    const mon = await getMonitoringSnapshot();
    expect(mon.lastError).not.toBeNull();
    expect(mon.lastError?.kind).toBe("auth");
    expect(mon.lastError?.detail).toBe("token: Error/Missing application key.");
    expect(mon.requests[0]?.errorDetail).toBe("token: Error/Missing application key.");
  });

  it("keeps lastError detail null when no detail is recorded", async () => {
    await recordProviderRequest({
      at: "2026-10-21T12:05:00.000Z",
      endpoint: "status",
      params: "",
      status: 500,
      ok: false,
      ms: 10,
      errorKind: "server",
    });

    const mon = await getMonitoringSnapshot();
    expect(mon.lastError?.kind).toBe("server");
    expect(mon.lastError?.detail).toBeNull();
  });
});
