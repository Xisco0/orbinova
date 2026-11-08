async function test() {
  const url = 'https://lrbncvcmhzsdnkushsrf.supabase.co';
  const key = 'sb_publishable_ZH8SuN_h4G4shc--xWhT-Q_L8aFSX7p';

  console.log('Testing PostgREST fetch to:', url);

  const tables = ['profiles', 'organizations', 'radiologists', 'images', 'users'];
  for (const t of tables) {
    try {
      const res = await fetch(`${url}/rest/v1/${t}?limit=1`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });
      console.log(`Table ${t}: status ${res.status}`, await res.text());
    } catch (e) {
      console.error(`Error querying ${t}:`, e.message);
    }
  }
}

test();
