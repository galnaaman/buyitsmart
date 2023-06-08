const formatDate = (date: Date | string): string =>
  date ? new Date(date).toLocaleDateString('en-GB') : '';

enum Type {
  all,
  store,
  price,
  promo,
  priceFull,
  promoFull,
}

const type1 =
  (url: string) => (date: Date | string, type: Type, place: string) => {
    return `${url}/MainIO_Hok.aspx?_=${new Date().getTime()}&WStore=${
      place ?? ''
    }&WDate=${formatDate(date)}&WFileType=${type ? Type[type] : ''}`;
  };

const type2 =
  (url: string) => (date: Date | string, type: Type, place: string) => {};

export const fileUrls = {
  kingStore: type1('https://www.kingstore.co.il/Food_Law'),
  maayan2000: type1('https://maayan2000.binaprojects.com'),
  goodPharm: type1('https://goodpharm.binaprojects.com'),
  zolVeBegadol: type1('https://zolvebegadol.binaprojects.com'),
  shefaBirkatHashem: type1('https://shefabirkathashem.binaprojects.com'),
  dorAlon: type2('https://url.publishedprices.co.il/file/json/dir'),
};

export const getImageUrls = function (id: string): string[] {
  const sizes = ['large', 'medium', 'small'];
  const imageUrls = [
    `https://img.rami-levy.co.il/product/${id}/SIZE.jpg`,
    `https://d226b0iufwcjmj.cloudfront.net/gs1-products/1131/SIZE/${id}.jpg`,
    `https://d226b0iufwcjmj.cloudfront.net/gs1-products/1062/SIZE/${id}.jpg`,
    `https://d226b0iufwcjmj.cloudfront.net/gs1-products/1219/SIZE/${id}.jpg`,
    `https://superpharmstorage.blob.core.windows.net/hybris/products/desktop/SIZE/${id}.jpg`,
    `https://superpharmstorage.blob.core.windows.net/hybris/products/mobile/SIZE/${id}.jpg`,
    `https://m.pricez.co.il/ProductPictures/${id}.jpg`,
  ];

  let finalImageUrls =
    id.length === 12
      ? imageUrls.concat(imageUrls.map((url) => url.replace(id, `0${id}`)))
      : imageUrls;

  sizes.forEach((size) => {
    finalImageUrls = finalImageUrls.map((url) => url.replace('SIZE', size));
  });

  return finalImageUrls;
};
