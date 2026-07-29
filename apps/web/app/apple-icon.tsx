import { ImageResponse } from 'next/og';

export const contentType = 'image/png';
export const size = {
  height: 180,
  width: 180,
};

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        background: 'rgb(13, 63, 56)',
        color: 'rgb(255, 255, 255)',
        display: 'flex',
        fontFamily: 'sans-serif',
        fontSize: 96,
        fontWeight: 700,
        height: '100%',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      S
    </div>,
    size,
  );
}
