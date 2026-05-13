const request = require("supertest");
const app = require("../../server");
const mysql = require("mysql2");

const mockPool = mysql._mockPool;
const mockConnection = mysql._mockConnection;

jest.mock("../../utils/geocode", () => ({
  geocodeAddress: jest.fn().mockResolvedValue({ lat: 33.749, lng: -84.388 }),
}));

jest.mock("../../middleware/permissions", () => ({
  requireRole: (pool, role) => {
    return (req, res, next) => {
      req.currentUser = { user_id: 1, roles: [role] };
      next();
    };
  },
}));

describe("Resources API Endpoints", () => {
  const validHours = {
    monday: { closed: false, open: "09:00", close: "17:00" },
    tuesday: { closed: false, open: "09:00", close: "17:00" },
    wednesday: { closed: false, open: "09:00", close: "17:00" },
    thursday: { closed: false, open: "09:00", close: "17:00" },
    friday: { closed: false, open: "09:00", close: "17:00" },
    saturday: { closed: true, open: "", close: "" },
    sunday: { closed: true, open: "", close: "" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /api/resources ────────────────────────────────────────────

  describe("GET /api/resources", () => {
    it("should return a list of resources", async () => {
      mockPool.promise().query.mockResolvedValueOnce([
        [
          {
            resource_id: 1,
            name: "Food Bank",
            provider_name: "Helping Hands",
          },
        ],
      ]);

      const res = await request(app).get("/api/resources");
      expect(res.statusCode).toEqual(200);
      expect(res.body[0].name).toBe("Food Bank");
    });

    it("should handle internal server errors", async () => {
      mockPool.promise().query.mockRejectedValueOnce(new Error("DB Error"));

      const res = await request(app).get("/api/resources");
      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toMatch(/failed/i);
    });
  });

  // ── GET /api/resources/:id ────────────────────────────────────────

  describe("GET /api/resources/:id", () => {
    it("should return a specific resource by id", async () => {
      mockPool.promise().query.mockResolvedValueOnce([
        [
          {
            resource_id: 1,
            name: "Food Bank",
            provider_name: "Helping Hands",
          },
        ],
      ]);

      const res = await request(app).get("/api/resources/1");
      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toBe("Food Bank");
    });

    it("should return 404 if resource not found", async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app).get("/api/resources/999");
      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  // ── POST /api/resources ───────────────────────────────────────────

  describe("POST /api/resources", () => {
    it("should create a resource", async () => {
      // getConnection() → conn.beginTransaction, conn.query (geocode check), conn.query (insert location), conn.query (insert resource), conn.commit
      mockConnection.query
        // 1: Check existing location by lat/lng (none found)
        .mockResolvedValueOnce([[]])
        // 2: Insert Location
        .mockResolvedValueOnce([{ insertId: 1 }])
        // 3: Insert Resource
        .mockResolvedValueOnce([{ insertId: 2 }]);

      const res = await request(app)
        .post("/api/resources")
        .set("x-user-id", "1")
        .send({
          name: "Shelter",
          description: "A place to stay",
          provider_id: 1,
          category_ids: [2],
          street_address: "123 Test St",
          city: "Test City",
          state: "GA",
          zip: "30303",
          hours: validHours,
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toMatch(/success/i);
      expect(res.body.resource_id).toBe(2);
    });

    it("should return 400 if required fields are missing", async () => {
      const res = await request(app)
        .post("/api/resources")
        .set("x-user-id", "1")
        .send({
          name: "Shelter",
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/missing required/i);
    });

    it("should return 400 if hours is an invalid plain string", async () => {
      const res = await request(app)
        .post("/api/resources")
        .set("x-user-id", "1")
        .send({
          name: "Shelter",
          description: "A place to stay",
          provider_id: 1,
          category_ids: [2],
          street_address: "123 Test St",
          city: "Test City",
          state: "GA",
          zip: "30303",
          hours: "Mon-Fri 9-5",
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/invalid hours/i);
    });

    it("should return 400 if hours is missing a day", async () => {
      const incompleteHours = { ...validHours };
      delete incompleteHours.sunday;

      const res = await request(app)
        .post("/api/resources")
        .set("x-user-id", "1")
        .send({
          name: "Shelter",
          description: "A place to stay",
          provider_id: 1,
          category_ids: [2],
          street_address: "123 Test St",
          city: "Test City",
          state: "GA",
          zip: "30303",
          hours: incompleteHours,
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/invalid hours/i);
    });

    it("should accept hours as a JSON string", async () => {
      mockConnection.query
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([{ insertId: 3 }]);

      const res = await request(app)
        .post("/api/resources")
        .set("x-user-id", "1")
        .send({
          name: "Shelter 2",
          description: "Another shelter",
          provider_id: 1,
          category_ids: [2],
          street_address: "456 Test Ave",
          city: "Test City",
          state: "GA",
          zip: "30303",
          hours: JSON.stringify(validHours),
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toMatch(/success/i);
    });
  });

  // ── PUT /api/resources/:id ────────────────────────────────────────

  describe("PUT /api/resources/:id", () => {
    it("should update a specific resource", async () => {
      mockPool
        .promise()
        .query // 1: UPDATE query
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        // 2: logAudit
        .mockResolvedValueOnce([{}]);

      const res = await request(app)
        .put("/api/resources/1")
        .set("x-user-id", "1")
        .send({
          category_id: 1,
          location_id: 1,
          name: "Updated Food Bank",
          description: "Updated description",
          hours: validHours,
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toMatch(/updated/i);
    });

    it("should update category and address fields by switching to a resolved location", async () => {
      mockPool
        .promise()
        .query// 1: resolve existing location by coords
        .mockResolvedValueOnce([[{ location_id: 99 }]])
        // 2: UPDATE resource
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        // 3: UPDATE provider website
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        // 4: logAudit
        .mockResolvedValueOnce([{}]);

      const res = await request(app)
        .put("/api/resources/1")
        .set("x-user-id", "1")
        .send({
          category_id: 3,
          name: "Updated Food Bank",
          street_address: "456 Updated St",
          city: "Atlanta",
          state: "GA",
          zip: "30318",
          latitude: 33.75,
          longitude: -84.39,
          description: "Updated description",
          hours: validHours,
          website: "https://example.org",
        });

      expect(res.statusCode).toEqual(200);
      expect(mockPool.promise().query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("UPDATE Resource"),
        expect.arrayContaining([3, 99, "Updated Food Bank"]),
      );
    });
  });

  // ── DELETE /api/resources/:id ─────────────────────────────────────

  describe("DELETE /api/resources/:id", () => {
    it("should delete a resource", async () => {
      mockPool
        .promise()
        .query // 1: DELETE query
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        // 2: logAudit
        .mockResolvedValueOnce([{}]);

      const res = await request(app)
        .delete("/api/resources/1")
        .set("x-user-id", "1");

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toMatch(/deleted/i);
    });
  });
});
