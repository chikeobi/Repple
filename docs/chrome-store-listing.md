# Repple Chrome Store Listing

## Product Name
Repple

## Short Description
Generate branded dealership appointment cards from CRM data in the Chrome side panel.

## Store Assets
- `public/icons/repple-128.png`
- `public/store/repple-store-01-sidepanel.svg`
- `public/store/repple-store-02-customer-card.svg`
- `public/store/repple-store-03-activity.svg`

## Public URLs
- Homepage: `/`
- Install instructions: `/install`
- Privacy policy: `/privacy`
- Terms: `/terms`

## Permissions Rationale
- `sidePanel`: keep the rep workflow inside Chrome
- `scripting`: read visible CRM content on the active page
- `storage`: store local extension state and recent activity cache
- `tabs`: detect the active tab, refresh extraction state, and react to tab changes
- `http://*/*`, `https://*/*`: required because dealership CRMs vary by domain and the extractor works against the visible CRM page

## Submission Notes
- Repple does not send SMS.
- Repple does not replace dealership CRM messaging.
- Reps generate a card, copy the message, and paste it into the dealership's existing CRM texting flow.
