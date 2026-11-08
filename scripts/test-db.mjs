import { createClient } from '@supabase/supabase-js';

const url = 'https://lrbncvcmhzsdnkushsrf.supabase.co';
const key = 'sb_publishable_ZH8SuN_h4G4shc--xWhT-Q_L8aFSX7p';

const supabase = createClient(url, key);

async function test() {
  console.log('Testing connection to:', url);
  
  // Try querying profiles
  const profilesRes = await supabase.from('profiles').select('*').limit(3);
  console.log('profiles query:', profilesRes);

  // Try querying radiologists or images if they exist
  const radiologistsRes = await supabase.from('radiologists').select('*').limit(3);
  console.log('radiologists query:', radiologistsRes);

  const studiesRes = await supabase.from('imaging_studies').select('*').limit(3);
  console.log('imaging_studies query:', studiesRes);

  const orgsRes = await supabase.from('organizations').select('*').limit(3);
  console.log('organizations query:', orgsRes);
}

test().catch(console.error);
