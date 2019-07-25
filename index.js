const puppeteer = require('puppeteer')
const schedule = require('node-schedule')
const sendgrid = require('@sendgrid/mail')

const config = require('./config')

sendgrid.setApiKey(process.env.SMTP_PASS)

const main = async ({ plate, email }) => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  try {
    await page.goto('https://www.citationprocessingcenter.com/citizen-search-citation.aspx')

    await page.focus('#_ctl0_contentMain_txtPlate')
    await page.keyboard.type(plate)
    await page.click('#_ctl0_contentMain_Submit4')

    await page.waitForNavigation('load')

    const hasMsg = await page.evaluate(
      () => !!document.getElementById('_ctl0_contentMain_lblMessage'),
    )

    if (hasMsg) {
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
  } catch (e) {
    console.log(`[ERROR] ${e.message} ${new Date().toString()}`)
  }

  await page.close()
  await browser.close()
}

schedule.scheduleJob('0 * * * *', () => {
  config.forEach(main)
})
