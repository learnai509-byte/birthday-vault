import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if they exist
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing');
}
if (!supabaseKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
}

// Create client (will throw error if missing)
export const supabase = createClient(
  supabaseUrl || '',
  supabaseKey || ''
);

export async function saveVaultData(secretKeyHash: string, data: any) {
  try {
    const { data: result, error } = await supabase
      .from('vault_data')
      .upsert({
        secret_key_hash: secretKeyHash,
        birthday_date: data.birthdayDate,
        memories: data.memories || [],
        background_music: data.audio?.backgroundMusic || null,
        heartbeat_sound: data.audio?.heartbeat || null,
        final_letter: data.finalLetter || null,
      }, {
        onConflict: 'secret_key_hash'
      });

    if (error) throw error;
    return { success: true, data: result };
  } catch (err) {
    console.error('Save error:', err);
    return { success: false, error: err };
  }
}

export async function getVaultData(secretKeyHash: string) {
  try {
    const { data, error } = await supabase
      .from('vault_data')
      .select('*')
      .eq('secret_key_hash', secretKeyHash)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Get error:', err);
    return { success: false, error: err };
  }
}