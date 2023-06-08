/*
  http://publishprice.ybitan.co.il/
  http://publishprice.mega.co.il/
  http://publishprice.mega-market.co.il/
*/

import fetch from 'node-fetch';
import { writeFile } from 'fs/promises';
import { load } from 'cheerio';
import { combineSignals, waitForPromiseOrTimeout } from './utils.js';

const urls = [
  'http://publishprice.ybitan.co.il/',
  'http://publishprice.mega.co.il/',
  'http://publishprice.mega-market.co.il/',
];
const types = ['PromoFull', 'PriceFull', 'Stores'];

const getDate = (): string => {
  const today = new Date();
  const yyyy = today.getFullYear();
  let mm: number | string = today.getMonth() + 1;
  let dd: number | string = today.getDate();

  if (dd < 10) dd = `0${dd}`;
  if (mm < 10) mm = `0${mm}`;

  return encodeURI(`${yyyy}${mm}${dd}`);
};

const downloadFile = async (fileName: string, base: string, signal: AbortSignal): Promise<void> => {
  const response = await fetch(`${base}${getDate()}/${fileName}`, { signal });
  const buffer = Buffer.from(await response.arrayBuffer());
  const outputName = `./files/${fileName}`;

  return writeFile(outputName, buffer);
};

const main = async (globalSignal: AbortSignal): Promise<void> => {
  await Promise.allSettled(
    urls.map(async (base) => {
      const res = await fetch(base + getDate());
      const html = await res.text();

      const $ = load(html);
      const files: string[] = [];

      $('#files table tbody tr').each(function () {
        const url = $(this).find('td:nth-child(2) a').attr('href') ?? '';
        files.push(url);
      });

      const filtered = files.filter(
        (file) =>
          file &&
          file.length > 2 &&
          types.some((type) => file.startsWith(type)),
      );

      await Promise.allSettled(
        filtered.map((name) =>
          waitForPromiseOrTimeout((signal) =>
            downloadFile(name, base, combineSignals([signal, globalSignal])),
          ),
        ),
      );
    }),
  );
};

export default main;
