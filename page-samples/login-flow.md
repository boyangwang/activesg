# login-flow

Clean browser visits https://members.myactivesg.com/auth page

The GET response will Set-cookie:

```bash
# a few below are useful, rest are analytics cookie. No harm carrying all, tho
ActiveSG=a744m4ehg1as53dg34tfjl2s2fad5q96; visid_incap_148311=XjerHGQoRKGohm7F01T0tacva1wAAAAAQUIPAAAAAAA+XlKhPKdSEuFRDwP+WMmZ; nlbi_148311=fycdY++XciOLiFunMXDQTwAAAACP8FgKelHoofZNm4wLfw7D; incap_ses_965_148311=YE41Sg5GxB9ZRM4bBl9kDacva1wAAAAAiJ0zbZF1V+br3CA/F1APBQ==; _ga=GA1.2.725564872.1550528429; _gid=GA1.2.1351220055.1550528429; _ga=GA1.3.725564872.1550528429; _gid=GA1.3.1351220055.1550528429; __hstc=165096928.0b466bd2a67c472287dda1e4399435b2.1550528430953.1550528430953.1550528430953.1; hubspotutk=0b466bd2a67c472287dda1e4399435b2; __hssrc=1; __hssc=165096928.2.1550528430953; _fbp=fb.1.1550528429465.87461506
```

In /auth page, it POST a form submit to https://members.myactivesg.com/auth/signin, entire payload below:

```
POST /auth/signin HTTP/1.1
Host: members.myactivesg.com
Connection: keep-alive
Cache-Control: max-age=0
Origin: https://members.myactivesg.com
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8
Referer: https://members.myactivesg.com/auth
Accept-Encoding: gzip, deflate
Accept-Language: en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7
Cookie: visid_incap_148311=Yz24d2peSDOPyviBELVHU9ala1wAAAAAQUIPAAAAAABy4rcZn1FFhmHyy7qIfrFV; nlbi_148311=FAIRBAdGcjl1C46vMXDQTwAAAADNll6ppNoX72larYV/yZNs; ActiveSG=6r2mq69b2g2mrms9mq6praman61c3i00; incap_ses_965_148311=J72bLpGJrS7M/gccBl9kDX+6a1wAAAAAwp8BtdcAvGaZG07ObpvC9A==
Content-Length: 457
Content-Type: application/x-www-form-urlencoded

email=wangboyang1991%40gmail.com&ecpassword=w%2FE9AqGrTPr6YJ6HAdc3WOMu23q8TdRY3Ge7Jwsu%2FTA%2F5WW0OogB%2B1MGnrAI0lodxOL6%2B7fvmLFHFjb41tRZUiSD90aqqeebi%2Bgrpjsb3OVHO23QVuo40f6tGZy0z%2Ft2B1WR06moDKVwrrHVY44jNqtxx5%2BcCn5I5J99rrjSBVd1yIQLDASyxERGWuHRpbgxx4plKwPLE%2BiVwSErzlAWueoWZdKXGQvzw1DDAdMzw7B5jrsln1xeTc9scCyG60UYY7IDG%2B%2Blm1RHkKWIS62wbt3jZ8tYdO7VGfFbpa%2BEKKM5uMs81qJH48N4cfVq3fagITc%2BhVCvlqalNkL8LUd3AA%3D%3D&_csrf=123547104b19d7976a79478ced9103c4
```

Looking at the body we can see it's `application/x-www-form-urlencoded` type, and formData is:
```
{
  email=
  ecpassword=
  _csrf=
}
```

If success, it will issue 303 See-other response to /profile, and a set of Set-Cookies header. Only below 4 are useful cookies for further requests: `const activesgCookies = ['visid', 'nlbi', 'incap', 'ActiveSG'];`

If failure, it will also issue 303 See-other, but back to /auth, and restart the flow. Cookies so far will be overwritten by Set-Cookie from the new /auth response

# encryption
There are three fields in formData, `email`, `ecpassword`, `_csrf`.

`email` is user input
`_csrf` is on page and easily extracted
`ecpassword` is encrypted user password. It's using a simple scheme:

```js
  const jsEncrypt = new JsEncrypt();
  // public key is fixed
  jsEncrypt.setPublicKey(publicKey);
  const ecPassword = jsEncrypt.encrypt(password);
```

# problem cause analysis

There are several possibilities to be checked:

## Set-Cookie
For non-browser environment, many times cookie needs to be set and carried around manually. It's possible that cookie encoding is wrong. E.g. in the top raw payload (taken from ZAP proxy), cookie values are not encoded (`+` symbol is not encoded to `%2B`, for example). But the HTTP-client used would complain INVALID_CHAR if we have some symbols. The checking regex is:

`const headerCharRegex = /[^\t\x20-\x7e\x80-\xff]/;`

Experiment 1:
Removed useless Cookies, the raw way, from proxy. And request worked! So it's ok to ignore problematic and js-generated cookies

Experiment 2:
This is the full dump of request from node http client. Let's compare:

```
POST /auth/signin HTTP/1.1
cache-control: max-age=0
connection: keep-alive
accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8
Host: members.myactivesg.com
accept-language: en-gb
content-type: application/x-www-form-urlencoded
cookies: ActiveSG=9rljque1lla7ghcj9g80d0gm5mfr3d98; visid_incap_148311=lNYhtnAmSWSnzj5aiITS7ty2a1wAAAAAQUIPAAAAAAAM6NbmAurKlMIyH1bZIvpK; nlbi_148311=KdZ0Fclb7DdXm6fLMXDQTwAAAAD9pGsyy3Xxd7F4zUaOnYxA; incap_ses_965_148311=NZg9GRLDHgVzvwUcBl9kDdy2a1wAAAAAx7Gim6lBFyqC2+cmf9p2YA==
origin: https://members.myactivesg.com
referer: https://members.myactivesg.com/auth?redirect=%2Fprofile
upgrade-insecure-requests: 1
user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36
accept-encoding: gzip,deflate
content-length: 457

email=wangboyang1991%40gmail.com&ecpassword=uFNNjUbtn02Iost7OxtXGpgG1U1kZNOdzg3ILZ9N00%2B%2F5ksL9an%2F7AtTYm68U6wR8mfqwzxXpi5btk8gtNXvjkaWdjZyDwwGFUJTKHSErj2qNLXHnJmFtDeL9%2FqwmmappQ%2F94ER7r4MiUZxUCY9eyfs23Mqpg0rMrgtJN102G3Jb2WTd%2FV8dkrvniXkm%2BFta%2FHO5UvEOlcEnEFN4%2Fmaa5FWMiuB12fjMJjvITmqMSZ56zdIJKmLLjBo%2FXFOTKZ4%2FRgR26X%2Bmloky79ceq7C1LuXKdJTeGlr%2BUxSJZ9A6k6gNJGBIX0LUXvhn3v6VzPfSjTpTVCBD0QAYa16mwT2dFQ%3D%3D&_csrf=0d45fcc787e8e66c406eb41e2bd9b713
```
It's THE SAME. I think all cookies, headers look fine. It has to be inside the POST body then.


## HTTP-client
Following above, could it be that the HTTP-client used is inconsistent with that inside the browser? It's `isomorphic-fetch` -> `node-fetch` -> nodejs native `request.https`

For example, `request.https` would set some default values for headers if they are unset. It also misses some default header values (E.g. `Host`?). Might be related. But this is less probable

**Ruled this out using Charles proxy raw dump**

## encryption
It's dead simple encryption scheme, and I don't see anywhere that it can go wrong.

However, the result is not deterministic because salt is hashed into the final result. E.g.

```
> const JsEncrypt = require('node-jsencrypt');
undefined
> let e = new JsEncrypt
undefined
> e.encrypt('foo')
'I9saWIxVkaDo9tdRnWqTxttdXN8zDggIWqGqBla+BEs5S8PR+j1vsPNYtCCTeuyhrwszdToMFfRMu2UiApqrEiPUkyEUEVggnn9EmRKmiDxjgOmBRe8RuEwJYTiVtAghxD5C59RpcyekHMXdn8hHtkOnlJXEL/AnBV9dTO0KigM='
> e.encrypt('foo')
'jELqoSNinknHVGV0pQxCeYqELhLfIu0ap6xshICmtJ5N+t2VCS04yFWKVDZ87h2+0lOha8hbP1P6bFEpLygWTfslnQ7D+29uXvYfXXPz1GY6hiAfNAEmGywJ8hxoFYG5UId0zgklxZYHIkO6sYqEq9ai3qfRPzE+w5KUErKwu84='
```

Each time. the result is different. But they are always decryptable back to the original value.

I don't have activesg's private key, so I can't do a decryption and check if it really works. But I don't see any reason how it would not

Experiment:

The ultimate scary horrible possibility: I'm using a rarely used package node-jsencrypt on nodejs. On browser it's using its version.

Could it be that these 2 are different???

Test by pausing just before req sent out, and rehash the value in node, and execute req

OMFG, it worked!!!!

**Ruled out**

## getting closer

Let's try the other direction. Intercept nodejs req and try to make it work

Also, maybe the problem is with the prev step - `GET /auth`. 

So I'm trying to inplant. I will let browser send one req that's bound to succeed. And I also let nodejs send one req that's bound to fail. And I take components from the suc req to overwrite fail req, until I found where is the root cause

整个拍过来, work了

# Conclusion
I mistake `Cookie` for `Cookies`
Period
