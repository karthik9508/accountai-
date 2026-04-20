'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type SettingsState = {
  error: string | null
  message: string | null
}

export async function updateBusinessProfile(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const supabase = await createClient()

  const business_name = formData.get('business_name') as string
  const business_address = formData.get('business_address') as string
  const business_contact = formData.get('business_contact') as string
  const business_email = formData.get('business_email') as string

  const { error } = await supabase.auth.updateUser({
    data: {
      business_name,
      business_address,
      business_contact,
      business_email,
    },
  })

  if (error) {
    return { error: error.message, message: null }
  }

  revalidatePath('/settings', 'page')
  revalidatePath('/chat', 'page')
  revalidatePath('/reports', 'page')

  return { error: null, message: 'Business details updated successfully!' }
}
