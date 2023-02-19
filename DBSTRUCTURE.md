# Collections
***
## tickets
```json
{
    "_id" : "TICKET UUID",
    "Name" : "HOLDER NAME",
    "type" : "Case-sensitive ticket type (ex. gold, silver, etc.) or !STAFF! for full-access to all events (Note: !STAFF! can only be overridden by !FULL! revocation)",
    "phone" : "Holders phone number",
    "eventsAttended" : "COMMA-SEPARATED eventIDs that the holder has attended"
}
```
***
## revocations
```json
{
   "_id" : "SAME AS TICKET UUID TO REVOKE",
   "reason" : "Reason for revocation (optional)",
   "type" : "!FULL! to revoke from all events, otherwise comma separated event IDs to bar from" 
}
```
***
## events
```json
{
    "_id":"EVENT UUID",
    "name":"HUMAN READABLE EVENT NAME - no need to be unique",
    "typesAllowed": "!ALL! to allow all ticket types, otherwise COMMA SEPARATED ticket types (see ticket above^)"
}
```
***
## kiosks
```json
{
    "_id":"KIOSK UUID",
    "assigned":"COMMA SEPARATED eventIDs that the kiosk can mark attendance for",
    "enrollDone": <Boolean>, //True => Enrollment completed - blocks enrollment again. False => Enrollment allowed.
    "enrollCode":"XXXX", //4-letter case-INsensitive code to use for enrollment, kinda like an OTP.
    "name":"HUMAN READABLE NAME"
}