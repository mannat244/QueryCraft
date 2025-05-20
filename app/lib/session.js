const sessionOptions = {
  password: process.env.SESSION_PASSWORD,   
  cookieName: 'qc_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,            
    sameSite: 'lax',           
    path: '/',
  },
};

module.exports = { sessionOptions };