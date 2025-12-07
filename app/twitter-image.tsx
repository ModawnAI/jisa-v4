import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = '모드온 AI - 카카오톡 기반 AI 사내정보 챗봇';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1e9df1',
        }}
      >
        <h1
          style={{
            fontSize: '120px',
            fontWeight: '700',
            color: 'white',
            margin: 0,
            letterSpacing: '-2px',
          }}
        >
          모드온 AI
        </h1>
      </div>
    ),
    {
      ...size,
    }
  );
}
