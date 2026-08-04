const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client using Service Role key to bypass RLS for server administration
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-key'
);

/**
 * Middleware: Verify user Supabase JWT (Authorization: Bearer <token>)
 */
async function verifyUserAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or invalid Authorization header.',
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid user session token.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Internal Auth Verification Error',
      details: err.message,
    });
  }
}

/**
 * Middleware: Verify internal secret header (X-Internal-Key) for server-to-server calls
 */
function verifyInternalKey(req, res, next) {
  const internalKey = req.headers['x-internal-key'];
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    console.warn('[Server Warning] INTERNAL_API_KEY is not set in environment variables.');
  }

  if (expectedKey && internalKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing X-Internal-Key header.',
    });
  }

  next();
}

module.exports = {
  supabase,
  verifyUserAuth,
  verifyInternalKey,
};
