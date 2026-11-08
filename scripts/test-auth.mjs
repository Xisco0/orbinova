import { createClient } from '@supabase/supabase-js';

const url = 'https://lrbncvcmhzsdnkushsrf.supabase.co';
const key = 'sb_publishable_ZH8SuN_h4G4shc--xWhT-Q_L8aFSX7p';

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function testAuth() {
  console.log('Testing Supabase Auth on:', url);
  
  // Try to sign up a test account
  const testEmail = 'hospital.test@orbinova.health';
  const testPassword = 'HospitalSecure2026!';

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        role: 'hospital',
        full_name: 'St. Nicholas Hospital Admin'
      }
    }
  });

  if (error) {
    console.error('Sign up result error:', error.message, error.status);
  } else {
    console.log('Sign up result SUCCESS:', {
      id: data.user?.id,
      email: data.user?.email,
      confirmed_at: data.user?.confirmed_at,
      metadata: data.user?.user_metadata
    });
  }
}

testAuth();
