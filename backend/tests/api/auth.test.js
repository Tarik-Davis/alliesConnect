const request = require('supertest');
const app = require('../../server');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const mockPool = mysql._mockPool;

// Mock bcrypt so tests don't spend time hashing
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
  })
}));

jest.mock('../../middleware/permissions', () => ({
  requireRole: (pool, role) => {
    return (req, res, next) => {
      req.currentUser = { user_id: 1, roles: [role] };
      next();
    };
  }
}));

describe('Auth API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── POST /api/auth/register ──────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new volunteer user', async () => {
      mockPool.promise().query
        // 1: Check existing email+role
        .mockResolvedValueOnce([[]])
        // 2: Check existing username
        .mockResolvedValueOnce([[]])
        // 3: INSERT User
        .mockResolvedValueOnce([{ insertId: 5 }])
        // 4: INSERT UserProfile
        .mockResolvedValueOnce([{ insertId: 6 }])
        // 5: INSERT UserRole
        .mockResolvedValueOnce([{ insertId: 7 }]);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          role: 'volunteer',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          username: 'johndoe',
          password: 'Password1!',
          phone: '5551234567',
          zip_code: '30303'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.user_id).toBe(5);
    });

    it('should reject registration if email is already in use', async () => {
      // Check existing email+role returns a match
      mockPool.promise().query.mockResolvedValueOnce([[{ user_id: 1 }]]);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          role: 'volunteer',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          username: 'johndoe',
          password: 'Password1!',
          phone: '5551234567',
          zip_code: '30303'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toBe('An account with that email already exists');
    });

    it('should reject registration with missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'john@example.com',
          password: 'Password1!'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('should reject registration with a weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          role: 'volunteer',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          username: 'johndoe',
          password: 'weak',
          phone: '5551234567',
          zip_code: '30303'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/Password must be/i);
    });

    it('should reject registration with an invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          role: 'volunteer',
          first_name: 'John',
          last_name: 'Doe',
          email: 'not-an-email',
          username: 'johndoe',
          password: 'Password1!',
          phone: '5551234567',
          zip_code: '30303'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/email/i);
    });
  });

  // ── POST /api/auth/login ─────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should successfully log in a user', async () => {
      mockPool.promise().query
        // 1: Find user by username
        .mockResolvedValueOnce([[{
          user_id: 1,
          username: 'johndoe',
          password_hash: 'hashedpassword',
          email: 'test@example.com',
          status: 'active'
        }]])
        // 2: Find roles
        .mockResolvedValueOnce([[{ role_name: 'volunteer' }]]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'johndoe',
          password: 'Password1!'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.user_id).toBe(1);
      expect(res.body.username).toBe('johndoe');
      expect(res.body.roles).toEqual(['volunteer']);
    });

    it('should return 401 for invalid password', async () => {
      bcrypt.compare.mockResolvedValueOnce(false);
      mockPool.promise().query.mockResolvedValueOnce([[{
        user_id: 1,
        username: 'johndoe',
        password_hash: 'hashedpassword'
      }]]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'johndoe',
          password: 'WrongPassword1!'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.error).toBe('Invalid username or password');
    });

    it('should return 401 for non-existent user', async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nouser',
          password: 'Password1!'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.error).toBe('Invalid username or password');
    });

    it('should return 400 if username or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'johndoe' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/required/i);
    });
  });

  // ── POST /api/auth/forgot-password ───────────────────────────────

  describe('POST /api/auth/forgot-password', () => {
    it('should return success message when email exists', async () => {
      mockPool.promise().query
        // 1: Find user by email
        .mockResolvedValueOnce([[{ user_id: 1, username: 'johndoe' }]])
        // 2: Invalidate old tokens
        .mockResolvedValueOnce([{ affectedRows: 0 }])
        // 3: Insert new token
        .mockResolvedValueOnce([{ insertId: 10 }]);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'john@example.com' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toMatch(/password reset link/i);
    });

    it('should return same success message when email does not exist (no leak)', async () => {
      // No user found
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@example.com' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toMatch(/password reset link/i);
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toBe('Email is required');
    });
  });

  // ── POST /api/auth/reset-password/:token ─────────────────────────

  describe('POST /api/auth/reset-password/:token', () => {
    it('should reset password with a valid token', async () => {
      mockPool.promise().query
        // 1: Find valid token
        .mockResolvedValueOnce([[{ token_id: 1, user_id: 5, token: 'validtoken' }]])
        // 2: Update password
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        // 3: Mark token used
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/auth/reset-password/validtoken')
        .send({ password: 'NewPassword1!' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toMatch(/reset successfully/i);
    });

    it('should return 400 for invalid or expired token', async () => {
      // No matching token found
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/auth/reset-password/badtoken')
        .send({ password: 'NewPassword1!' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/invalid or expired/i);
    });

    it('should return 400 if new password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password/sometoken')
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toBe('New password is required');
    });

    it('should return 400 if new password is too weak', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password/sometoken')
        .send({ password: 'short' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/Password must be/i);
    });
  });

  // ── GET /api/users/profile/:id ───────────────────────────────────

  describe('GET /api/users/profile/:id', () => {
    it('should get user profile', async () => {
      mockPool.promise().query.mockResolvedValueOnce([[{
        user_id: 1,
        email: 'test@example.com',
        status: 'active',
        first_name: 'John',
        last_name: 'Doe',
        phone: '5551234567',
        zip_code: '30303',
        roles: 'volunteer',
        provider_id: null
      }]]);

      const res = await request(app).get('/api/users/profile/1');

      expect(res.statusCode).toEqual(200);
      expect(res.body.first_name).toBe('John');
      expect(res.body.user_id).toBe(1);
      expect(res.body.roles).toEqual(['volunteer']);
    });

    it('should return 404 if user profile not found', async () => {
      mockPool.promise().query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/users/profile/999');

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });
});
