/*
  https://www.kingstore.co.il/Food_Law/
  https://maayan2000.binaprojects.com/
  https://goodpharm.binaprojects.com/
  https://zolvebegadol.binaprojects.com/
  https://paz.binaprojects.com/
  https://shuk-hayir.binaprojects.com/
  https://shefabirkathashem.binaprojects.com/
*/

import fetch from 'node-fetch';
import { writeFile } from 'fs/promises';
import { combineSignals, waitForPromiseOrTimeout } from './utils.js';

const urls = [
  ' https://www.kingstore.co.il/Food_Law/',
  'https://maayan2000.binaprojects.com/',
  'https://goodpharm.binaprojects.com/',
  'https://zolvebegadol.binaprojects.com/',
  'https://paz.binaprojects.com/',
  'https://shuk-hayir.binaprojects.com/',
  'https://shefabirkathashem.binaprojects.com/',
];
const dataEndpoint = 'MainIO_Hok.aspx?WStore=&WDate={}&WFileType=0';
const downloadEndpoint = 'Download/';
const types = ['PromoFull', 'PriceFull', 'Stores'];

const getDate = (): string => {
  const today = new Date();
  const yyyy = today.getFullYear();
  let mm: number | string = today.getMonth() + 1;
  let dd: number | string = today.getDate();

  if (dd < 10) dd = `0${dd}`;
  if (mm < 10) mm = `0${mm}`;

  return encodeURI(`${dd}/${mm}/${yyyy}`);
};

const downloadFile = async (fileName: string, base: string, signal: AbortSignal): Promise<void> => {
  const response = await fetch(`${base}${downloadEndpoint}${fileName}`, { signal });
  const buffer = Buffer.from(await response.arrayBuffer());

  const outputName = `./files/${fileName}`;
  await writeFile(outputName, buffer);
};

const main = async (globalSignal: AbortSignal): Promise<void> => {
  await Promise.allSettled(
    urls.map(async (base) => {
      const url = base + dataEndpoint.replace('{}', getDate());
      const res = await fetch(url);
      const files: Array<{ FileNm: string }> = (await res.json()) as Array<{
        FileNm: string;
      }>;

      const filtered = files.filter((file: { FileNm: string }) =>
        types.some((type) => file.FileNm.startsWith(type)),
      );

      await Promise.allSettled(
        filtered
          .map((file: { FileNm: string }) => file.FileNm)
          .map((file) =>
            waitForPromiseOrTimeout((signal) =>
              downloadFile(file, base, combineSignals([signal, globalSignal])),
            ),
          ),
      );
    }),
  );
};

export default main;
