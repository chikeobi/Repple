import { ImageResponse } from 'next/og';

import type { AppointmentRecord } from './repple';

const PRIMARY_BLUE = '#1E5EFF';
const DEEP_NAVY = '#111B36';
const MUTED_TEXT = '#6F7B93';
const SERIF_FAMILY =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, "Times New Roman", serif';

export const previewImageSize = {
  width: 1200,
  height: 630,
};

export const previewImageContentType = 'image/png';

function DealershipGlyph() {
  return (
    <div
      style={{
        width: 68,
        height: 68,
        borderRadius: 22,
        border: '1px solid rgba(30, 94, 255, 0.14)',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: PRIMARY_BLUE,
      }}
    >
      <svg aria-hidden="true" fill="none" height="40" viewBox="0 0 28 28" width="40">
        <rect
          height="22"
          rx="7"
          stroke={PRIMARY_BLUE}
          strokeWidth="2.2"
          width="22"
          x="3"
          y="3"
        />
        <path
          d="M9 6.5v15M19 6.5v15M9 14c1.6 1.9 3.1 2.8 5 2.8 1.9 0 3.4-.9 5-2.8"
          stroke={PRIMARY_BLUE}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
      </svg>
    </div>
  );
}

export function renderAppointmentPreviewImage(record: AppointmentRecord | null) {
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
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <DealershipGlyph />
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
                  Real People. Real Service.
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
              <span style={{ color: PRIMARY_BLUE }}>{record?.firstName || 'Customer'},</span>
              <span>your vehicle is reserved.</span>
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
            {record ? (
              <img
                alt=""
                src={record.videoThumbnailUrl}
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
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.96)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 18px 36px rgba(15, 23, 42, 0.14)',
                }}
              >
                <svg aria-hidden="true" fill={PRIMARY_BLUE} height="36" viewBox="0 0 20 20" width="36">
                  <path d="M7 4.5v11l8-5.5-8-5.5Z" />
                </svg>
              </div>
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
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              A personal message for you
            </div>
          </div>
        </div>
      </div>
    ),
    previewImageSize,
  );
}
