import { APPOINTMENT_EVENT_TYPES, type AppointmentEventType } from './supabase-schema';

export type AppointmentEventCounts = Record<AppointmentEventType, number>;

type RpcCapableClient = any;
type CountCapableClient = any;

export function createEmptyAppointmentEventCounts(): AppointmentEventCounts {
  return {
    appointment_created: 0,
    card_opened: 0,
    message_copied: 0,
    card_viewed: 0,
    confirmed: 0,
    reschedule_requested: 0,
  };
}

export async function trackAppointmentEvent(
  client: RpcCapableClient,
  input: {
    shortId: string;
    eventType: AppointmentEventType;
    metadata?: Record<string, unknown> | null;
  },
) {
  const { error } = await client.rpc('record_appointment_event', {
    input_short_id: input.shortId,
    input_event_type: input.eventType,
    input_metadata_json: input.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchAppointmentEventCounts(
  client: CountCapableClient,
  organizationId: string,
) {
  const counts = createEmptyAppointmentEventCounts();

  await Promise.all(
    APPOINTMENT_EVENT_TYPES.map(async (eventType) => {
      const { count, error } = await client
        .from('appointment_events')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('organization_id', organizationId)
        .eq('event_type', eventType);

      if (error) {
        throw new Error(error.message);
      }

      counts[eventType] = count ?? 0;
    }),
  );

  return counts;
}
