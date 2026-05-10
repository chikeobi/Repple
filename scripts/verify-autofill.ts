import { extractAutofillHints } from '../utils/autofill';

const mockCrmText = [
  'Repple',
  'ABC Motors',
  'Sales Advisor',
  'Mike Anderson',
  'Appointment owner for Taylor Johnson',
  'Customer Record',
  'Taylor Johnson',
  'Appointment scheduled with Mike Anderson at ABC Motors',
  'Dealership',
  'ABC Motors',
  '12345 Katy Freeway, Houston, TX 77079',
  'Customer Name: Taylor Johnson',
  'Phone: (832) 555-0198',
  'Sales Advisor: Mike Anderson',
  'Dealership Name: ABC Motors',
  'Address: 12345 Katy Freeway, Houston, TX 77079',
  'Vehicle: 2024 Ford F-150 Lariat',
  'Year Make Model: 2024 Ford F-150 Lariat',
  'Trim: Lariat',
  'Body Style: Truck',
  'Appointment Time: May 10 at 3:30 PM',
  'Scheduled For: May 10 at 3:30 PM',
  'Salesperson: Mike Anderson',
  'Location: ABC Motors',
  'Taylor Johnson confirmed the visit for May 10 at 3:30 PM to view the 2024 Ford F-150 Lariat at ABC Motors.',
  'Mike Anderson spoke with Taylor Johnson and reviewed truck options, trade-in timing, and arrival details at 12345 Katy Freeway, Houston, TX 77079.',
].join('\n');

console.log(
  JSON.stringify(extractAutofillHints(mockCrmText, 'Repple'), null, 2),
);
