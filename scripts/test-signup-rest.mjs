async function testSignUp() {
  const url = 'https://lrbncvcmhzsdnkushsrf.supabase.co';
  const key = 'sb_publishable_ZH8SuN_h4G4shc--xWhT-Q_L8aFSX7p';

  console.log('Sending direct Auth signup request...');

  const res = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'hospital.admin@orbinova.com',
      password: 'HospitalPassword2026!',
      data: {
        role: 'hospital',
        full_name: 'Lagos University Teaching Hospital (LUTH)'
      }
    })
  });

  console.log('HTTP status:', res.status);
  const data = await res.json();
  console.log('Response body:', JSON.stringify(data, null, 2));
}

testSignUp().catch(console.error);
