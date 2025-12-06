import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL || 'admin@talabat.local';
const adminPassword = process.env.ADMIN_PASSWORD || 'ApproveDocs!2025';
const adminName = process.env.ADMIN_NAME || 'Ops Admin';

if (!url || !serviceRoleKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

async function ensureAdmin() {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listError) {
    console.error('Failed to list users', listError);
    process.exit(1);
  }

  let adminUser = listData?.users?.find(
    (u) => u.email?.toLowerCase() === adminEmail.toLowerCase()
  );

  if (!adminUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { user_type: 'admin' },
      app_metadata: { user_type: 'admin' },
    });
    if (error) {
      console.error('Failed to create admin user', error);
      process.exit(1);
    }
    adminUser = data.user;
    console.log(`Created admin user ${adminEmail}`);
  } else {
    // Ensure metadata is correct
    await supabase.auth.admin.updateUserById(adminUser.id, {
      user_metadata: { ...(adminUser.user_metadata || {}), user_type: 'admin' },
      app_metadata: { ...(adminUser.app_metadata || {}), user_type: 'admin' },
    });
    console.log(`Admin user ${adminEmail} already exists; metadata refreshed.`);
  }

  if (!adminUser) {
    console.error('Admin user missing after creation.');
    process.exit(1);
  }

  const { error: profileError } = await supabase
    .from('users')
    .upsert({
      id: adminUser.id,
      email: adminEmail,
      full_name: adminName,
      user_type: 'admin',
    });

  if (profileError) {
    console.error('Failed to upsert admin profile', profileError);
    process.exit(1);
  }

  console.log('Admin profile ensured with role=admin.');
}

ensureAdmin();
