import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Connecting to Supabase at:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DEMO_USERS = [
  {
    email: 'superadmin@orbinova.com',
    password: 'SuperAdminPassword2026!',
    fullName: 'ORBINOVA Super Admin',
    role: 'admin',
    phone: '+2348011223344'
  },
  {
    email: 'hospital@orbinova.com',
    password: 'HospitalPassword2026!',
    fullName: 'Lagos University Teaching Hospital (LUTH)',
    role: 'hospital',
    phone: '+2348022334455'
  },
  {
    email: 'bloodbank@orbinova.com',
    password: 'BloodBankPassword2026!',
    fullName: 'Lagos Island Central Blood Bank',
    role: 'blood_bank',
    phone: '+2348033445566'
  },
  {
    email: 'donor@orbinova.com',
    password: 'DonorPassword2026!',
    fullName: 'Emeka Obi',
    role: 'donor',
    phone: '+2348055667788'
  }
];

async function seed() {
  for (const user of DEMO_USERS) {
    console.log(`\nProvisioning ${user.email} (${user.role})...`);
    
    // Check if user already exists
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    
    let existingUser = null;
    if (listData?.users) {
      existingUser = listData.users.find(u => u.email === user.email);
    }
    
    let userId = existingUser?.id;

    if (existingUser) {
      console.log(`User already exists (ID: ${userId}). Updating password & metadata...`);
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.fullName,
            role: user.role,
            phone: user.phone
          }
        }
      );
      if (updateError) {
        console.error('Update error:', updateError.message);
      } else {
        console.log('User updated successfully.');
      }
    } else {
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
          role: user.role,
          phone: user.phone
        }
      });
      if (createError) {
        console.error('Create error:', createError.message);
        continue;
      }
      userId = createData.user.id;
      console.log(`Created user with ID: ${userId}`);
    }

    // Upsert into public.profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        is_active: true,
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile upsert error:', profileError.message);
    } else {
      console.log('Profile record verified.');
    }
  }

  console.log('\nAll demo users successfully provisioned!');
}

seed().catch(err => {
  console.error('Fatal error:', err);
});
