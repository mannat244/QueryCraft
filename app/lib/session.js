const sessionOptions = {
  // Use env password if available, otherwise a default for local development
  password: process.env.SESSION_PASSWORD || 'querycraft_local_development_secret_32_chars_min',
  cookieName: 'qc_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  },
};

module.exports = { sessionOptions };