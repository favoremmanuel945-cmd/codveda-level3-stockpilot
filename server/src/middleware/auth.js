import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const token = req.cookies?.stockpilot_session

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required'
    })
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ['HS256'] }
    )

    if (
      typeof payload.sub !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(payload.sub)
    ) {
      return res.status(401).json({
        error: 'Invalid session'
      })
    }

    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({
      error: 'Session expired or invalid'
    })
  }
}
