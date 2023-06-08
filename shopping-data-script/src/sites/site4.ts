/*
http://prices.super-pharm.co.il
*/

import { writeFile } from 'fs/promises';
import { load } from 'cheerio';
import { type File } from '../types.js';
import fetch from 'node-fetch';
import { combineSignals, waitForPromiseOrTimeout } from './utils.js';

const base = 'http://prices.super-pharm.co.il/';
const types = ['PromoFull', 'PriceFull', 'StoresFull'];

const getDate = (): string => {
  const today = new Date();
  const yyyy = today.getFullYear();
  let mm: string | number = today.getMonth() + 1;
  let dd: string | number = today.getDate();

  if (dd < 10) dd = `0${dd}`;
  if (mm < 10) mm = `0${mm}`;

  //! FIXME: Date
  return encodeURI(`${yyyy}-${mm}-${dd}`);
};

const downloadFile = async (
  { url, name }: File,
  cookie: string,
  signal: AbortSignal,
): Promise<void> => {
  const parsedUrl = await parseDownloadLink(url, cookie, signal);

  const res = await fetch(parsedUrl, { headers: { cookie }, signal });
  const buffer = Buffer.from(await res.arrayBuffer());
  const outputName = `./files/${name}`;
  return writeFile(outputName, buffer);
};

const parseDownloadLink = async (
  url: string,
  cookie: string,
  signal: AbortSignal,
): Promise<string> => {
  const res = await fetch(base + url, { headers: { cookie }, signal });
  const { href } = (await res.json()) as { href: string };
  const formattedHref = href.startsWith('/') ? href.slice(1) : href;
  return `${base}${formattedHref}`;
};

const getDataFromTable = (html: string): File[] => {
  const $ = load(html);
  const files: File[] = [];

  $('.flat-table tbody tr').each(function () {
    const name = $(this).find('td:nth-child(2)').text();
    const url = $(this).find('td:nth-child(6) a').attr('href');
    if (url) files.push({ name, url });
  });

  return files;
};

const getDataForType = async (
  allItems: File[],
  type: string,
  page: number,
): Promise<{ files: File[]; cookie?: string }> => {
  const url = `${base}?type=${type}&date=${getDate()}&page=${page}`;
  const res = await fetch(url);
  const html = await res.text();

  const cookie: string = res.headers.get('Set-Cookie')?.split(';')[0] ?? '';
  const items = getDataFromTable(html);
  if (items.length === 0) return { files: [] };

  allItems.push(...items);
  await getDataForType(allItems, type, page + 1);

  return { files: allItems, cookie };
};

const main = async (globalSignal: AbortSignal): Promise<void> => {
  await Promise.allSettled(
    types.map(async (type) => {
      const { files, cookie } = await getDataForType([], type, 1);
      return Promise.allSettled(
        files.map(
          (file, index): Promise<void> =>
            waitForPromiseOrTimeout(
              (signal) =>
                new Promise((resolve) =>
                  setTimeout(() => {
                    downloadFile(file, cookie ?? '', combineSignals([signal, globalSignal]))
                      .then(resolve)
                      .catch(console.error);
                  }, index * 10),
                ),
              {},
            ),
        ),
      );
    }),
  );
};

export default main;
