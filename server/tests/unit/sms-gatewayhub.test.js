import { describe, it, expect, vi } from "vitest";
import { smsGatewayHubSend } from "../../src/core/sms/sms.js";

const cfg = {
  apiKey: "KEY 1",
  senderId: "ABACCO",
  route: "1",
  entityId: "1201",
  templateId: "1207",
  templateText:
    "{otp} is your OTP for Abacco Technology CRM login verification. OTP valid for 10 minutes. Do not share this OTP with anyone.",
};
const reply = (status, body) =>
  vi.fn(async () => ({ ok: status < 400, status, json: async () => body }));

describe("SMS Gateway Hub OTP SMS", () => {
  it("sends the DLT text with the code to 91 + number, with all DLT parameters", async () => {
    const f = reply(200, {
      ErrorCode: "000",
      ErrorMessage: "Done",
      JobId: "381a8090",
    });
    const r = await smsGatewayHubSend(cfg, "9876543210", "042517", f);
    expect(r).toEqual({ delivered: true, jobId: "381a8090" });
    const url = new URL(f.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe(
      "https://www.smsgatewayhub.com/api/mt/SendSMS",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      APIKey: "KEY 1",
      senderid: "ABACCO",
      channel: "2",
      DCS: "0",
      flashsms: "0",
      number: "919876543210",
      text: "042517 is your OTP for Abacco Technology CRM login verification. OTP valid for 10 minutes. Do not share this OTP with anyone.",
      route: "1",
      EntityId: "1201",
      dlttemplateid: "1207",
    });
  });

  it('any ErrorCode other than "000", an HTTP error or no connection is a failed send', async () => {
    await expect(
      smsGatewayHubSend(
        cfg,
        "9876543210",
        "111111",
        reply(200, { ErrorCode: "13", ErrorMessage: "Invalid template text" }),
      ),
    ).rejects.toMatchObject({ code: "SMS_FAILED" });
    await expect(
      smsGatewayHubSend(cfg, "9876543210", "111111", reply(503, {})),
    ).rejects.toMatchObject({ code: "SMS_FAILED" });
    await expect(
      smsGatewayHubSend(
        cfg,
        "9876543210",
        "111111",
        vi.fn(async () => {
          throw new TypeError("fetch failed");
        }),
      ),
    ).rejects.toMatchObject({ code: "SMS_FAILED" });
  });
});
