// generateToken.js
const jwt = require('jsonwebtoken');

// Secret key for signing the token (store in environment variables in production)
const SECRET_KEY = process.env.SECRET_KEY; // Replace with your actual secret key

/**
 * Generates a JWT token for a user
 * @param {Object} user - User object containing id and username
 * @returns {string} - JWT token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username
  };

  // Generate the token with a specified expiration time (e.g., 1 hour)
  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
  return token;
}

module.exports = generateToken;
