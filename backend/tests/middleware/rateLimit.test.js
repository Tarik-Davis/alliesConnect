const { rateLimit } = require("../../middleware/rateLimit");

describe("rateLimit middleware", () => {
  let middleware;
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      ip: "127.0.0.1",
      headers: { "x-user-id": "42" },
      connection: { remoteAddress: "127.0.0.1" },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    // Clear any cleanup timers created by the middleware
    if (middleware && middleware._cleanup) {
      clearInterval(middleware._cleanup);
    }
  });

  it("should call next() when under the limit", () => {
    middleware = rateLimit({ windowMs: 60000, max: 5 });
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should set X-RateLimit-Limit and X-RateLimit-Remaining headers", () => {
    middleware = rateLimit({ windowMs: 60000, max: 10 });
    middleware(req, res, next);

    expect(res.set).toHaveBeenCalledWith("X-RateLimit-Limit", "10");
    expect(res.set).toHaveBeenCalledWith("X-RateLimit-Remaining", "9");
  });

  it("should decrement remaining count with each request", () => {
    middleware = rateLimit({ windowMs: 60000, max: 5 });

    middleware(req, res, next);
    expect(res.set).toHaveBeenCalledWith("X-RateLimit-Remaining", "4");

    middleware(req, res, next);
    expect(res.set).toHaveBeenCalledWith("X-RateLimit-Remaining", "3");

    middleware(req, res, next);
    expect(res.set).toHaveBeenCalledWith("X-RateLimit-Remaining", "2");
  });

  it("should return 429 when limit is exceeded", () => {
    middleware = rateLimit({ windowMs: 60000, max: 2 });

    middleware(req, res, next); // 1st
    middleware(req, res, next); // 2nd (at limit)

    // Reset mocks to check the 3rd call clearly
    next.mockClear();
    res.status.mockClear();
    res.json.mockClear();

    middleware(req, res, next); // 3rd - should be blocked

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      error: "Too many requests, please try again later.",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should set Retry-After header when rate limited", () => {
    middleware = rateLimit({ windowMs: 60000, max: 1 });

    middleware(req, res, next); // 1st - OK
    res.set.mockClear();

    middleware(req, res, next); // 2nd - blocked

    expect(res.set).toHaveBeenCalledWith("Retry-After", expect.any(String));
    const retryAfter = Number(
      res.set.mock.calls.find((c) => c[0] === "Retry-After")[1],
    );
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it("should use custom message when provided", () => {
    const customMsg = "Slow down!";
    middleware = rateLimit({ windowMs: 60000, max: 1, message: customMsg });

    middleware(req, res, next); // 1st - OK
    middleware(req, res, next); // 2nd - blocked

    expect(res.json).toHaveBeenCalledWith({ error: customMsg });
  });

  it("should track different users separately", () => {
    middleware = rateLimit({ windowMs: 60000, max: 1 });

    const req1 = { ...req, headers: { "x-user-id": "1" } };
    const req2 = { ...req, headers: { "x-user-id": "2" } };

    middleware(req1, res, next); // user 1, 1st
    middleware(req2, res, next); // user 2, 1st

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalledWith(429);
  });

  it("should track different IPs separately", () => {
    middleware = rateLimit({ windowMs: 60000, max: 1 });

    const req1 = { ...req, ip: "10.0.0.1" };
    const req2 = { ...req, ip: "10.0.0.2" };

    middleware(req1, res, next); // IP 1
    middleware(req2, res, next); // IP 2

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalledWith(429);
  });

  it("should fall back to 'anon' when x-user-id header is missing", () => {
    middleware = rateLimit({ windowMs: 60000, max: 2 });

    const anonReq = { ip: "127.0.0.1", headers: {}, connection: {} };

    middleware(anonReq, res, next);
    middleware(anonReq, res, next);

    expect(next).toHaveBeenCalledTimes(2);

    next.mockClear();
    middleware(anonReq, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it("should reset counter after the window expires", () => {
    jest.useFakeTimers();

    middleware = rateLimit({ windowMs: 1000, max: 1 });

    middleware(req, res, next); // 1st - OK

    next.mockClear();
    middleware(req, res, next); // 2nd - blocked
    expect(next).not.toHaveBeenCalled();

    // Advance past the window
    jest.advanceTimersByTime(1100);

    next.mockClear();
    res.status.mockClear();

    middleware(req, res, next); // Should be allowed again
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(429);

    jest.useRealTimers();
  });

  it("should use default options when none are provided", () => {
    middleware = rateLimit();

    // Should allow at least one request with defaults (max: 20)
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.set).toHaveBeenCalledWith("X-RateLimit-Limit", "20");
    expect(res.set).toHaveBeenCalledWith("X-RateLimit-Remaining", "19");
  });

  it("should show 0 remaining when at the limit", () => {
    middleware = rateLimit({ windowMs: 60000, max: 2 });

    middleware(req, res, next); // 1st
    res.set.mockClear();
    middleware(req, res, next); // 2nd - at limit

    expect(res.set).toHaveBeenCalledWith("X-RateLimit-Remaining", "0");
    expect(next).toHaveBeenCalled(); // still allowed
  });
});
