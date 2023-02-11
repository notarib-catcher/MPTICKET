# Endpoints
***
## POST /sign
```json
{
    "token" : "Signed JWT from the webserver containing the 'name', 'type' and 'phone'"
}
```
Returns
```
201 - Success and body is token (text)
401 - Cannot authenticate
500 - Server error
```
***
## GET /verify
```
&token=TOKEN
&event=EVENTID
```
Returns
```
401 - General failure / Invalid token / Ticket invalidated (revoked)
500 - Server error
404 - Event not found
403 - Barred from event / already attended / ticket type not sufficient for event
200 - valid
```
***
## PUT /enroll
```json
{
    "code" : "abcd", //4 letter enrollment code
    "name" : "a human readable name"
}
```
Returns
```
409 - Already registered
404 - code not found
400 - Malformed request
200 - Success & body is kiosk token (text)
```
***
## PUT /mark
```json
{
    "kioskToken" : "signed.kiosk.token",
    "event" : "eventID",
    "token" : "signed.ticked.token"
}
```
Returns
```
400 - malformed request
404 - ticket token not found (redundant - can't actually happen unless there's parallel writes to the same ticket)
401 - Authentication error (kiosk/ticket)
409 - Misconfigured endpoint - forces kiosk to wipe all cached data EXCEPT kiosktoken and URL, then poll /assignment for the new assignment.
 + Same errors as /verify
200 - Success
```

