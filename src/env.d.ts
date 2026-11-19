declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    CPALEAD_POSTBACK_PASSWORD: string;
    CPA_REWARD_PERCENTAGE: string;
    CPALEAD_PUBLISHER_ID?: string;
    CPALEAD_EARNINGS_GOAL_USD?: string;
    REFERRAL_REWARD_PERCENTAGE?: string;
    NEXT_PUBLIC_SITE_URL?: string;
    VPN_API_KEY?: string;
    ADMIN_EMAILS?: string;
  }
}