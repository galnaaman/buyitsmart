export function * processArrayInBatches <T> (
  files: T[],
  batchSize: number,
): Generator<T[]> {
  const totalItems = files.length;
  let lastPercentage = 0;

  for (let index = 0; index < totalItems; index += batchSize) {
    yield files.slice(index, index + batchSize);
    if (index % batchSize === 0) {
      const endIndex = Math.min(index + batchSize, totalItems);
      const percentage = Math.floor((endIndex / totalItems) * 100);
      if (percentage !== lastPercentage) {
        lastPercentage = percentage;
        console.log(percentage.toString() + '% done');
      }
    }
  }
}
