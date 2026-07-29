import { ImageResponse } from 'next/og';

export const alt =
  'SoyPMS — software de operación inmobiliaria para agencias y equipos';
export const contentType = 'image/png';
export const size = {
  height: 630,
  width: 1200,
};

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'stretch',
        background: 'rgb(13, 63, 56)',
        color: 'rgb(255, 255, 255)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
        height: '100%',
        justifyContent: 'space-between',
        padding: '72px 80px',
        width: '100%',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          fontSize: 34,
          fontWeight: 700,
          gap: 16,
        }}
      >
        <div
          style={{
            alignItems: 'center',
            background: 'rgb(242, 96, 63)',
            borderRadius: 14,
            display: 'flex',
            height: 58,
            justifyContent: 'center',
            width: 58,
          }}
        >
          S
        </div>
        SoyPMS
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          maxWidth: 960,
        }}
      >
        <div
          style={{
            color: 'rgb(208, 240, 236)',
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Operación inmobiliaria
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.08,
          }}
        >
          Toda tu cartera, de la captación a la comisión.
        </div>
        <div
          style={{
            color: 'rgb(208, 240, 236)',
            display: 'flex',
            fontSize: 27,
          }}
        >
          Software para agencias y equipos inmobiliarios en Latinoamérica.
        </div>
      </div>
    </div>,
    size,
  );
}
