import type { VideoGenerationStatus } from '../utils/types';

type PersonalizedVideoCardProps = {
  status: VideoGenerationStatus;
  thumbnailUrl: string;
  title: string;
  subtitle: string;
  compact?: boolean;
  onPlay?: () => void;
};

export function PersonalizedVideoCard({
  status,
  thumbnailUrl,
  title,
  subtitle,
  compact,
  onPlay,
}: PersonalizedVideoCardProps) {
  return (
    <div
      className={
        compact
          ? 'relative aspect-[16/9] overflow-hidden rounded-[16px] border border-[#E5EAF1] bg-[#EEF3FA] shadow-[0_8px_22px_rgba(15,23,42,0.05)]'
          : 'relative aspect-[16/9] overflow-hidden rounded-[18px] border border-[#E5EAF1] bg-[#EEF3FA] shadow-[0_10px_28px_rgba(15,23,42,0.06)]'
      }
    >
      <img
        alt=""
        className="h-full w-full object-cover"
        src={thumbnailUrl}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,17,26,0.04),rgba(12,17,26,0.18))]" />

      {status === 'processing' ? (
        <div className="absolute inset-0 flex flex-col justify-end p-3">
          <div className="rounded-[14px] bg-[rgba(255,255,255,0.94)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#1473FF]" />
              <p className="text-[13px] font-medium text-[#0F1728]">
                Generating personalized video...
              </p>
            </div>
            <p className="mt-1 text-[12px] leading-5 text-[#5B657A]">
              Creating a custom welcome clip for this appointment.
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E7EDF5]">
              <div className="repple-progress-bar h-full w-1/2 rounded-full bg-[#1473FF]" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <button
            className="absolute inset-0 flex items-center justify-center"
            onClick={onPlay}
            type="button"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_12px_30px_rgba(15,23,42,0.14)]">
              <svg aria-hidden="true" fill="#1473FF" height="22" viewBox="0 0 20 20" width="22">
                <path d="M7 4.5v11l8-5.5-8-5.5Z" />
              </svg>
            </span>
          </button>

          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
            <div className="rounded-[12px] bg-[rgba(17,24,39,0.74)] px-3 py-2 text-white shadow-[0_8px_20px_rgba(0,0,0,0.16)] backdrop-blur">
              <p className="text-[13px] font-medium">{title}</p>
              <p className="mt-0.5 text-[12px] text-white/74">{subtitle}</p>
            </div>
            <div className="rounded-full border border-white/70 bg-white/92 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#1473FF] shadow-[0_6px_16px_rgba(15,23,42,0.08)]">
              Ready
            </div>
          </div>
        </>
      )}
    </div>
  );
}
