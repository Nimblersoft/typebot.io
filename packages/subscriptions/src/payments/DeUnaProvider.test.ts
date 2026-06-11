import { afterEach, describe, expect, it, spyOn } from "bun:test";
import { createHmac } from "node:crypto";
import { createDeUnaProvider } from "./DeUnaProvider";

const config = {
  apiBaseUrl: "https://apigw.example.com",
  apiKey: "test-key",
  merchantId: "merchant-1",
  webhookSecret: "shhh",
};

const sign = (body: unknown) =>
  createHmac("sha256", config.webhookSecret)
    .update(JSON.stringify(body))
    .digest("hex");

describe("DeUnaProvider.verifyWebhook", () => {
  const provider = createDeUnaProvider(config);

  const validPayload = {
    order: {
      order_id: "ord_123",
      status: "succeeded",
      amount: 15000,
      metadata: { nimblerbotInvoiceId: "inv_1" },
    },
  };

  it("parses a valid, correctly-signed webhook", async () => {
    const result = await provider.verifyWebhook!(
      validPayload,
      sign(validPayload),
    );
    expect(result).toEqual({
      invoiceId: "inv_1",
      providerRef: "ord_123",
      amountUsd: 150,
      status: "succeeded",
    });
  });

  it("throws on a bad signature", async () => {
    await expect(
      provider.verifyWebhook!(validPayload, "deadbeef"),
    ).rejects.toThrow(/signature/i);
  });

  it("throws when nimblerbotInvoiceId metadata is missing", async () => {
    const payload = {
      order: { order_id: "ord_9", status: "succeeded", amount: 100 },
    };
    await expect(
      provider.verifyWebhook!(payload, sign(payload)),
    ).rejects.toThrow(/nimblerbotInvoiceId/);
  });

  it("maps non-succeeded statuses to failed", async () => {
    const payload = {
      order: {
        order_id: "ord_5",
        status: "declined",
        amount: 100,
        metadata: { nimblerbotInvoiceId: "inv_5" },
      },
    };
    const result = await provider.verifyWebhook!(payload, sign(payload));
    expect(result.status).toBe("failed");
  });
});

describe("DeUnaProvider.createPaymentLink", () => {
  const fetchSpy = spyOn(globalThis, "fetch");
  afterEach(() => {
    fetchSpy.mockReset();
  });

  const invoice = {
    id: "inv_1",
    workspaceId: "ws_1",
    totalUsd: 150,
    dueAt: null,
  };

  it("posts a PAYMENT_LINK order and returns the link", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          payment_link: "https://pay.example.com/inv_1",
          order_token: "tok_abc",
          order_id: "ord_1",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const provider = createDeUnaProvider(config);
    const result = await provider.createPaymentLink!(invoice);

    expect(result).toEqual({
      providerRef: "tok_abc",
      paymentLink: "https://pay.example.com/inv_1",
    });

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://apigw.example.com/merchants/orders");
    const body = JSON.parse(String(init?.body));
    expect(body.order_type).toBe("PAYMENT_LINK");
    expect(body.amount).toBe(15000);
    expect(body.metadata.nimblerbotInvoiceId).toBe("inv_1");
  });

  it("throws when the API responds non-2xx", async () => {
    fetchSpy.mockResolvedValue(new Response("boom", { status: 500 }));

    const provider = createDeUnaProvider(config);
    await expect(provider.createPaymentLink!(invoice)).rejects.toThrow(
      /DeUna createOrder failed 500/,
    );
  });
});
