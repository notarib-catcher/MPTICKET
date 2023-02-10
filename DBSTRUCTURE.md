# Collections
***
## tickets
```json
{
    "_id" : "TICKET UUID",
    "Name" : "HOLDER NAME",
    "type" : "Case-sensitive ticket type (ex. gold, silver, etc.)",
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