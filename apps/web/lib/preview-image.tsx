import { ImageResponse } from 'next/og';

import type { AppointmentRecord } from './repple';

const PRIMARY_BLUE = '#1E5EFF';
const DEEP_NAVY = '#111B36';
const MUTED_TEXT = '#6F7B93';
const SERIF_FAMILY =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, "Times New Roman", serif';

function resolveAccentColor(value: string | null) {
  const normalized = value?.trim() ?? '';

  if (/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(normalized)) {
    return normalized;
  }

  return PRIMARY_BLUE;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return `rgba(30, 94, 255, ${alpha})`;
  }

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export const previewImageSize = {
  width: 1200,
  height: 630,
};

export const previewImageContentType = 'image/png';

function DealershipGlyph({
  accentColor,
  dealershipName,
  logoUrl,
}: {
  accentColor: string;
  dealershipName: string;
  logoUrl: string | null;
}) {
  if (logoUrl) {
    return (
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 22,
          border: `1px solid ${hexToRgba(accentColor, 0.14)}`,
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          alt={dealershipName}
          src={logoUrl}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: 68,
        height: 68,
        borderRadius: 22,
        border: `1px solid ${hexToRgba(accentColor, 0.14)}`,
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: accentColor,
      }}
    >
      <svg aria-hidden="true" fill="none" height="40" viewBox="0 0 28 28" width="40">
        <rect
          height="22"
          rx="7"
          stroke={accentColor}
          strokeWidth="2.2"
          width="22"
          x="3"
          y="3"
        />
        <path
          d="M9 6.5v15M19 6.5v15M9 14c1.6 1.9 3.1 2.8 5 2.8 1.9 0 3.4-.9 5-2.8"
          stroke={accentColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
      </svg>
    </div>
  );
}

export function renderAppointmentPreviewImage(record: AppointmentRecord | null) {
  const previewImageUrl = record?.vehicleImageUrl || null;
  const accentColor = resolveAccentColor(record?.dealershipBrandColor ?? null);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#F5F7FB',
          padding: 28,
          fontFamily:
            'SF Pro Display, SF Pro Text, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#FFFFFF',
            borderRadius: 34,
            padding: 28,
            boxShadow: '0 18px 44px rgba(15, 23, 42, 0.08)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: '0 0 auto 0',
              height: 8,
              borderTopLeftRadius: 34,
              borderTopRightRadius: 34,
              background: `linear-gradient(90deg, ${accentColor} 0%, ${hexToRgba(accentColor, 0.52)} 100%)`,
            }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <DealershipGlyph
              accentColor={accentColor}
              dealershipName={record?.dealershipName || 'Repple'}
              logoUrl={record?.dealershipLogoUrl ?? null}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  color: DEEP_NAVY,
                  fontSize: 28,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {record?.dealershipName || 'Repple'}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 1,
                    background: 'rgba(111, 123, 147, 0.3)',
                  }}
                />
                <div
                  style={{
                    color: MUTED_TEXT,
                    fontSize: 14,
                  }}
                >
                  Personalized appointment details
                </div>
                <div
                  style={{
                    width: 56,
                    height: 1,
                    background: 'rgba(111, 123, 147, 0.3)',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                maxWidth: 860,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 10,
                color: DEEP_NAVY,
                fontFamily: SERIF_FAMILY,
                fontSize: 54,
                lineHeight: 0.98,
                fontWeight: 700,
                letterSpacing: '-0.04em',
              }}
            >
                <span style={{ color: accentColor }}>{record?.firstName || 'Customer'},</span>
                <span>your appointment card is ready.</span>
              </div>
            <div
              style={{
                color: MUTED_TEXT,
                fontSize: 22,
                lineHeight: 1.3,
              }}
            >
              We can&apos;t wait to show you everything in person.
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              flex: 1,
              display: 'flex',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 28,
              background: '#EAF0F9',
            }}
          >
            {previewImageUrl ? (
              <img
                alt=""
                src={previewImageUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : null}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                background:
                  'linear-gradient(180deg, rgba(17,27,54,0.03) 0%, rgba(17,27,54,0.16) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 18,
                left: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.9)',
                padding: '10px 14px',
                color: accentColor,
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Personalized experience
            </div>
            <div
              style={{
                position: 'absolute',
                left: 18,
                bottom: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                background: 'rgba(17, 24, 39, 0.58)',
                padding: '10px 14px',
                backdropFilter: 'blur(14px)',
                color: '#ffffff',
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              Premium arrival details
            </div>
          </div>
        </div>
      </div>
    ),
    previewImageSize,
  );
}
