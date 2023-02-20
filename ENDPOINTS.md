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
## POST /enroll
```json
{
    "code" : "abcd", //4 letter enrollment code
    "name" : "a human readable name"
}
```
Returns
```
503 - Server configuration does not allow for enrollment (edit the config.json)
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
***
## GET /assignment
```
&kioskToken=signed.kiosk.token
```
Returns
```
400 - malformed request
404 - kiosk does not exist (Probably deleted / unregistered by an admin)
401 - token invalid
409 - enrollment status conflict (kiosk enrollment not finished)
204 - no assignment
200 - Success - Body contains the assignment string formatted as "<assignment name>+<assignment id>"
```
***
## GET /key
No query parameters or body
Returns
```
200 - the public key used to verify kiosktokens and tickets' JWTs.
```
