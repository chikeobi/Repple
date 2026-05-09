export type VideoGenerationStatus = 'processing' | 'ready';

export type AppointmentRecord = {
  id: string;
  firstName: string;
  vehicle: string;
  appointmentTime: string;
  salespersonName: string;
  dealershipName: string;
  dealershipAddress: string;
  landingPageUrl: string;
  previewImageUrl: string;
  smsText: string;
  videoProvider: 'mock';
  videoStatus: VideoGenerationStatus;
  videoJobId: string;
  videoUrl: string;
  videoThumbnailUrl: string;
  videoRequestedAt: string;
  videoReadyAt: string;
  createdAt: string;
};

export type SmsDeliveryPayload = {
  body: string;
  mediaUrl: string;
  shortUrl: string;
};

export type AppointmentDraft = {
  firstName: string;
  vehicle: string;
  appointmentTime: string;
  salespersonName: string;
};

export type AutofillHints = {
  firstName?: string;
  vehicle?: string;
  appointmentTime?: string;
  sourceTitle?: string;
};
