# MPTICKET

A ticketing system for events - built for the requirements of Manipal Institute of Technology, Bengaluru.

Details about endpoints and their functions in `./ENDPOINTS.md` and the documentation about the database structure is in `./DBSTRUCTURE.md`
(This version has been modified to work with PostgreSQL)
*** 
Will add documentation about kiosk behaviour here once the Android kiosk app is ready.
*** 
## Supports
 - Signed tickets
 - Marking attendance per event
 - Assigning kiosks to specific events
 - Revocation of tickets
 - Barring of tickets from a particular event
 - "Tiers" or "Types" of tickets which are able to access specific events

Makes heavy use of Asymmetric JWTs.
