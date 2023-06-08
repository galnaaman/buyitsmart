/*
http://prices.shufersal.co.il/
*/
import fetch from 'node-fetch';
import { writeFile } from 'fs/promises';
import { load } from 'cheerio';
import type { File } from '../types.js';
import { combineSignals, waitForPromiseOrTimeout } from './utils.js';

const base = 'http://prices.shufersal.co.il/';
const types = [2, 4, 5];

const getDate = (): string => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = today.getMonth() + 1;
  const dd = today.getDate();

  return encodeURI(`${mm}/${dd}/${yyyy}`);
};

const getPageForType = async (page: number, type: number, signal: AbortSignal): Promise<string> => {
  const url = `${base}FileObject/UpdateCategory?catID=${type}&storeId=0&sort=Time&sortdir=DESC&page=${page}`;
  const res = await fetch(url, { signal });
  return res.text();
};

const getLastPage = (html: string): string => {
  const $ = load(html);
  const url = $('.webgrid-footer td').find('a:last-child').attr('href') ?? '';
  return url.split('=').at(-1) ?? '';
};

const getItemsFromPage = (html: string): File[] => {
  const $ = load(html);
  const items: File[] = [];

  $('.webgrid tbody tr').each(function () {
    const url = $(this).find('td:first-child a').attr('href') ?? '';
    const date = $(this).find('td:nth-child(2)').text();
    const name = $(this).find('td:nth-child(7)').text();
    items.push({ url, date, name });
  });

  return items;
};

const downloadFile = async ({ url, name }: File, signal: AbortSignal): Promise<void> => {
  const res = await fetch(url, { signal });
  const buffer = Buffer.from(await res.arrayBuffer());
  const outputName = `./files/${name}`;
  return writeFile(outputName, buffer);
};

const downloadItemsFromPage = async (html: string): Promise<void> => {
  const items = getItemsFromPage(html);
  const todaysItems = items.filter(
    (item) => item.date?.split(' ').at(0) === getDate(),
  );

  await Promise.allSettled(
    todaysItems.map((item) =>
      waitForPromiseOrTimeout((signal) => downloadFile(item, signal), {}),
    ),
  );
};

const downloadItemsForType = async (type: number, signal: AbortSignal): Promise<void> => {
  const html = await getPageForType(1, type, signal);
  const lastPage = getLastPage(html);

  for (let page = 1; page <= +lastPage; page++) {
    const data = await getPageForType(page, type, signal);
    await downloadItemsFromPage(data);
  }
};

const main = async (globalSignal: AbortSignal): Promise<void> => {
  await Promise.allSettled(
    types.map((type) =>
      waitForPromiseOrTimeout((signal) =>
        downloadItemsForType(type, combineSignals([signal, globalSignal])),
      ),
    ),
  );
};

export default main;
