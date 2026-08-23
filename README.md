# saloon

Software for a saloon/barbershop to manage customer bookings, time slots, and home-service rider assignments.

## Core requirements

- Manage customer appointments with date/time slot availability.
- Prevent double-booking by keeping slot status tracked (available/booked/completed/cancelled).
- Support home-service bookings.
- Assign riders to home-service bookings and track assignment status.

## MVP feature scope

1. **Customer booking management**
   - Create, update, and cancel bookings.
   - Store customer details and selected service.

2. **Time and slot management**
   - Configure service hours.
   - Generate bookable slots and mark occupancy.

3. **Home-service rider operations**
   - Maintain rider list (active/inactive).
   - Assign available rider for a home-service booking.
   - Track rider assignment lifecycle (assigned, picked, completed).
