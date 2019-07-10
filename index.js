const puppeteer = require('puppeteer')
const schedule = require('node-schedule')
const nodemailer = require('nodemailer')

const config = require('./config')

const transporter = nodemailer.createTransport({
  host: 'smtp-pulse.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

let lastErrorSent = null

const sendError = e => {
  if (lastErrorSent && (Date.now() - lastErrorSent) / 1e3 / 60 / 60 < 1) {
    // limit only one error per hour
    return
  }

  lastErrorSent = Date.now()

  transporter.sendMail({
    from: 'system@balthazargronon.com',
    to: 'bgronon@gmail.com',
    subject: '[Ticket Checker] An error occured',
    html: `<pre>${e.stack}</pre>`,
  })
}

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
      transporter.sendMail({
        from: 'system@balthazargronon.com',
        to: email,
        subject: '[Ticket Checker] A ticket has been found',
        html: '<p>You should probably pay it</p>',
      })

      console.log(`[${plate}] FOUND A CITATION ${new Date().toString().replace(/ GMT.*/, '')}`)
    } else {
      console.log(`[${plate}] Checked on ${new Date().toString().replace(/ GMT.*/, '')}`)
    }

    await page.close()
    await browser.close()
  } catch (e) {
    sendError(e)
  }
}

schedule.scheduleJob('0 * * * *', () => {
  config.forEach(main)
})
