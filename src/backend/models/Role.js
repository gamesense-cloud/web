import { getDb } from '../../../config/database.js';
import { ROLES, can, atLeast, rankOf } from '../../../config/permissions.js';

/**
 * Roles are static enough to live in config; this model is the database view of
 * them, used for listing groups and for validating a role name on write.
 */
const Role = {
  all() {
    return getDb().prepare('SELECT * FROM roles ORDER BY rank DESC').all();
  },

  find(name) {
    return getDb().prepare('SELECT * FROM roles WHERE name = ?').get(name);
  },

  exists(name) {
    return Boolean(ROLES[name]);
  },

  can,
  atLeast,
  rankOf,
};

export default Role;
