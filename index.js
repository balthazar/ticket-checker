const puppeteer = require('puppeteer')
const schedule = require('node-schedule')
const sendgrid = require('@sendgrid/mail')

const config = require('./config')

sendgrid.setApiKey(process.env.SMTP_PASS)

const main = async ({ plate, email }) => {
  try {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    await page.goto('https://www.citationprocessingcenter.com/citizen-search-citation.aspx')

    await page.focus('#_ctl0_contentMain_txtPlate')
    await page.keyboard.type(plate)
    await page.click('#_ctl0_contentMain_Submit4')

    await page.waitForNavigation('load')

    const msg = await page.evaluate(
      () => document.getElementById('_ctl0_contentMain_lblMessage').innerText,
    )

    if (msg !== 'No Citations Found') {
      sendgrid.send({
        from: 'system@balthazar.dev',
        to: email,
        subject: `[Ticket Checker] A ticket has been found on ${plate}`,
        html: '<p>You should probably pay it :)</p>',
      })

      console.log(`[${plate}] FOUND A CITATION ${new Date().toString().replace(/ GMT.*/, '')}`)
    } else {
      console.log(`[${plate}] Checked on ${new Date().toString().replace(/ GMT.*/, '')}`)
    }

    await page.close()
    await browser.close()
  } catch (e) {
    console.log(`[ERROR] ${e.message} ${new Date().toString()}`)
  }
}

schedule.scheduleJob('0 * * * *', () => {
  config.forEach(main)
})
