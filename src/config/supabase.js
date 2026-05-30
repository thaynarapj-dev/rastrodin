process.loadEnvFile();

const baseURLLocal = process.env.SUPABASE_LOCAL_URL;
const baseURLRemote = process.env.SUPABASE_REMOTE_URL;
const supabaseApiKey = process.env.X_API_KEY_SUPABASE;

const getSupabaseConfig = (environment) => {
  const isProduction = environment === 'production';
  const baseURL = isProduction ? baseURLRemote : baseURLLocal;

  if (!baseURL) {
    const error = new Error(`Missing ${isProduction ? 'SUPABASE_REMOTE_URL' : 'SUPABASE_LOCAL_URL'} env`);
    error.statusCode = 500;
    throw error;
  }

  if (isProduction && !supabaseApiKey) {
    const error = new Error('Missing X_API_KEY_SUPABASE env');
    error.statusCode = 500;
    throw error;
  }

  return {
    baseURL: baseURL.replace(/\/$/, ''),
    headers: isProduction ? {
      apikey: supabaseApiKey,
      Authorization: `Bearer ${supabaseApiKey}`,
    } : {},
  };
};

module.exports = {
  getSupabaseConfig,
};
