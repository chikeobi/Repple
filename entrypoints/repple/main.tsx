import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import { BrandMark } from '../../components/BrandMark';
import { buildLandingPageUrl, getAppointmentIdFromSearch } from '../../utils/repple';
import '../../styles/globals.css';

function RedirectPage() {
  const appointmentId = getAppointmentIdFromSearch(window.location.search);

  useEffect(() => {
    if (!appointmentId) {
      return;
    }

    window.location.replace(buildLandingPageUrl(appointmentId));
  }, [appointmentId]);

  if (appointmentId) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-6">
        <div className="w-full max-w-[430px] rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-white p-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex justify-center">
            <BrandMark />
          </div>
          <p className="mt-6 text-sm text-[var(--repple-muted)]">
            Redirecting to the public Repple page...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6">
      <div className="w-full max-w-[430px] rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-white p-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex justify-center">
          <BrandMark />
        </div>
        <p className="mt-6 text-base font-semibold text-[var(--repple-ink)]">
          This Repple page is no longer hosted inside the extension.
        </p>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<RedirectPage />);
