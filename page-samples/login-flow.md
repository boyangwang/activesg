# login-flow

Clean browser visits https://members.myactivesg.com/auth page

The GET response will Set-cookie:

```bash
# a few below are useful, rest are analytics cookie. No harm carrying all, tho
ActiveSG=a744m4ehg1as53dg34tfjl2s2fad5q96; visid_incap_148311=XjerHGQoRKGohm7F01T0tacva1wAAAAAQUIPAAAAAAA+XlKhPKdSEuFRDwP+WMmZ; nlbi_148311=fycdY++XciOLiFunMXDQTwAAAACP8FgKelHoofZNm4wLfw7D; incap_ses_965_148311=YE41Sg5GxB9ZRM4bBl9kDacva1wAAAAAiJ0zbZF1V+br3CA/F1APBQ==; _ga=GA1.2.725564872.1550528429; _gid=GA1.2.1351220055.1550528429; _ga=GA1.3.725564872.1550528429; _gid=GA1.3.1351220055.1550528429; __hstc=165096928.0b466bd2a67c472287dda1e4399435b2.1550528430953.1550528430953.1550528430953.1; hubspotutk=0b466bd2a67c472287dda1e4399435b2; __hssrc=1; __hssc=165096928.2.1550528430953; _fbp=fb.1.1550528429465.87461506
```

In /auth page, it POST a form submit to https://members.myactivesg.com/auth/signin, entire payload below:

```
POST https://members.myactivesg.com/auth/signin HTTP/1.1
Connection: keep-alive
Content-Length: 453
Cache-Control: max-age=0
Origin: https://members.myactivesg.com
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36
Content-Type: application/x-www-form-urlencoded
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8
Referer: https://members.myactivesg.com/auth?redirect=%2Fprofile
Accept-Language: en-gb
Cookie: ActiveSG=a744m4ehg1as53dg34tfjl2s2fad5q96; visid_incap_148311=XjerHGQoRKGohm7F01T0tacva1wAAAAAQUIPAAAAAAA+XlKhPKdSEuFRDwP+WMmZ; nlbi_148311=fycdY++XciOLiFunMXDQTwAAAACP8FgKelHoofZNm4wLfw7D; incap_ses_965_148311=YE41Sg5GxB9ZRM4bBl9kDacva1wAAAAAiJ0zbZF1V+br3CA/F1APBQ==; _ga=GA1.2.725564872.1550528429; _gid=GA1.2.1351220055.1550528429; _ga=GA1.3.725564872.1550528429; _gid=GA1.3.1351220055.1550528429; __hstc=165096928.0b466bd2a67c472287dda1e4399435b2.1550528430953.1550528430953.1550528430953.1; hubspotutk=0b466bd2a67c472287dda1e4399435b2; __hssrc=1; __hssc=165096928.2.1550528430953; _fbp=fb.1.1550528429465.87461506
Host: members.myactivesg.com

email=wangboyang1991%40gmail.com&ecpassword=SmFDU4i8Di%2F1VB9F0bZVqMdgA%2BzgUyj0nOOfYepHn1mkwK0Tj0Ww14JAaYWXE1Wk7gfeWf%2FG7atq7S39zYBeFtCwdYnYCOsNqKx2jquBrSDLZFgbh2X7B8%2Bh7PJQuzKjF6Gz47Fm8vzEYM1XcmudzBxHcjtkB81hOVjvktM30Zm3%2Bs9kJKOki6X5plIRh5PFtAwszz5kddXxT%2Fc05Rt1L1kW5rI54Fk2u97zlL9vvO8g9plFVkLTFeQJQSDpQSKaLsvdGrEM%2BS0Wo9eO%2FzZXYjHlNShb83cYPkAil2VBVi5%2FDAMXovDXPTuVAWemg%2Fq6TsdXX%2Bb3VY3n5yYumDG65g%3D%3D&_csrf=8c4e43cd334203b3d82077548d7506bc
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

## HTTP-client
Following above, could it be that the HTTP-client used is inconsistent with that inside the browser? It's `isomorphic-fetch` -> `node-fetch` -> nodejs native `request.https`

For example, `request.https` would set some default values for headers if they are unset. It also misses some default header values (E.g. `Host`?). Might be related. But this is less probable

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
