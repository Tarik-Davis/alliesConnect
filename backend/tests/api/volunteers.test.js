const request = require('supertest');
const app = require('../../server');
const mysql = require('mysql2');

const mockPool = mysql._mockPool;
const mockConnection = mysql._mockConnection;

jest.mock('../../middleware/permissions', () => ({
  requireRole: (pool, role) => {
    return (req, res, next) => {
      req.currentUser = { user_id: 1, roles: [role] };
      next();
    };
  }
}));

describe('Volunteers API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET /api/volunteer-opportunities ──────────────────────────────

  describe('GET /api/volunteer-opportunities', () => {
    it('should list volunteer opportunities', async () => {
      mockPool.promise().query.mockResolvedValueOnce([
        [{ opportunity_id: 1, title: 'Clean up park' }]
      ]);

      const res = await request(app).get('/api/volunteer-opportunities');
      expect(res.statusCode).toEqual(200);
      expect(res.body[0].title).toBe('Clean up park');
    });

    it('should handle internal server errors', async () => {
      mockPool.promise().query.mockRejectedValueOnce(new Error('DB Error'));

      const res = await request(app).get('/api/volunteer-opportunities');
      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toMatch(/failed/i);
    });
  });

  // ── GET /api/volunteer-opportunities/:id ──────────────────────────

  describe('GET /api/volunteer-opportunities/:id', () => {
    it('should get an opportunity by id with its shifts', async () => {
      mockPool.promise().query
        // 1: Opportunity
        .mockResolvedValueOnce([[{ opportunity_id: 1, title: 'Clean up' }]])
        // 2: Shifts
        .mockResolvedValueOnce([[{ shift_id: 10, start_datetime: '2027-01-01 09:00:00' }]]);

      const res = await request(app).get('/api/volunteer-opportunities/1');
      expect(res.statusCode).toEqual(200);
      expect(res.body.title).toBe('Clean up');
      expect(res.body.shifts).toBeInstanceOf(Array);
    });

    it('should return 404 if opportunity not found', async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/volunteer-opportunities/999');
      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  // ── POST /api/volunteer-signups ───────────────────────────────────

  describe('POST /api/volunteer-signups', () => {
    it('should create a volunteer signup', async () => {
      mockPool.promise().query
        // 1: Verify shift exists
        .mockResolvedValueOnce([[{ shift_id: 1, event_id: 1 }]])
        // 2: Check existing active signup
        .mockResolvedValueOnce([[]])
        // 3: Check capacity
        .mockResolvedValueOnce([[{ capacity: 10, signup_count: 2 }]])
        // 4: Check cancelled signup
        .mockResolvedValueOnce([[]])
        // 5: Insert signup
        .mockResolvedValueOnce([{ insertId: 1 }])
        // 6: logEmail
        .mockResolvedValueOnce([{}]);

      const res = await request(app)
        .post('/api/volunteer-signups')
        .send({
          shift_id: 1,
          user_id: 1
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toMatch(/success/i);
      expect(res.body.signup_id).toBe(1);
    });

    it('should return 400 if already signed up', async () => {
      mockPool.promise().query
        // 1: Verify shift exists
        .mockResolvedValueOnce([[{ shift_id: 1, event_id: 1 }]])
        // 2: Check existing active signup — already registered
        .mockResolvedValueOnce([[{ signup_id: 5 }]]);

      const res = await request(app)
        .post('/api/volunteer-signups')
        .send({ shift_id: 1, user_id: 1 });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/already signed up/i);
    });

    it('should return 400 if shift is full', async () => {
      mockPool.promise().query
        // 1: Verify shift exists
        .mockResolvedValueOnce([[{ shift_id: 1, event_id: 1 }]])
        // 2: No existing signup
        .mockResolvedValueOnce([[]])
        // 3: Capacity full
        .mockResolvedValueOnce([[{ capacity: 2, signup_count: 2 }]]);

      const res = await request(app)
        .post('/api/volunteer-signups')
        .send({ shift_id: 1, user_id: 1 });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/full/i);
    });

    it('should return 400 if shift_id or user_id is missing', async () => {
      const res = await request(app)
        .post('/api/volunteer-signups')
        .send({ user_id: 1 });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('should return 404 if shift not found', async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/volunteer-signups')
        .send({ shift_id: 999, user_id: 1 });

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  // ── DELETE /api/volunteer-signups/:id ─────────────────────────────

  describe('DELETE /api/volunteer-signups/:id', () => {
    it('should cancel a volunteer signup', async () => {
      mockPool.promise().query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app).delete('/api/volunteer-signups/1');
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toMatch(/cancelled/i);
    });
  });

  // ── PUT /api/volunteer-opportunities/:id ──────────────────────────

  describe('PUT /api/volunteer-opportunities/:id', () => {
    it('should update an opportunity', async () => {
      mockPool.promise().query
        // 1: UPDATE query
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        // 2: logAudit
        .mockResolvedValueOnce([{}]);

      const res = await request(app)
        .put('/api/volunteer-opportunities/1')
        .set('x-user-id', '1')
        .send({ title: 'Updated', status: 'open' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toMatch(/updated/i);
    });
  });

  // ── DELETE /api/volunteer-opportunities/:id ───────────────────────

  describe('DELETE /api/volunteer-opportunities/:id', () => {
    it('should delete an opportunity', async () => {
      mockPool.promise().query
        // 1: DELETE query
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        // 2: logAudit
        .mockResolvedValueOnce([{}]);

      const res = await request(app)
        .delete('/api/volunteer-opportunities/1')
        .set('x-user-id', '1');

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toMatch(/deleted/i);
    });
  });

  // ── DELETE /api/shifts/:id ────────────────────────────────────────

  describe('DELETE /api/shifts/:id', () => {
    it('should delete a shift', async () => {
      mockPool.promise().query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app).delete('/api/shifts/1');
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toMatch(/deleted/i);
    });

    it('should return 404 if shift not found', async () => {
      mockPool.promise().query.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const res = await request(app).delete('/api/shifts/999');
      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  // ── GET /api/volunteers/:userId/event-signups ─────────────────────

  describe('GET /api/volunteers/:userId/event-signups', () => {
    it('should return event-linked signups for a user', async () => {
      mockPool.promise().query.mockResolvedValueOnce([
        [{
          opportunity_id: 1,
          event_id: 10,
          title: 'Food Drive',
          provider_name: 'Helping Hands',
          event_status: 'upcoming'
        }]
      ]);

      const res = await request(app).get('/api/volunteers/1/event-signups');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body[0].title).toBe('Food Drive');
      expect(res.body[0].event_status).toBe('upcoming');
    });

    it('should return empty array if no event signups', async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/volunteers/1/event-signups');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([]);
    });
  });

  // ── GET /api/volunteers/:userId/resource-shifts ───────────────────

  describe('GET /api/volunteers/:userId/resource-shifts', () => {
    it('should return resource-linked shifts for a user', async () => {
      mockPool.promise().query.mockResolvedValueOnce([
        [{
          shift_id: 5,
          resource_name: 'Food Bank',
          provider_name: 'Community Aid',
          shift_status: 'upcoming'
        }]
      ]);

      const res = await request(app).get('/api/volunteers/1/resource-shifts');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body[0].resource_name).toBe('Food Bank');
    });

    it('should return empty array if no resource shifts', async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/volunteers/1/resource-shifts');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([]);
    });
  });

  // ── GET /api/volunteers/:userId/hours ─────────────────────────────

  describe('GET /api/volunteers/:userId/hours', () => {
    it('should return completed volunteer hours', async () => {
      mockPool.promise().query.mockResolvedValueOnce([
        [{
          shift_id: 1,
          hours_worked: 3.5,
          resource_name: 'Food Bank',
          provider_name: 'Community Aid',
          shift_date: '2025-01-15'
        }]
      ]);

      const res = await request(app).get('/api/volunteers/1/hours');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body[0].hours_worked).toBe(3.5);
    });

    it('should support resource_id filter', async () => {
      mockPool.promise().query.mockResolvedValueOnce([
        [{ shift_id: 1, resource_id: 5, hours_worked: 2.0 }]
      ]);

      const res = await request(app).get('/api/volunteers/1/hours?resource_id=5');
      expect(res.statusCode).toEqual(200);
      expect(res.body[0].resource_id).toBe(5);
    });

    it('should support date_from and date_to filters', async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app).get(
        '/api/volunteers/1/hours?date_from=2025-01-01&date_to=2025-06-30'
      );
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([]);
    });
  });

  // ── GET /api/volunteers/:userId/resources ─────────────────────────

  describe('GET /api/volunteers/:userId/resources', () => {
    it('should return resources where user has completed hours', async () => {
      mockPool.promise().query.mockResolvedValueOnce([
        [
          { resource_id: 1, name: 'Food Bank' },
          { resource_id: 2, name: 'Shelter' }
        ]
      ]);

      const res = await request(app).get('/api/volunteers/1/resources');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('Food Bank');
    });

    it('should return empty array if no resources with hours', async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/volunteers/1/resources');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual([]);
    });
  });
});
