/*
Dor alon : https://url.publishedprices.co.il/login (doralon , no pass)
TivTaam : https://url.publishedprices.co.il/login (TivTaam, no pass)
HaziHinam : https://url.publishedprices.co.il/login (HaziHinam, no pass)
Yohananof: https://url.publishedprices.co.il/login (Yohananof, no pass)
Osherad : https://url.publishedprices.co.il/login (Osherad, no pass)
SalachD : https://url.retail.publishedprices.co.il/login  (SalachD , 12345)
Stopmarket : https://url.retail.publishedprices.co.il/login (Stop_Market, no pass)
Politzer : https://url.publishedprices.co.il/login (politzer, no pass)
Yellow: https://url.publishedprices.co.il/file (Paz_bo , paz468)
Freshmarket: https://url.retail.publishedprices.co.il/login (freshmarket , no pass)
Keshettaamim: https://url.retail.publishedprices.co.il/login (Keshet , no pass)
Ramilevi: https://url.retail.publishedprices.co.il/login (ramilevi , no pass)
supercofix : https://url.publishedprices.co.il/login (SuperCofixApp , no pass)
*/

import puppeteer from 'puppeteer';
import { writeFile } from 'fs/promises';
import fetch, { type Response } from 'node-fetch';
import './index.js';
import { combineSignals, waitForPromiseOrTimeout } from './utils.js';

const loginInfo: Array<{ name: string; username: string; password?: string }> =
  [
    { name: 'Dor alon', username: 'doralon' },
    { name: 'TivTaam', username: 'TivTaam' },
    { name: 'HaziHinam', username: 'HaziHinam' },
    { name: 'Yohananof', username: 'Yohananof' },
    { name: 'Osherad', username: 'Osherad' },
    { name: 'SalachD', username: 'SalachD', password: '12345' },
    { name: 'Stopmarket', username: 'Stop_Market' },
    { name: 'Politzer', username: 'politzer' },
    { name: 'Yellow', username: 'Paz_bo', password: 'paz468' },
    { name: 'Freshmarket', username: 'freshmarket' },
    { name: 'Keshettaamim', username: 'Keshet' },
    { name: 'Ramilevi', username: 'ramilevi' },
    { name: 'supercofix', username: 'SuperCofixApp' },
  ];

const baseUrl = 'https://url.publishedprices.co.il/';
const types = ['PriceFull', 'PromoFull', 'Stores'];

const getTokens = async (): Promise<
Map<string, { token: string; csrf: string }>
> => {
  let index = 0;
  const map = new Map<string, { token: string; csrf: string }>();
  console.log('Scraping');
  for (const { username, password, name } of loginInfo) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    console.group(name);
    await page.goto(baseUrl + 'login', { waitUntil: 'networkidle0' });
    console.log('Page loaded');
    await page.type('#username', username);
    console.log('Got username');
    await page.type('#password', password ?? '');
    console.log('Got password');
    await page.click('#login-button');
    console.log('Clicked login');

    await page.waitForSelector("head > meta[name='csrftoken']");
    console.log('Navigated');

    const csrf = await page.$eval(
      "head > meta[name='csrftoken']",
      (element) => element.content,
    );
    console.log('Got CSRF token');

    const cookies = await page.cookies();
    console.log('Got cookies');
    map.set(name, { csrf, token: cookies[0].value });
    console.groupEnd();

    await browser.close();
    index++;
    console.log(
      `Scraping: ${((index * 100) / loginInfo.length).toFixed(0)}% done`,
    );
  }
  return map;
};

const getPrices = async (token: string, csrf: string): Promise<Response> => {
  return fetch(`${baseUrl}file/json/dir`, {
    headers: {
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      cookie: `cftpSID=${token}`,
    },
    body: `sEcho=13&iColumns=5&sColumns=%2C%2C%2C%2C&iDisplayStart=0&iDisplayLength=20000&mDataProp_0=fname&sSearch_0=&bRegex_0=false&bSearchable_0=true&bSortable_0=true&mDataProp_1=typeLabel&sSearch_1=&bRegex_1=false&bSearchable_1=true&bSortable_1=false&mDataProp_2=size&sSearch_2=&bRegex_2=false&bSearchable_2=true&bSortable_2=true&mDataProp_3=ftime&sSearch_3=&bRegex_3=false&bSearchable_3=true&bSortable_3=true&mDataProp_4=&sSearch_4=&bRegex_4=false&bSearchable_4=true&bSortable_4=false&sSearch=&bRegex=false&iSortCol_0=3&sSortDir_0=desc&iSortingCols=1&cd=%2F&csrftoken=${csrf}`,
    method: 'POST',
  });
};

const formatFileNameToDate = (name: string): Date =>
  new Date(
    name
      .slice(name.lastIndexOf('-') + 1, name.lastIndexOf('.'))
      .replace(
        /(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})(?<hour>\d{2})(?<minute>\d{2})/,
        '$<year>-$<month>-$<day> $<hour>:$<minute>',
      ),
  );

const isToday = (date: string | number | Date): boolean => {
  const someDate = new Date(date);
  const today = new Date();
  return (
    someDate.getDate() === today.getDate() &&
    someDate.getMonth() === today.getMonth() &&
    someDate.getFullYear() === today.getFullYear()
  );
};

const downloadFile = async (
  fileName: string,
  token: string,
  signal: AbortSignal,
): Promise<void> => {
  const response = await fetch(`${baseUrl}file/d/${fileName}`, {
    headers: {
      cookie: `cftpSID=${token}`,
    },
    method: 'GET',
    signal,
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  const outputName = `./files/${fileName}`;
  await writeFile(outputName, buffer);
};

const main = async (globalSignal: AbortSignal): Promise<void> => {
  const tokens = await getTokens();
  await Promise.allSettled(
    loginInfo.map(async ({ name }) => {
      const { csrf, token } = tokens.get(name) ?? { token: '', csrf: '' };
      const prices = await getPrices(token, csrf);
      const parsedPrices = (await prices.json()) as {
        aaData: Array<{ ftime?: Date; time?: Date; fname: string }>;
      };

      const items = parsedPrices.aaData;

      const dates = new Map<string, Date>();

      const filtered = items
        .filter((item): boolean => {
          return (
            isToday(item.time ?? item.ftime ?? new Date()) &&
            isToday(formatFileNameToDate(item.fname)) &&
            types.some((type) => item.fname.startsWith(type))
          );
        })
        .filter(({ fname, time, ftime }) => {
          const fdate = new Date(time ?? (ftime as Date));
          const name = fname.slice(0, fname.lastIndexOf('-'));
          const date = dates.get(name);

          if (!date || new Date(fdate) > date) {
            dates.set(name, new Date(fdate));
            return true;
          }

          return false;
        });

      const downloadItem = (item: {
        fname: string;
      }): Promise<{ name: string }> => {
        const result = { name: item.fname };
        return waitForPromiseOrTimeout(
          (signal) =>
            downloadFile(
              item.fname,
              token,
              combineSignals([signal, globalSignal]),
            )
              .then(() => result)
              // eslint-disable-next-line prefer-promise-reject-errors
              .catch(() => Promise.reject(result)),
          result,
        );
      };

      const failedFiles = (
        await Promise.allSettled(filtered.map(downloadItem))
      ).filter((result) => result.status === 'rejected') as Array<{
        status: 'rejected';
        reason: { name: string; timeout?: boolean };
      }>;

      const failedCount = failedFiles.filter(
        ({ reason: { timeout } }) => !timeout,
      ).length;
      console.log(name, 'Failed:', failedCount);
      console.log(name, 'Timeout', failedFiles.length - failedCount);

      const failedRetriedFiles = (
        await Promise.allSettled(
          failedFiles.map(({ reason: { name } }) =>
            downloadItem({ fname: name }),
          ),
        )
      ).filter(({ status }) => status === 'rejected');

      console.log(name, 'Failed Retried Files:', failedRetriedFiles.length);
    }),
  );
};

export default main;
