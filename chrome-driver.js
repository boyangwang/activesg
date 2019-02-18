require('chromedriver');
const webdriver = require('selenium-webdriver');
const chrome = require("selenium-webdriver/chrome");
const {By, Key, until} = require('selenium-webdriver');

const getTargetDate = () => {
  const dateStr = '2019-01-28';
  let tsStr = (+(new Date(dateStr)) + '').slice(0, -3);
  return tsStr;
}

const getTargetHours = () => {
  return ['02:00 PM'];
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const chromeOptions = new chrome.Options();
chromeOptions.addArguments(
  'user-data-dir=/Users/wang.boyang/Projects/abbadon/chrome-profile',
  'enable-automation');

(async () => {
  let driver = await new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();
  try {
    const loginProcedure = async () => {
      await driver.get('https://members.myactivesg.com/auth');
      await driver.wait(until.elementLocated(By.name('email')), 8000);
      const emailInput = await driver.findElement(By.name('email'));
      await emailInput.sendKeys('wangboyang1991@gmail.com');
      const passwordInput = await driver.findElement(By.name('password'));
      await delay(600);
      await passwordInput.sendKeys('8JZnFN8bZZNmLBQ');
      await delay(600);
      const loginInput = await driver.findElement(By.css('#btn-submit-login'));
      await loginInput.click();
      await delay(2400);
    }
    try {
      await loginProcedure();
    } catch(e) { console.log('loginProcedure err', e) }

    const addToCartProcedure = async () => {
      await driver.get(
        `https://members.myactivesg.com/facilities/view/activity/18/venue/311?time_from=${getTargetDate()}`);
      
      getTargetHours().forEach(async (h) => {
        const selector = By.js((h) => {
          const labels = Array.from(document.querySelectorAll('label'));
          return labels.find(l => l.textContent.includes(h));
        }, h)
        await until.elementLocated(selector);
        const label = await driver.findElement(selector);
        await label.click();
        await delay(600);
      });
  
      await until.elementLocated(By.id('paynow'));
      const cart = await driver.findElement(By.id('paynow'));
      await delay(2400);
      await cart.click();
      await delay(2400);
      const alert = await driver.switchTo().alert();
      console.log('XXXTEMP', alert);
      alert.accept();
      await delay(4000);
    };
    try {
      await addToCartProcedure();
    } catch(e) { console.log('addToCartProcedure err', e) }
    
    const checkoutCartProcedure = async () => {
      // await driver.get('https://members.myactivesg.com/cart');
      // await delay(2400);
      const pinInputs = await driver.findElements(By.css('.password-field-box .wallet-password'));
      pinInputs.forEach(async (elem, idx) => {
        await elem.click();
        await delay(600);
        await elem.sendKeys('391205'[idx]);
        await delay(600);
      });

      await until.elementLocated(By.name('pay'));
      const pay = await driver.findElement(By.name('pay'));
      await delay(2400);
      await pay.click();
    }
    await checkoutCartProcedure();

  } finally {
    // await driver.quit();
  }
})();


