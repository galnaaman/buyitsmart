import fs, { type ReadStream } from 'fs';
import json from 'big-json';

import {
  type Store,
  type Item,
  type ItemPrice,
  type Promo,
  type XmlError,
  type PriceList,
} from './types.js';

import { site1, site2, site3, site4, site5, site6 } from './sites/index.js';
import { getImageUrls } from './urls.js';
import processBatch from './unzip.js';
import { processArrayInBatches } from './utils.js';
import { formatResult } from './analyse.js';
import { waitForPromiseOrTimeout } from './sites/utils.js';

process.setMaxListeners(0); // Node complains that we attach too many evnet listeners to AbortSignals, so we increase the max allowed amount

const batchSize = +(process.env.BATCH_SIZE ?? 30); // Adjust this value based on your system's capabilities
const failedResults: XmlError[] = [];

const downloadFiles = async (signal: AbortSignal): Promise<void> => {
  await fs.promises.rm('files', { recursive: true, force: true });
  await fs.promises.mkdir('files');
  await Promise.allSettled([
    site1(signal),
    site2(signal),
    site3(signal),
    site4(signal),
    site5(signal),
    site6(signal),
  ]).catch(console.error);
  console.log('Finished downloading');
};

const parseFiles = async (): Promise<void> => {
  await fs.promises.rm('output', { recursive: true, force: true });
  await fs.promises.rm('xml', { recursive: true, force: true });
  await fs.promises.mkdir('output');
  await fs.promises.mkdir('xml');

  const fileNames = [
    ...(await fs.promises.readdir('files')),
    ...(await fs.promises.readdir('../manual/manual').catch(() => [])),
  ].map((fileName: string) => `files/${fileName}`);

  console.log('Batching files...');
  for (const batch of processArrayInBatches(fileNames, batchSize)) {
    await processBatch(batch, failedResults).catch(console.error);
  }

  console.log('Finished batching files');
  console.error('Failed Results:', failedResults);
};

let stores: Store[] = [];
let priceLists: PriceList[] = [];
let promos: Promo[] = [];

const parseExistingFiles = async (): Promise<void> => {
  const fileNames: string[] = (await fs.promises.readdir('output')).map(
    (fileName: string) => `../output/${fileName}`,
  );

  const formattedResults = formatResult(
    await Promise.all(
      fileNames.map(async (fileName) => ({
        fileName,
        result: (await import(fileName, { assert: { type: 'json' } })).default,
      })),
    ),
  );

  stores = formattedResults.stores;
  priceLists = formattedResults.priceLists;
  promos = formattedResults.promos;
};

(async () => {
  console.time('Work');
  await waitForPromiseOrTimeout(downloadFiles, undefined, 60_000 * 30);
  await parseFiles();
  await parseExistingFiles();

  console.log('stores', stores);
  console.log('promos', promos);
  console.log('prices', priceLists);

  const items: Item[] = [];
  const itemsMap = new Map<number, Item>();
  const promosMap = new Map<number, Omit<Promo, 'codes'>>();
  const fullIdItemsMap = new Map<string, Item>();
  const shortIdItemsMap = new Map<string, Item>();
  const storeMap = new Map<string, Store>();

  promos.forEach((promo) => {
    promo.codes.forEach((code) => {
      promosMap.set(code, {
        description: promo.description,
        discountPrice: promo.discountPrice,
        updateDate: promo.updateDate,
        startDate: promo.startDate,
        endDate: promo.endDate,
      });
    });
  });

  const totalItems = priceLists.length;

  console.log('Analyising items...');
  await Promise.all(
    priceLists.map(async (priceList, index) => {
      if (totalItems % index === 0) {
        const percentage = Math.ceil(((index + 1) / totalItems) * 100);
        console.log(percentage.toString() + '% done');
      }
      // Loop through each `price` in the `prices` array of `priceList`
      await Promise.all(
        priceList.prices.map(async (price) => {
          // Check if there is an existing `Item` with the same `id`
          let existingItem: Item | undefined = itemsMap.get(price.code);

          const fullIdItem: Item | undefined =
            price.code.toString().length >= 10
              ? fullIdItemsMap.get(price.code.toString())
              : undefined;
          const shortIdItem: Item | undefined =
            !fullIdItem && price.code.toString().length < 10
              ? shortIdItemsMap.get(price.code.toString())
              : undefined;

          const formattedDiscount = promosMap.get(price.code) ?? null;
          const storeKey = `${priceList.chainId}${priceList.chainId}${priceList.storeId}`;
          const store: Store | undefined =
            storeMap.get(storeKey) ??
            stores.find(
              ({ chainId, subChains: { subchainid, store } }) =>
                chainId === priceList.chainId &&
                +subchainid === priceList.subChainId &&
                store?.some(({ storeid }) => +storeid === priceList.storeId),
            );

          const subchainStore = store?.subChains.store.find(
            ({ storeid }) => +storeid === priceList.storeId,
          );

          if (store) storeMap.set(storeKey, store);

          const newPrice: ItemPrice = {
            chainId: priceList.chainId,
            subChainId: priceList.subChainId,
            storeId: priceList.storeId,
            address: subchainStore?.address,
            city: subchainStore?.city,
            zipcode: +(subchainStore?.zipcode ?? 0) || undefined,
            chainName:
              stores.find((store) => store.chainId === priceList.chainId)
                ?.chainName ?? '',
            originalPrice: price.price,
            ...(formattedDiscount && { discount: formattedDiscount }),
            actualPrice:
              (formattedDiscount?.endDate ?? 0) > new Date()
                ? (formattedDiscount?.discountPrice as number)
                : price.price, // Set actual price to original price initially
            date: price.updateDate,
          };

          if (
            fullIdItem &&
            price.code.toString() !== fullIdItem.id.toString()
          ) {
            existingItem = fullIdItem;
          } else if (
            shortIdItem &&
            price.code.toString() !== shortIdItem.id.toString()
          ) {
            existingItem = shortIdItem;
            existingItem.id = price.code;
          }

          // If an `Item` with the same `id` does not exist, create a new `Item`
          if (!existingItem) {
            existingItem = {
              id: price.code,
              name: price.name,
              image: getImageUrls(price.code.toString()),
              prices: [newPrice],
            };
            items.push(existingItem);
            itemsMap.set(price.code, existingItem);

            if (price.code.toString().length >= 10) {
              fullIdItemsMap.set(price.code.toString(), existingItem);
            } else {
              shortIdItemsMap.set(price.code.toString(), existingItem);
            }
          } else {
            const existingPrice = existingItem.prices.find(
              (existingPrice) =>
                existingPrice.chainId === priceList.chainId &&
                existingPrice.subChainId === priceList.subChainId &&
                existingPrice.storeId === priceList.storeId,
            );

            if (existingPrice && existingPrice.date < price.updateDate)
              Object.keys(existingPrice).forEach((key) => {
                existingPrice[key] = newPrice[key];
              });
            else if (!existingPrice) existingItem.prices.push(newPrice);
          }
        }),
      );
    }),
  );

  (
    json.createStringifyStream({
      body: items,
    }) as ReadStream
  ).pipe(fs.createWriteStream('output/items.json'));

  console.timeEnd('Work');
})().catch(console.error);

if (process.argv.at(-1) === '--hang') setTimeout(function () {}, 600_000_000);
