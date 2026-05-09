export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          borderRadius: 24,
          background: '#ffffff',
          border: '1px solid #e5eaf1',
          boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
          padding: 22,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            lineHeight: 1.15,
            fontWeight: 700,
            color: '#0f172a',
          }}
        >
          This appointment page is not available.
        </h1>
      </div>
    </main>
  );
}
