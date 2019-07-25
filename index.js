const puppeteer = require('puppeteer')
const schedule = require('node-schedule')
const sendgrid = require('@sendgrid/mail')
const mjml2html = require('mjml')

const config = require('./config')

sendgrid.setApiKey(process.env.SMTP_PASS)

const getHTML = ({ totalDue }) =>
  mjml2html(`
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-text font-family="Helvetica" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#fcfcfc">

    <mj-section>
      <mj-column background-color="white" padding-bottom="20px">

        <mj-hero mode="fixed-height" height="330px" background-width="600px" background-height="330px" background-url="https://i.pinimg.com/originals/70/a9/cc/70a9cc38b030b0b0d36c8aa824d464d2.jpg" background-color="#2a3448" padding-bottom="30px">
          <mj-text padding="20px" color="#ffffff" align="center" font-size="45px" line-height="45px" padding-top="130px" font-weight="900">
            GOOD DAY!
          </mj-text>
        </mj-hero>

        <mj-text font-size="15px">We found citations linked to your license plate that you might want to pay!</mj-text>

        <mj-divider border-width="1px" border-color="#f5f5f5" />

        <mj-text font-size="20px" padding-bottom="0px">Total Due</mj-text>
        <mj-text font-size="20px" font-weight="bold">${totalDue}</mj-text>

        <mj-button href="https://www.citationprocessingcenter.com/citizen-search-citation.aspx" align="left" background-color="blue">
          PAY NOW
        </mj-button>

      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`).html

const main = async ({ plate, email }) => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  try {
    await page.goto('https://www.citationprocessingcenter.com/citizen-search-citation.aspx')

    await page.focus('#_ctl0_contentMain_txtPlate')
    await page.keyboard.type(plate)
    await page.click('#_ctl0_contentMain_Submit4')

    await page.waitForNavigation('load')

    const totalDue = await page.evaluate(() => {
      const el = document.getElementById('_ctl0_contentMain_lblTotalAmt')
      if (el) {
        return el.innerText
      }

      return null
    })

    if (totalDue) {
      sendgrid.send({
        from: 'system@balthazar.dev',
        to: email,
        subject: `[Ticket Checker] Unpaid citations found on ${plate}`,
        html: getHTML({ totalDue }),
      })

      console.log(
        `[${plate}] Found unpaid citations ${new Date().toString().replace(/ GMT.*/, '')}`,
      )
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
