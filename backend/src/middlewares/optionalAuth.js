import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers?.authorization?.split(' ')[1]
    if (token) {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
      req.user = await User.findById(decoded.userId).select('-hashedPassword')
    }
  } catch (_) {}
  next()
}