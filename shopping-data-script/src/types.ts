export interface File {
  name: string;
  store?: string;
  type?: string;
  date?: string;
  url: string;
}
export interface ChainInfo {
  chainId: number;
  subChainId: number;
  storeId: number;
}

export interface ItemPrice extends Omit<ChainInfo, 'storeId'> {
  chainName: string;
  originalPrice: number;
  actualPrice: number;
  discount?: Omit<Promo, 'codes'>;
  date: Date;
  storeId: number;
  address?: string;
  city?: string;
  zipcode?: number;
}

export interface ParsedXml {
  result: Xml;
  fileName: string;
}

export interface XmlError {
  error: Error;
  fileName: string;
}

export interface Item {
  id: number;
  name: string;
  image: string[];
  prices: ItemPrice[];
}

type booleanNumber = `${0}` | `${1}`;

interface SubchainStoreXml {
  storeid: `${number}`;
  bikoretno: `${number}`;
  stortype: `${number}`;
  storename: string;
  address: string;
  city: string;
  zipcode: `${number}`;
}

export type SubchainStore = { [Key in keyof SubchainStoreXml]: SubchainStoreXml[Key] extends `${number}` ? number : SubchainStoreXml[Key]; };

export interface StoresXml {
  chainid: `${number}`;
  chainname: string;
  lastupdatedate: string;
  lastupdatetime: string;
  subchains: {
    subchain: {
      subchainid: `${number}`;
      subchainanme: string;
      store: SubchainStoreXml[];
    };
  };
}

export interface PromotionItem {
  itemcode: `${number}`;
  isgiftitem: booleanNumber;
  itemtype: `${number}`;
}

export interface PromotionItems {
  $?: {
    count?: `${number}`;
  };
  item: PromotionItem | PromotionItem[];
}

interface Promotion {
  promotionid: `${number}`;
  promotiondescription: string;
  promotionupdatedate: string;
  promotionstartdate: string;
  promotionstarthour: string;
  promotionenddate: string;
  promotionendhour: string;
  rewardtype: `${number}`;
  discounttype: `${number}`;
  discountrate: `${number}`;
  allowmultiplediscounts: booleanNumber;
  minqty: `${number}`;
  maxqty: `${number}`;
  discountedprice: `${number}`;
  discountedpricepermida: `${number}`;
  promotionitems: PromotionItems | PromotionItems[];
  minnoofitemofered: `${number}`;
  additionalrestrictions: {
    additionaliscoupon: booleanNumber;
    additionalgiftcount: booleanNumber;
    clubs: {
      clubid: `${number}`;
    };
    additionalistotal: booleanNumber;
    additionalisactive: booleanNumber;
  };
  remarks: string;
  minpurchaseamnt: `${number}`;
}

export interface PromoXml {
  chainid: `${number}`;
  storeid: `${number}`;
  subchainid: `${number}`;
  bikoretno: `${number}`;
  promotions: {
    $: {
      count: `${number}`;
    };
    promotion: Promotion | Promotion[];
  };
}

export interface PriceXml {
  chainid: `${number}`;
  subchainid: `${number}`;
  storeid: `${number}`;
  bikoretno: `${number}`;
  items: {
    item: Array<{
      priceupdatedate: string;
      itemcode: `${number}`;
      itemtype: `${number}`;
      itemnm: string;
      manufacturername: string;
      manufacturecountry: string;
      manufactureritemdescription: string;
      unitqty: string;
      quantity: `${number}`;
      unitofmeasure: string;
      bisweighted: string;
      qtyinpackage: `${number}`;
      itemprice: `${number}`;
      unitofmeasureprice: `${number}`;
      allowdiscount: booleanNumber;
      itemstatus: `${number}`;
    }>;
  };
}

export type Xml = StoresXml | PromoXml | PriceXml;

export interface Store {
  chainId: ChainInfo['chainId'];
  chainName: string;
  subChains: StoresXml['subchains']['subchain'];
}

export interface Price {
  code: number;
  name: string;
  price: number;
  updateDate: Date;
}

export interface Promo {
  codes: number[];
  description: string;
  discountPrice: number;
  updateDate: Date;
  startDate: Date;
  endDate: Date;
}

export interface PriceList extends ChainInfo {
  prices: Price[];
}

export function isStoresXml (xml: Xml): xml is StoresXml {
  return ['chainname', 'lastupdatedate', 'lastupdatetime', 'subchains'].every(
    (key) => key in xml,
  );
}

export function isPromoXml (xml: Xml): xml is PromoXml {
  return 'promotions' in xml;
}

export function isPriceXml (xml: Xml): xml is PriceXml {
  return 'items' in xml;
}
