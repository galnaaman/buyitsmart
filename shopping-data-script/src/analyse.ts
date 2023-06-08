import {
  type StoresXml,
  type ParsedXml,
  type PriceList,
  type Store,
  type Price,
  type PriceXml,
  type Promo,
  type PromoXml,
  type PromotionItem,
  isStoresXml,
  isPriceXml,
  isPromoXml,
} from './types.js';

const formatStore = (storesXml: StoresXml): Store => ({
  chainId: +storesXml.chainid,
  chainName: storesXml.chainname,
  subChains: storesXml.subchains.subchain,
});

const formatPromo = (promoXml: PromoXml, fileName: string): Promo[] => {
  try {
    const promotion = [promoXml.promotions.promotion].flat();
    return promotion.flatMap((promotion): Promo | [] => {
      try {
        let codes: number[];
        const promotionItems = promotion.promotionitems;

        if (!promotionItems) return [];

        const getCodesFromItem = (
          promotionItem: PromotionItem | PromotionItem[],
        ): number[] =>
          Array.isArray(promotionItem)
            ? promotionItem.map(({ itemcode }) => +itemcode)
            : [+promotionItem.itemcode];

        if (Array.isArray(promotionItems))
          codes = promotionItems.flatMap(({ item }) =>
            getCodesFromItem(item),
          );
        else codes = getCodesFromItem(promotionItems.item);

        return {
          codes,
          description: promotion.promotiondescription,
          discountPrice: +promotion.discountedprice,
          startDate: new Date(
              `${promotion.promotionstartdate}T${promotion.promotionstarthour}`,
          ),
          endDate: new Date(
              `${promotion.promotionenddate}T${promotion.promotionendhour}`,
          ),
          updateDate: new Date(promotion.promotionupdatedate),
        };
      } catch (error: unknown) {
        console.error(`Error at ${fileName}`, error);
        return [];
      }
    });
  } catch (error: unknown) {
    console.error(`Error at ${fileName}`, error);
    return [];
  }
};

const formatPrice = (priceXml: PriceXml): PriceList => ({
  chainId: +priceXml.chainid,
  subChainId: +priceXml.subchainid,
  storeId: +priceXml.storeid,
  prices: priceXml.items.item.map(
    ({ itemnm, itemprice, itemcode, priceupdatedate }): Price => ({
      price: +itemprice,
      name: itemnm,
      code: +itemcode,
      updateDate: new Date(priceupdatedate),
    }),
  ),
});

export const formatResult = (
  results: ParsedXml[],
): { stores: Store[]; priceLists: PriceList[]; promos: Promo[] } => {
  const stores: Store[] = results
    .filter(({ result }) => isStoresXml(result))
    .map(({ result }) => result)
    .map(formatStore);

  const priceLists: PriceList[] = results
    .filter(({ result }) => isPriceXml(result))
    .map(({ result }) => result)
    .map(formatPrice);

  const promos: Promo[] = results
    .filter(({ result }) => isPromoXml(result))
    .flatMap(({ result, fileName }) =>
      formatPromo(result as PromoXml, fileName),
    );

  return { stores, promos, priceLists };
};
