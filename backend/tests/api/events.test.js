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

describe("Events API Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /api/events ───────────────────────────────────────────────

  describe("GET /api/events", () => {
    it("should return a list of events", async () => {
      mockPool.promise().query.mockResolvedValueOnce([
        [
          {
            event_id: 1,
            title: "Food Drive",
            provider_name: "Helping Hands",
          },
        ],
      ]);

      const res = await request(app).get("/api/events");
      expect(res.statusCode).toEqual(200);
      expect(res.body[0].title).toBe("Food Drive");
    });

    it("should handle internal server errors", async () => {
      mockPool.promise().query.mockRejectedValueOnce(new Error("DB Error"));

      const res = await request(app).get("/api/events");
      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toMatch(/failed/i);
    });
  });

  // ── GET /api/events/:id ───────────────────────────────────────────

  describe("GET /api/events/:id", () => {
    it("should return event details", async () => {
      mockPool.promise().query.mockResolvedValueOnce([
        [
          {
            event_id: 1,
            title: "Food Drive",
            provider_name: "Helping Hands",
          },
        ],
      ]);

      const res = await request(app).get("/api/events/1");
      expect(res.statusCode).toEqual(200);
      expect(res.body.title).toBe("Food Drive");
    });

    it("should return 404 if event not found", async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app).get("/api/events/999");
      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  // ── POST /api/events ──────────────────────────────────────────────

  describe("POST /api/events", () => {
    it("should create an event", async () => {
      // getConnection → beginTransaction, geocode check, insert location, insert event, commit
      mockConnection.query
        // 1: Check existing location by lat/lng (none found)
        .mockResolvedValueOnce([[]])
        // 2: Insert Location
        .mockResolvedValueOnce([{ insertId: 1 }])
        // 3: Insert Event
        .mockResolvedValueOnce([{ insertId: 5 }]);

      const res = await request(app)
        .post("/api/events")
        .send({
          title: "New Event",
          event_date: "2027-01-01",
          start_datetime: "2027-01-01 12:00:00",
          end_datetime: "2027-01-01 14:00:00",
          street_address: "123 Main St",
          city: "Atlanta",
          state: "GA",
          zip: "30303",
          provider_id: 1,
          category_ids: [1],
          image_url: "https://example.com/image.jpg",
          flyer_url: "https://example.com/flyer.pdf",
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toMatch(/success/i);
      expect(res.body.event_id).toBe(5);
    });

    it("should return 400 if required fields are missing", async () => {
      const res = await request(app).post("/api/events").send({
        title: "Incomplete Event",
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/missing required/i);
    });
  });

  // ── PUT /api/events/:id ───────────────────────────────────────────

  describe("PUT /api/events/:id", () => {
    it("should update an event including image_url and flyer_url", async () => {
      mockPool.promise().query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app).put("/api/events/1").send({
        title: "Updated Event",
        description: "Updated description",
        capacity: 50,
        registration_required: "yes",
        special_instructions: "Bring ID",
        start_datetime: "2027-01-01 12:00:00",
        end_datetime: "2027-01-01 14:00:00",
        image_url: "https://example.com/updated.jpg",
        flyer_url: "https://example.com/updated.pdf",
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toMatch(/updated/i);
    });

    it("should return 400 if title is missing", async () => {
      const res = await request(app)
        .put("/api/events/1")
        .send({ description: "No title" });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/title/i);
    });
  });

  // ── POST /api/events/:id/rsvp ─────────────────────────────────────

  describe("POST /api/events/:id/rsvp", () => {
    it("should record an RSVP", async () => {
      mockPool
        .promise()
        .query // 1: INSERT/UPDATE RSVP
        .mockResolvedValueOnce([{ insertId: 1 }])
        // 2: UPDATE Event attendance count
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        // 3: logEmail
        .mockResolvedValueOnce([{}]);

      const res = await request(app)
        .post("/api/events/1/rsvp")
        .send({ userId: 1, status: "yes" });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toMatch(/rsvp recorded/i);
    });

    it("should return 400 for invalid RSVP status", async () => {
      const res = await request(app)
        .post("/api/events/1/rsvp")
        .send({ userId: 1, status: "maybe" });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/status/i);
    });

    it("should return 400 if userId or status is missing", async () => {
      const res = await request(app)
        .post("/api/events/1/rsvp")
        .send({ userId: 1 });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/required/i);
    });
  });
});
