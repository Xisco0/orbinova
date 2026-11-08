async function testLogin() {
  const url = 'https://lrbncvcmhzsdnkushsrf.supabase.co';
  const key = 'sb_publishable_ZH8SuN_h4G4shc--xWhT-Q_L8aFSX7p';

  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'hospital.admin@orbinova.com',
      password: 'HospitalPassword2026!'
    })
  });

  console.log('Login status:', res.status);
  const data = await res.json();
  console.log('Login response:', JSON.stringify(data, null, 2));
}

testLogin().catch(console.error);
