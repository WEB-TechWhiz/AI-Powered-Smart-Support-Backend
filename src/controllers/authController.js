const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const AuditLog = require('../models/AuditLog');

function sanitizeUser(user) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      tokenType: 'access',
    },
    config.jwtSecret,
    { expiresIn: '15m' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      tokenType: 'refresh',
      sessionVersion: user.refreshTokenVersion || 0,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

function buildAuthPayload(user) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
    user: sanitizeUser(user),
  };
}

async function register(req, res) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const user = await User.create({
      email: normalizedEmail,
      password,
      name,
      lastLoginAt: new Date(),
    });

    await AuditLog.create({
      actorId: user._id,
      actorRole: user.role,
      action: 'auth.register',
      targetType: 'user',
      targetId: user._id,
      metadata: { email: user.email },
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: buildAuthPayload(user),
    });
  } catch (error) {
    console.error('Register error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    await AuditLog.create({
      actorId: user._id,
      actorRole: user.role,
      action: 'auth.login',
      targetType: 'user',
      targetId: user._id,
      metadata: { email: user.email },
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: buildAuthPayload(user),
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.',
      });
    }

    const decoded = jwt.verify(refreshToken, config.jwtSecret);
    if (decoded.tokenType !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }

    if ((user.refreshTokenVersion || 0) !== Number(decoded.sessionVersion || 0)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
    }

    return res.status(200).json({
      success: true,
      data: buildAuthPayload(user),
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
}

async function logout(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshTokenVersion = (user.refreshTokenVersion || 0) + 1;
      await user.save();

      await AuditLog.create({
        actorId: user._id,
        actorRole: user.role,
        action: 'auth.logout',
        targetType: 'user',
        targetId: user._id,
        metadata: { email: user.email },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Logout successful.',
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { user: sanitizeUser(user) },
    });
  } catch (error) {
    console.error('Me error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  signAccessToken,
  signRefreshToken,
  sanitizeUser,
};
