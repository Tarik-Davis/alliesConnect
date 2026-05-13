const request = require("supertest");
const app = require("../../server");
const mysql = require("mysql2");

const mockPool = mysql._mockPool;

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashedpassword"),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../middleware/permissions", () => ({
  requireRole: (pool, role) => {
    return (req, res, next) => {
      req.currentUser = { user_id: 1, roles: [role] };
      next();
    };
  },
}));

describe("Organizations API Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  // ── GET /api/organizations/verify-ein/:ein ────────────────────────

  describe("GET /api/organizations/verify-ein/:ein", () => {
    it("should return organization data for a valid EIN", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          organization: {
            name: "TEST NONPROFIT ORG",
            strein: "12-3456789",
            city: "Atlanta",
            state: "GA",
            address: "123 Main St",
            zipcode: "30303",
            ntee_code: "P20",
          },
        }),
      });

      const res = await request(app).get(
        "/api/organizations/verify-ein/12-3456789",
      );
      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toBe("TEST NONPROFIT ORG");
      expect(res.body.city).toBe("Atlanta");
      expect(res.body.state).toBe("GA");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://projects.propublica.org/nonprofits/api/v2/organizations/123456789.json",
      );
    });

    it("should return 404 when EIN is not found", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const res = await request(app).get(
        "/api/organizations/verify-ein/00-0000000",
      );
      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toMatch(/No organization found/i);
    });

    it("should return 400 for an EIN with wrong number of digits", async () => {
      const res = await request(app).get(
        "/api/organizations/verify-ein/12-345",
      );
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/9 digits/i);
    });

    it("should return 502 when ProPublica API returns a server error", async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const res = await request(app).get(
        "/api/organizations/verify-ein/12-3456789",
      );
      expect(res.statusCode).toEqual(502);
      expect(res.body.error).toMatch(/external service/i);
    });

    it("should return 500 when fetch throws a network error", async () => {
      global.fetch.mockRejectedValueOnce(new Error("Network error"));

      const res = await request(app).get(
        "/api/organizations/verify-ein/12-3456789",
      );
      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toMatch(/Failed to verify/i);
    });
  });

  // ── GET /api/organizations/profile/:id ────────────────────────────

  describe("GET /api/organizations/profile/:id", () => {
    it("should return the provider profile details", async () => {
      mockPool.promise().query.mockResolvedValueOnce([
        [
          {
            provider_id: 1,
            name: "Test Provider",
            contact_name: "Test Contact",
          },
        ],
      ]);

      const res = await request(app).get("/api/organizations/profile/1");
      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toBe("Test Provider");
    });

    it("should return 404 if provider not found", async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app).get("/api/organizations/profile/99");
      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  // ── POST /api/organizations/register ──────────────────────────────

  describe("POST /api/organizations/register", () => {
    it("should register a new organization", async () => {
      mockPool
        .promise()
        .query // 1: Check existing email
        .mockResolvedValueOnce([[]])
        // 2: Check existing username
        .mockResolvedValueOnce([[]])
        // 3: INSERT User
        .mockResolvedValueOnce([{ insertId: 10 }])
        // 4: INSERT UserProfile
        .mockResolvedValueOnce([{ insertId: 11 }])
        // 5: INSERT ServiceProvider
        .mockResolvedValueOnce([{ insertId: 12 }])
        // 6: INSERT ServiceProviderClaim
        .mockResolvedValueOnce([{ insertId: 13 }])
        // 7: INSERT UserRole
        .mockResolvedValueOnce([{ insertId: 14 }])
        // 8: INSERT ServiceProviderUser
        .mockResolvedValueOnce([{ insertId: 15 }]);

      const res = await request(app).post("/api/organizations/register").send({
        organization_name: "New Org",
        first_name: "Org",
        last_name: "Contact",
        email: "org@example.com",
        phone_number: "5551234567",
        username: "neworg",
        password: "Password1!",
        zip_code: "30303",
        ein: "12-3456789",
      });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toMatch(/registered successfully/i);
      expect(res.body.user_id).toBe(10);
      expect(res.body.provider_id).toBe(12);
    });

    it("should return 400 if required fields are missing", async () => {
      const res = await request(app).post("/api/organizations/register").send({
        email: "org@example.com",
        password: "Password1!",
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it("should return 400 for duplicate email", async () => {
      // Check existing email returns a match
      mockPool.promise().query.mockResolvedValueOnce([[{ user_id: 1 }]]);

      const res = await request(app).post("/api/organizations/register").send({
        organization_name: "New Org",
        first_name: "Org",
        last_name: "Contact",
        email: "existing@example.com",
        phone_number: "5551234567",
        username: "neworg",
        password: "Password1!",
        zip_code: "30303",
        ein: "12-3456789",
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it("should return 400 for weak password", async () => {
      const res = await request(app).post("/api/organizations/register").send({
        organization_name: "New Org",
        first_name: "Org",
        last_name: "Contact",
        email: "org@example.com",
        phone_number: "5551234567",
        username: "neworg",
        password: "weak",
        zip_code: "30303",
        ein: "12-3456789",
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/Password must be/i);
    });

    it("should return 400 for invalid EIN format", async () => {
      const res = await request(app).post("/api/organizations/register").send({
        organization_name: "New Org",
        first_name: "Org",
        last_name: "Contact",
        email: "org@example.com",
        phone_number: "5551234567",
        username: "neworg",
        password: "Password1!",
        zip_code: "30303",
        ein: "123456789",
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/EIN/i);
    });
  });

  // ── POST /api/organizations/invite ────────────────────────────────

  describe("POST /api/organizations/invite", () => {
    it("should send an invite successfully", async () => {
      // 1: SELECT ServiceProvider
      mockPool
        .promise()
        .query.mockResolvedValueOnce([[{ provider_id: 1, name: "Test Org" }]])
        // 2: INSERT OrganizationInvite
        .mockResolvedValueOnce([{ insertId: 1 }]);

      const res = await request(app)
        .post("/api/organizations/invite")
        .set("x-user-id", "1")
        .send({
          email: "invite@example.com",
          username: "invitee",
          provider_id: 1,
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toMatch(/sent successfully/i);
      expect(res.body.invite_link).toBeDefined();
    });

    it("should return 400 if email is missing", async () => {
      const res = await request(app)
        .post("/api/organizations/invite")
        .set("x-user-id", "1")
        .send({ provider_id: 1 });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/email/i);
    });

    it("should return 400 for invalid email format", async () => {
      const res = await request(app)
        .post("/api/organizations/invite")
        .set("x-user-id", "1")
        .send({ email: "not-an-email", provider_id: 1 });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/Invalid email/i);
    });

    it("should return 404 if organization not found", async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post("/api/organizations/invite")
        .set("x-user-id", "1")
        .send({ email: "invite@example.com", provider_id: 999 });

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  // ── GET /api/organizations/invite/:token ──────────────────────────

  describe("GET /api/organizations/invite/:token", () => {
    it("should return invite details for a valid token", async () => {
      mockPool.promise().query.mockResolvedValueOnce([
        [
          {
            invite_id: 1,
            provider_id: 1,
            email: "invite@example.com",
            username_suggestion: "invitee",
            organization_name: "Test Org",
            ein: "12-3456789",
            used: false,
          },
        ],
      ]);

      const res = await request(app).get(
        "/api/organizations/invite/validtoken123",
      );

      expect(res.statusCode).toEqual(200);
      expect(res.body.organization_name).toBe("Test Org");
      expect(res.body.ein).toBe("12-3456789");
      expect(res.body.email).toBe("invite@example.com");
    });

    it("should return 404 for an invalid or expired token", async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app).get(
        "/api/organizations/invite/expiredtoken",
      );

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toMatch(/invalid or expired/i);
    });
  });

  // ── POST /api/organizations/invite-register ───────────────────────

  describe("POST /api/organizations/invite-register", () => {
    it("should register a user via invite token", async () => {
      mockPool
        .promise()
        .query // 1: SELECT invite + provider
        .mockResolvedValueOnce([
          [
            {
              invite_id: 1,
              provider_id: 1,
              email: "invite@example.com",
              organization_name: "Test Org",
              ein: "12-3456789",
              used: false,
            },
          ],
        ])
        // 2: Check existing email
        .mockResolvedValueOnce([[]])
        // 3: Check existing username
        .mockResolvedValueOnce([[]])
        // 4: INSERT User
        .mockResolvedValueOnce([{ insertId: 20 }])
        // 5: INSERT UserProfile
        .mockResolvedValueOnce([{ insertId: 21 }])
        // 6: INSERT UserRole
        .mockResolvedValueOnce([{ insertId: 22 }])
        // 7: INSERT ServiceProviderUser
        .mockResolvedValueOnce([{ insertId: 23 }])
        // 8: UPDATE invite used
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post("/api/organizations/invite-register")
        .send({
          token: "validtoken123",
          username: "newinvitee",
          email: "invite@example.com",
          password: "Password1!",
          first_name: "John",
          last_name: "Doe",
          phone_number: "5551234567",
          zip_code: "30303",
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toMatch(/created successfully/i);
      expect(res.body.user_id).toBe(20);
      expect(res.body.provider_id).toBe(1);
    });

    it("should return 400 if required fields are missing", async () => {
      const res = await request(app)
        .post("/api/organizations/invite-register")
        .send({
          token: "validtoken123",
          email: "invite@example.com",
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it("should return 400 for an invalid or expired invite token", async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post("/api/organizations/invite-register")
        .send({
          token: "expiredtoken",
          username: "newinvitee",
          email: "invite@example.com",
          password: "Password1!",
          first_name: "John",
          last_name: "Doe",
          phone_number: "5551234567",
          zip_code: "30303",
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/invalid or expired/i);
    });

    it("should return 400 for weak password", async () => {
      const res = await request(app)
        .post("/api/organizations/invite-register")
        .send({
          token: "validtoken123",
          username: "newinvitee",
          email: "invite@example.com",
          password: "weak",
          first_name: "John",
          last_name: "Doe",
          phone_number: "5551234567",
          zip_code: "30303",
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/Password must be/i);
    });
  });
});
