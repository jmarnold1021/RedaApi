# Overview
These docs describe the resources that make up the ReDa REST API.

### Bug Reporting and Feature Requests
If you have any problems, see any bugs, or receieve 500/501 responses,

If you have any feature requests

### Root Endpoint
The root api endpoint <%HOSTNAME%> with or without "/api/v0" will redirect to these docs.

### REST Clients
* CLI - [cURL](https://curl.haxx.se/docs/manpage.html)
* GUI (google App is easiest) - [Postman](https://www.getpostman.com/products)

### Authentication/Authorization
Depending on the project this ReDa is supporting authentication may be required. All authentication is done through vice.io.

* USING cURL
```
# Can pass to curl with -u (special to curl)
curl -X GET -u "username:password" "http://<%HOSTNAME%>/api/v0/runs?RunId=1"

# Or in the Request Header where *** is a base64 encoded version of 'username:password' of a vice.io account
curl -X GET -H "Authorization: Basic ***" "http://<%HOSTNAME%>/api/v0/runs?RunId=1"
```

* USING Postman  - [Postman Tutorial](https://www.getpostman.com/docs/postman/sending_api_requests/requests)

### URL Encoding
Query strings with spaces and other special characters may require special encodings before sending the request, supported encodings are UTF-8. Whether these encodings are automatically applied depends on the client.

* [URL Encoding Reference](https://www.w3schools.com/tags/ref_urlencode.asp)
```
# Example, where %20 represents a space character in UTF-8
curl -X GET "http://<%HOSTNAME%>/api/v0/runs?RunName=MAC%20CAT&StationName=SatApps"
```

### Other Tools

* [JSON Pretty Print](http://jsonparseronline.com/)
* [JSON -> CSV Converter](http://www.convertcsv.com/json-to-csv.htm)
* [CSV -> JSON Converter](http://www.csvjson.com/csv2json)
* [Base64 Encoding/Decoding](https://www.base64encode.org/)
* [URL Encoding/Decoding](https://www.urldecoder.org/)

### Responses 
Successful Get Request 
```
{
    "code": 200,
    "data": "Array of JSON result objects" 
}
```
Successful Post Request 
```
{
    "code": 200,
    "data": "Mysql insert object" 
}
```
Errors
```
{
    "code": 400,
    "message":"Error performing query, check request body and params" 
}
```
```
{
    "code": 401,
    "message":"Not Authorized" 
}
```
```
{
    "code": 404,
    "message":"Could not find the specified resource, check that proper ids and params are used" 
}
```
```
{
    "code": 500,
    "message":"Internal Server Error, See Docs about Bug Reporting"
}
```
```
{
    "code": 501,
    "message":"Unknown Error Occured, See Docs about Bug Reporting"
}
```
