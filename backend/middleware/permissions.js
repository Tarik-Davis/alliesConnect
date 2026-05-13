function requireRole(pool, roleName) {
  return async function (req, res, next) {
    try {
      const userId = req.headers["x-user-id"];

      if (!userId) {
        return res.status(401).json({
          error: "x-user-id header is required"
        });
      }

      const [rows] = await pool.promise().query(
        `SELECT r.role_name
         FROM UserRole ur
         JOIN Role r ON ur.role_id = r.role_id
         WHERE ur.user_id = ?`,
        [userId]
      );

      const roles = rows.map(row => row.role_name);

      if (!roles.includes(roleName)) {
        return res.status(403).json({
          error: `${roleName} role required`
        });
      }

      req.currentUser = {
        user_id: Number(userId),
        roles
      };

      next();
    } catch (err) {
      console.error("Permission check failed:", err);
      res.status(500).json({ error: "Permission check failed" });
    }
  };
}

module.exports = {
  requireRole
};
