/*
  Victory, Cohen Drinks, Bareket, Mahsaneyhashok  (downloads everything since it's all under one site)
*/

import { load } from 'cheerio';
import fetch from 'node-fetch';
import { writeFile } from 'fs/promises';
import { type File } from '../types.js';
import { combineSignals, waitForPromiseOrTimeout } from './utils.js';

const baseUrl = 'http://matrixcatalog.co.il/';
const dataPage = 'NBCompetitionRegulations.aspx';
const types = ['PromoFull', 'PriceFull', 'Stores'];

const downloadFile = async (fileName: string, url: string, signal: AbortSignal): Promise<void> => {
  const response = await fetch(baseUrl + url, { signal });
  const buffer = Buffer.from(await response.arrayBuffer());
  const outputName = `./files/${fileName}`;

  return writeFile(outputName, buffer);
};

const main = async (globalSignal: AbortSignal): Promise<void> => {
  const res = await fetch(baseUrl + dataPage);
  const html = await res.text();

  const $ = load(html);
  const files: File[] = [];

  $('#download_content table tr').each(function () {
    const fileName = $(this).find('td:first-child').text().trim();
    const store = $(this).find('td:nth-child(2)').text().trim();
    const type = $(this).find('td:nth-child(4)').text().trim();
    const url = $(this).find('td a').attr('href') ?? '';

    files.push({ name: fileName, store, type, url });
  });

  const filtered = files.filter((f) =>
    types.some((type) => f.name.startsWith(type)),
  );

  await Promise.allSettled(
    filtered.map(async (f) =>
      waitForPromiseOrTimeout((signal) =>
        downloadFile(f.name, f.url, combineSignals([signal, globalSignal])),
      ),
    ),
  );
};

export default main;
