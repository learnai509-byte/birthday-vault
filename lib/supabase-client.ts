import { createClient } from '@supabase/supabase-js';

let supabaseClient: any = null;

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
  }
  if (!supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined');
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

export async function saveVaultData(secretKeyHash: string, data: any) {
  try {
    const supabase = getSupabaseClient();
    
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
    const supabase = getSupabaseClient();
    
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