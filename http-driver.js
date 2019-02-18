require('isomorphic-fetch');
const JsEncrypt = require('node-jsencrypt');
const moment = require('moment');

const cookiesArrToValue = (arr) => {
  return arr
    // only useful cookies
    .filter(record => {
      const activesgCookies = ['visid', 'nlbi', 'incap', 'ActiveSG'];
      return activesgCookies.some(c => record.startsWith(c));
    })
    .map(record => record.substring(0, record.indexOf(';')))
    .join('; ');
};

const getLoginCookiesFromRequest = async () => {
  const email = process.argv[2];
  const password = process.argv[3];

  const authPageResponse = await fetch('https://members.myactivesg.com/auth');
  const authPageCookies = Array.from(authPageResponse.headers._headers['set-cookie']);
  console.log('authCookies', authPageCookies);
  const loginPage = await authPageResponse.text();
  
  const loginCsrf = loginPage.match(/\<input type\=\"hidden\" name\=\"_csrf\" value\=\"(.+)\" \/\>/)[1];
  const publicKey = loginPage.match(/(-----BEGIN PUBLIC KEY-----[\s\S]+-----END PUBLIC KEY-----)/)[1];
//   const publicKey = `-----BEGIN PUBLIC KEY-----
// MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7FIdkpLsrZbAqtGc5BJk
// /ZDfWz+YFdRIOflYuy+cbJE0fFS84jX4X6kIYz/nYDBDOOCv04jCDybeTPqC5Lb2
// SVXKKrt3LS8Ai115D24gX7Bw93oukb1yF/kHMtXn5ixLg1J0hPDv2N4XqskqN4KC
// tXWHgSTpdmJLsIN7Jr8JApcxRztpFT4EgokSXHXVPxUHiGzpTp4LEO4Yk89JIDWw
// mym7Pd5bHLx8fmf4b+2/6bXaDC1N9/1nNSX24QkKlV4Xafetezr6yj0vInEeksTj
// to15LLseDZxKH/GxwpRAxURMbKVhla+/WPz3oLvk5yXNhE0WD/HF8B+unQ+5l8o9
// kQIDAQAB
// -----END PUBLIC KEY-----`;
  const jsEncrypt = new JsEncrypt();
  jsEncrypt.setPublicKey(publicKey);
  const ecPassword = jsEncrypt.encrypt(password);

  const loginResponse = await(fetch('https://members.myactivesg.com/auth/signin', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Cookies': cookiesArrToValue(authPageCookies),
      'Origin': 'https://members.myactivesg.com',
      'Referer': 'https://members.myactivesg.com/auth?redirect=%2Fprofile',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36',
    },
    body: [
      `email=${encodeURIComponent(email)}`,
      `ecpassword=${encodeURIComponent(ecPassword)}`,
      `_csrf=${encodeURIComponent(loginCsrf)}`,
    ].join('&'),
  }));
  
  const loginCookies = Array.from(loginResponse.headers._headers['set-cookie']);
  const loginSuccessPage = await loginResponse.text();
  console.log('loginCookies', loginCookies);
  console.log('loginSuccessPage', loginSuccessPage.substring(loginSuccessPage.indexOf('WANG BOYANG')));
  return cookiesArrToValue(loginCookies);
};

const getLoginCookiesFromLocal = (arr) => {
  return cookiesArrToValue(arr);
};

const getTargetDate = () => {
  // Should be 2 weeks from now, feel free to edit
  let tsStr = (+(new Date(moment().add(10, 'days').format('YYYY-MM-DD'))) + '').slice(0, -3);
  // return tsStr;
  return '';
};

const addToCart = async (cookies) => {
  const venueResponse = await fetch(
    `https://members.myactivesg.com/facilities/view/activity/18/venue/311?time_from=${getTargetDate()}`,
    {
      credentials: 'include',
      headers: {
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        Cookie: cookies,
      }
    }
  );
  const venuePage = await venueResponse.text();

  const url = venuePage.match(/\<form id\=\"formTimeslots\" action\=\"(https:\/\/members\.myactivesg\.com\/facilities\/processStandardBooking\/.+)\"/)[1];

  const timeslotValues = venuePage.match(/value\=\"(Court 0[;:0-9]+)\"/g);
  const firstHashValue = venuePage.match(/timeslot-container[\s\S]+?input type\=\"hidden\" name\=\"(.+?)\" value\=\"(.+?)\"/);
  
  const secondHashValueFile = await
    (await fetch('https://members.myactivesg.com/assets/cache/activesg2017_view_facilities_mod.js'))
    .text();
  const secondHashValue = secondHashValueFile.match(/\.data\+\=\"\&(.+?)\=(.+?)\"/);

  const formData = [
    ['activity_id', '18'],
    ['venue_id', '311'],
    ['chosen_date', moment().add(10, 'days').format('YYYY-MM-DD')],
    ['cart', 'ADD TO CART'],
    // simplify by fixing to 2 first timeslots. Add more slots if needed
    ['timeslots%5B%5D', timeslotValues[0].substring(8, timeslotValues[0].length-1)],
    ['timeslots%5B%5D', timeslotValues[1].substring(8, timeslotValues[1].length-1)],
    [firstHashValue[1], firstHashValue[2]],
    [secondHashValue[1], secondHashValue[2]],
  ];
  console.log('formData', formData);
  const processedFormData = formData.map(record => `${record[0]}=${encodeURIComponent(record[1])}`).join('&');
  console.log('processedFormData', processedFormData);
  const addToCartResponse = await(fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'Origin': 'https://members.myactivesg.com',
      'Referer': 'https://members.myactivesg.com/facilities/view/activity/18/venue/311?time_from=',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: cookies
    },
    body: processedFormData,
  }));
  return addToCartResponse;
};

const main = async () => {
  if (process.argv.length < 4) {
    console.warn('Usage: node http-driver.js activesg-email activesg-password');
    process.exit(1);
  }
  /**
   * We must do login step using HTTP to get cookies
   */
  const cookies = await getLoginCookiesFromRequest();
  
  // This is dev-only. Avoid sending too many login requests causing captchas
  // const cookies = 'visid_incap_148311=cAsVhyI+SzO8KSP1N9jkgcQHa1wAAAAAQUIPAAAAAABGoyGOYBlurH+n9YfabMOn; nlbi_148311=h5J0dBMePG7HJRWnMXDQTwAAAABh3/p8UAvKDhgZs2b8B66p; incap_ses_165_148311=d2knNpjy1FbSinAXCTRKAsQHa1wAAAAAqQeisAwnFRk+nsDpdtXadw==; ActiveSG=vrvut16dpml91c20k4u2df0p3k3d7pvt';
  
  console.log('processed cookies: ', cookies);
  /**
   * Now let's try to add to cart
   * I'm extracting all needed tokens from the venue page
   * e.g. /facilities/view/activity/18/venue/311
   * 
   * There's NO guarantee that the shape of the page (and location of tokens)
   * will be the same during flashsale period
   */
  const addToCartResponse = await addToCart(cookies);
  console.log('addToCartResponse', await addToCartResponse.text());
}
main();
