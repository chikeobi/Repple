import type { ReactNode } from 'react';

function SidebarLink({
  active = false,
  label,
}: {
  active?: boolean;
  label: string;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: '12px 14px',
        fontSize: 14,
        fontWeight: active ? 700 : 500,
        color: active ? '#123a9d' : '#52617e',
        background: active ? 'rgba(24,72,198,0.08)' : 'transparent',
      }}
    >
      {label}
    </div>
  );
}

function Panel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section
      style={{
        borderRadius: 20,
        background: '#ffffff',
        border: '1px solid rgba(18, 31, 61, 0.08)',
        boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06)',
        padding: 20,
      }}
    >
      <h2
        style={{
          margin: '0 0 16px',
          fontSize: 18,
          lineHeight: 1.1,
          fontWeight: 700,
          color: '#14203d',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: '#7a869e',
        }}
      >
        {label}
      </span>
      <input
        readOnly
        value={value}
        style={{
          height: 46,
          borderRadius: 14,
          border: '1px solid rgba(18, 31, 61, 0.1)',
          background: '#f9fbff',
          padding: '0 14px',
          fontSize: 15,
          color: '#172341',
          outline: 'none',
        }}
      />
    </label>
  );
}

function ActivityItem({
  body,
  time,
  title,
}: {
  body: string;
  time: string;
  title: string;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid rgba(18, 31, 61, 0.08)',
        background: '#fbfcff',
        padding: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: '#14203d',
          }}
        >
          {title}
        </p>
        <span
          style={{
            fontSize: 12,
            color: '#6d7a93',
          }}
        >
          {time}
        </span>
      </div>
      <p
        style={{
          margin: '8px 0 0',
          fontSize: 14,
          lineHeight: 1.5,
          color: '#52617e',
        }}
      >
        {body}
      </p>
    </div>
  );
}

export default function MockCrmPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #f4f7fc 0%, #eef3fa 50%, #f7f9fd 100%)',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1440,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '260px minmax(0, 1fr)',
          gap: 20,
        }}
      >
        <aside
          style={{
            borderRadius: 28,
            background: '#ffffff',
            border: '1px solid rgba(18, 31, 61, 0.08)',
            boxShadow: '0 18px 42px rgba(15, 23, 42, 0.06)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div>
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
              CRM Workspace
            </p>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 24,
                fontWeight: 800,
                color: '#132247',
              }}
            >
              North Coast Auto
            </p>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <SidebarLink label="Dashboard" />
            <SidebarLink label="Leads" />
            <SidebarLink active label="Appointments" />
            <SidebarLink label="Sales Queue" />
            <SidebarLink label="Inventory" />
            <SidebarLink label="Desking" />
            <SidebarLink label="Service Drive" />
          </div>

          <div
            style={{
              marginTop: 'auto',
              borderRadius: 18,
              background: '#f7f9fd',
              padding: 16,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#8692a9',
              }}
            >
              Sales Advisor
            </p>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 18,
                fontWeight: 700,
                color: '#132247',
              }}
            >
              Mike Anderson
            </p>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 14,
                color: '#5d6c88',
              }}
            >
              Appointment owner for Taylor Johnson
            </p>
          </div>
        </aside>

        <div style={{ display: 'grid', gap: 20 }}>
          <section
            style={{
              borderRadius: 28,
              background: '#ffffff',
              border: '1px solid rgba(18, 31, 61, 0.08)',
              boxShadow: '0 18px 42px rgba(15, 23, 42, 0.06)',
              padding: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 20,
              }}
            >
              <div>
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
                  Customer Record
                </p>
                <h1
                  style={{
                    margin: '10px 0 0',
                    fontSize: 34,
                    lineHeight: 1,
                    fontWeight: 800,
                    color: '#132247',
                  }}
                >
                  Taylor Johnson
                </h1>
                <p
                  style={{
                    margin: '10px 0 0',
                    fontSize: 15,
                    color: '#52617e',
                  }}
                >
                  Appointment scheduled with Mike Anderson at North Coast Auto
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 8,
                  textAlign: 'right',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: '#8b96ac',
                  }}
                >
                  Dealership
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#132247',
                  }}
                >
                  North Coast Auto
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: '#5d6c88',
                  }}
                >
                  12345 Katy Freeway, Houston, TX 77079
                </span>
              </div>
            </div>
          </section>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.08fr 0.92fr',
              gap: 20,
            }}
          >
            <div style={{ display: 'grid', gap: 20 }}>
              <Panel title="Customer Details">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 14,
                  }}
                >
                  <FieldRow label="Customer Name" value="Taylor Johnson" />
                  <FieldRow label="Phone" value="(832) 555-0198" />
                  <FieldRow label="Sales Advisor" value="Mike Anderson" />
                  <FieldRow label="Dealership Name" value="North Coast Auto" />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <FieldRow
                      label="Address"
                      value="12345 Katy Freeway, Houston, TX 77079"
                    />
                  </div>
                </div>
              </Panel>

              <Panel title="Vehicle Details">
                <div style={{ display: 'grid', gap: 16 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.1fr 0.9fr',
                      gap: 14,
                      alignItems: 'start',
                    }}
                  >
                    <div
                      style={{
                        overflow: 'hidden',
                        borderRadius: 18,
                        border: '1px solid rgba(18, 31, 61, 0.08)',
                        background: '#f6f9ff',
                      }}
                    >
                      <img
                        alt="2024 Ford F-150 Lariat inventory photo"
                        src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&h=800&q=80"
                        style={{
                          display: 'block',
                          width: '100%',
                          height: 220,
                          objectFit: 'cover',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        borderRadius: 16,
                        border: '1px solid rgba(18, 31, 61, 0.08)',
                        background: '#fbfcff',
                        padding: 14,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: '#7a869e',
                        }}
                      >
                        Inventory Match
                      </p>
                      <p
                        style={{
                          margin: '8px 0 0',
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: '#172341',
                        }}
                      >
                        Visible vehicle imagery is present directly on this CRM fixture so Repple can test extraction without relying on a second mock inventory route.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 14,
                    }}
                  >
                  <FieldRow label="Vehicle" value="2024 Ford F-150 Lariat" />
                  <FieldRow label="Year Make Model" value="2024 Ford F-150 Lariat" />
                  <FieldRow label="Trim" value="Lariat" />
                  <FieldRow label="Body Style" value="Truck" />
                  </div>
                </div>
              </Panel>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              <Panel title="Appointment Details">
                <div
                  style={{
                    display: 'grid',
                    gap: 14,
                  }}
                >
                  <FieldRow label="Appointment Time" value="May 10 at 3:30 PM" />
                  <FieldRow label="Scheduled For" value="May 10 at 3:30 PM" />
                  <FieldRow label="Salesperson" value="Mike Anderson" />
                  <FieldRow label="Location" value="North Coast Auto" />
                </div>
              </Panel>

              <Panel title="Notes & Activity">
                <div style={{ display: 'grid', gap: 12 }}>
                  <ActivityItem
                    title="Appointment Confirmed"
                    time="Today 10:42 AM"
                    body="Taylor Johnson confirmed the visit for May 10 at 3:30 PM to view the 2024 Ford F-150 Lariat at North Coast Auto."
                  />
                  <ActivityItem
                    title="Call Summary"
                    time="Today 9:15 AM"
                    body="Mike Anderson spoke with Taylor Johnson and reviewed truck options, trade-in timing, and arrival details at 12345 Katy Freeway, Houston, TX 77079."
                  />
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: '#7a869e',
                      }}
                    >
                      Internal Notes
                    </span>
                    <textarea
                      readOnly
                      value="Customer requested a black or dark gray truck. Mentioned arriving with spouse. Ask for Taylor Johnson at check-in."
                      style={{
                        minHeight: 120,
                        resize: 'none',
                        borderRadius: 16,
                        border: '1px solid rgba(18, 31, 61, 0.1)',
                        background: '#f9fbff',
                        padding: 14,
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: '#172341',
                        outline: 'none',
                      }}
                    />
                  </label>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
