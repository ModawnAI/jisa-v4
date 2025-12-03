declare namespace NodeJS {
  interface ProcessEnv {
    // Database
    DATABASE_URL: string;

    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;

    // OpenAI
    OPENAI_API_KEY: string;

    // Pinecone
    PINECONE_API_KEY: string;
    PINECONE_INDEX_NAME: string;

    // Google Gemini
    GEMINI_API_KEY: string;

    // Inngest
    INNGEST_EVENT_KEY: string;
    INNGEST_SIGNING_KEY: string;

    // KakaoTalk
    KAKAO_REST_API_KEY: string;
    KAKAO_CHANNEL_ID: string;
  }
}
