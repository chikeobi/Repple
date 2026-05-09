import { ImageResponse } from 'next/og';

import type { AppointmentRecord } from './repple';

export const previewImageSize = {
  width: 1200,
  height: 630,
};

export const previewImageContentType = 'image/png';

export function renderAppointmentPreviewImage(record: AppointmentRecord | null) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#f5f8fc',
          padding: 36,
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
            background: '#ffffff',
            borderRadius: 36,
            border: '1px solid #e5eaf1',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
            padding: 34,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              border: '1px solid #d8e2f0',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1473ff',
            }}
          >
            <svg aria-hidden="true" fill="none" height="44" viewBox="0 0 28 28" width="44">
              <rect
                height="22"
                rx="7"
                stroke="#1473FF"
                strokeWidth="2.2"
                width="22"
                x="3"
                y="3"
              />
              <path
                d="M9 6.5v15M19 6.5v15M9 14c1.6 1.9 3.1 2.8 5 2.8 1.9 0 3.4-.9 5-2.8"
                stroke="#1473FF"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
              />
            </svg>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 18,
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                >
                  {record?.dealershipName || 'Repple'}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    color: '#64748b',
                  }}
                >
                  {record?.salespersonName || 'Sales Advisor'} recorded a quick video.
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 16px',
                  borderRadius: 999,
                  background: '#f4f8ff',
                  color: '#1473ff',
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                Reserved For You
              </div>
            </div>

            <div
              style={{
                fontSize: 56,
                lineHeight: 1.02,
                fontWeight: 700,
                color: '#0f172a',
                letterSpacing: '-0.04em',
              }}
            >
              <span style={{ color: '#1473ff' }}>{record?.firstName || 'Customer'},</span>{' '}
              your vehicle is reserved.
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              position: 'relative',
              flex: 1,
              display: 'flex',
              overflow: 'hidden',
              borderRadius: 28,
              border: '1px solid #e5eaf1',
              background: '#edf3fa',
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
                  'linear-gradient(180deg, rgba(15,23,42,0.03) 0%, rgba(15,23,42,0.18) 100%)',
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
                  width: 120,
                  height: 120,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.96)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 20px 40px rgba(15, 23, 42, 0.14)',
                }}
              >
                <svg aria-hidden="true" fill="#1473ff" height="42" viewBox="0 0 20 20" width="42">
                  <path d="M7 4.5v11l8-5.5-8-5.5Z" />
                </svg>
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                left: 24,
                bottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.8)',
                  background: 'rgba(255,255,255,0.92)',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {(record?.salespersonName || 'S').charAt(0).toUpperCase()}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: '12px 16px',
                  borderRadius: 18,
                  background: 'rgba(15,23,42,0.76)',
                  color: '#ffffff',
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {record?.vehicle || 'Vehicle reserved'}
                </div>
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)' }}>
                  A personal message for you
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    previewImageSize,
  );
}
