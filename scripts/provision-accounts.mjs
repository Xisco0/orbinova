const url = 'https://lrbncvcmhzsdnkushsrf.supabase.co';
const key = 'sb_publishable_ZH8SuN_h4G4shc--xWhT-Q_L8aFSX7p';

const ACCOUNTS = [
  {
    role: 'hospital',
    roleLabel: 'Hospital Staff',
    email: 'hospital@orbinova.com',
    password: 'HospitalPassword2026!',
    fullName: 'Lagos University Teaching Hospital (LUTH)',
    phone: '+2348022334455'
  },
  {
    role: 'admin',
    roleLabel: 'Super Admin',
    email: 'superadmin@orbinova.com',
    password: 'SuperAdminPassword2026!',
    fullName: 'ORBINOVA Master Administrator',
    phone: '+2348011223344'
  },
  {
    role: 'blood_bank',
    roleLabel: 'Blood Bank Coordinator',
    email: 'bloodbank@orbinova.com',
    password: 'BloodBankPassword2026!',
    fullName: 'Lagos Island Central Blood Bank',
    phone: '+2348033445566'
  },
  {
    role: 'donor',
    roleLabel: 'Voluntary Blood Donor',
    email: 'donor@orbinova.com',
    password: 'DonorPassword2026!',
    fullName: 'Emeka Obi (O- Universal Donor)',
    phone: '+2348055667788'
  }
];

async function provisionAll() {
  console.log('====================================================');
  console.log('ORBINOVA — PROVISIONING DEMO & SEED ACCOUNTS');
  console.log('Target Supabase Instance:', url);
  console.log('====================================================\n');

  for (const acc of ACCOUNTS) {
    console.log(`\nProvisioning [${acc.roleLabel}] -> ${acc.email}...`);
    try {
      const res = await fetch(`${url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: acc.email,
          password: acc.password,
          data: {
            role: acc.role,
            full_name: acc.fullName,
            phone: acc.phone
          }
        })
      });

      const body = await res.json();

      if (res.ok) {
        console.log(`✅ SUCCESS: ${acc.email} registered in Supabase Auth.`);
        console.log(`   User ID: ${body.id}`);
        console.log(`   Role: ${body.user_metadata?.role}`);
        console.log(`   Confirmation Email Sent At: ${body.confirmation_sent_at || 'Pending / Automated'}`);
      } else {
        if (body.msg && body.msg.includes('already registered')) {
          console.log(`ℹ️ NOTE: User ${acc.email} is already registered in this database.`);
        } else {
          console.log(`⚠️ Status ${res.status}:`, body.msg || body.error_description || body);
        }
      }
    } catch (err) {
      console.error(`❌ Request failed for ${acc.email}:`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log('SUMMARY OF PROVISIONED ROLES & CREDENTIALS');
  console.log('====================================================');
  for (const acc of ACCOUNTS) {
    console.log(`\nRole: ${acc.roleLabel.toUpperCase()} (${acc.role})`);
    console.log(`  Email:    ${acc.email}`);
    console.log(`  Password: ${acc.password}`);
    console.log(`  Name:     ${acc.fullName}`);
  }
  console.log('====================================================\n');
}

provisionAll();
