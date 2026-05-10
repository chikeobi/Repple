export default function MockInventoryVehiclePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gap: 24,
        }}
      >
        <section
          style={{
            overflow: 'hidden',
            borderRadius: 28,
            background: '#ffffff',
            border: '1px solid rgba(18, 31, 61, 0.08)',
            boxShadow: '0 18px 42px rgba(15, 23, 42, 0.06)',
          }}
        >
          <img
            alt="2024 Ford F-150 Lariat inventory hero image"
            src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1600&h=900&q=80"
            style={{
              display: 'block',
              width: '100%',
              height: 520,
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              padding: 24,
              display: 'grid',
              gap: 12,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#8b96ac',
              }}
            >
              Inventory Detail Page
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: 38,
                lineHeight: 1.02,
                fontWeight: 800,
                color: '#132247',
              }}
            >
              2024 Ford F-150 Lariat
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                lineHeight: 1.5,
                color: '#52617e',
              }}
            >
              ABC Motors inventory listing for a 2024 Ford F-150 Lariat in black with exterior
              gallery photography and premium dealership presentation.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
