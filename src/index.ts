import axios from 'axios';
import * as _ from 'lodash';
import * as nodemailer from 'nodemailer';

import { MAIL_SETTINGS, PAGES, SEND_TO } from '../config';

const SEARCH_WORDS = ['buy a ticket', 'придбати квиток'];

const SEARCH_PAGES = PAGES.map((urls) => ({
  urls,
  lastDateTicketsAvailable: 0,
}));

async function sendEmail(
  transporter: nodemailer.Transporter,
  subject: string,
  text: string,
) {
  try {
    const res = await transporter.sendMail({
      from: 'tickets@klpq.men',
      to: SEND_TO,
      subject,
      text,
    });

    console.log(res);
  } catch (error) {
    console.log('mail_error', error, text);
  }
}

async function areTicketsAvailable({ urls }: { urls: string[] }) {
  let hasTicketsAvailable = false;

  for (const url of urls) {
    console.log('areTicketsAvailable', url);

    try {
      const { data } = await axios.get(url);

      const didFindWords = _.some(SEARCH_WORDS, (word) => {
        const value = (data as string).toLowerCase().includes(word);

        return value;
      });

      if (didFindWords) {
        hasTicketsAvailable = true;
      }
    } catch (error) {
      console.log('http_error', error, url);
    }
  }

  return hasTicketsAvailable;
}

async function checkLoop(transporter: nodemailer.Transporter) {
  console.log('checkLoop');

  for (const SEARCH_PAGE of SEARCH_PAGES) {
    const { urls } = SEARCH_PAGE;

    const hasTicketsAvailable = await areTicketsAvailable({ urls });

    if (hasTicketsAvailable) {
      console.log('tickets_available');

      if (Date.now() - SEARCH_PAGE.lastDateTicketsAvailable > 60 * 60 * 1000) {
        console.log('send_email');

        await sendEmail(
          transporter,
          'Tickets Available',
          `tickets available at - ${urls[0]}`,
        );

        SEARCH_PAGE.lastDateTicketsAvailable = Date.now();
      }
    }
  }

  console.log('checkLoop_end');
}

function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

(async () => {
  const transporter = nodemailer.createTransport(MAIL_SETTINGS);

  await sendEmail(transporter, 'Dummy Email', 'testing if can send messages');

  while (true) {
    if (Math.random() > 0.7) {
      await sendEmail(
        transporter,
        'Dummy Email',
        'testing if can send messages',
      );
    }

    await checkLoop(transporter);

    await sleep(30 * 60);
  }
})();