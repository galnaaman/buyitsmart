import { createReadStream } from 'fs';
import { writeFile } from 'fs/promises';
import zlib from 'zlib';
import { ParseOne } from 'unzipper';
import iconv from 'iconv-lite';
import { Transform, type TransformOptions } from 'stream';
import { detect } from 'jschardet';
import { type ParsedXml, type XmlError } from './types.js';
import parseXmlToJson from './xml.js';

interface CustomEncoder {
  encodingDetected: boolean;
  encoding?: BufferEncoding;
  push: (data: string) => void;
}
class EncodingDetector extends Transform {
  constructor (options?: TransformOptions) {
    super(options);
    this.encodingDetected = false;
  }

  encoding?: BufferEncoding;
  encodingDetected: boolean;

  _transform (
    this: CustomEncoder,
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | undefined) => void,
  ): void {
    if (!this.encodingDetected) {
      const detected = detect(chunk);
      if (detected && detected.confidence > 0.8) {
        this.encoding = detected.encoding as BufferEncoding;
        this.encodingDetected = true;
      } else {
        callback(new Error('Unable to detect file encoding'));
        return;
      }
    }

    if (this.encoding && iconv.encodingExists(this.encoding)) {
      const decodedChunk = iconv.decode(Buffer.from(chunk), this.encoding);
      this.push(decodedChunk);
    } else {
      this.push(chunk.toString());
    }
    callback();
  }
}

const processBatch = async (
  batch: string[],
  failedResults: XmlError[],
): Promise<void> => {
  const tasks = batch.map(
    async (fileName: string): Promise<void | XmlError> => {
      return new Promise((resolve, reject) => {
        const readStreamZlib = createReadStream(fileName); // Create a read stream for zlib
        const encodingDetector = new EncodingDetector();
        const gunzip = zlib.createGunzip();
        let xmlData = '';

        const handleData = (data: string): void => {
          xmlData += data;
        };

        const handleZlibError = (): void => {
          readStreamZlib.destroy();
          const readStreamUnzipper = createReadStream(fileName); // Create a new read stream
          readStreamUnzipper
            .pipe(ParseOne())
            .on('error', (error: unknown) => {
              readStreamUnzipper.destroy();
              handleUnzipperError(error);
            })
            .pipe(encodingDetector)
            .on('data', handleData)
            .on('error', handleUnzipperError)
            .on('end', () => {
              readStreamUnzipper.destroy();
              handleEnd();
            });
        };

        const handleUnzipperError = (error: unknown): void => {
          readStreamZlib.destroy();
          // eslint-disable-next-line prefer-promise-reject-errors
          reject({ error, fileName });
        };

        const handleEnd = (): void => {
          parseXmlToJson(xmlData, fileName)
            .then((result) => {
              let formattedFileName = fileName
                .replace('files/', 'output/')
                .replace(/\.\w+$/, '.json');

              if (!fileName.includes('.')) formattedFileName += '.json';

              writeFile(formattedFileName, JSON.stringify(result))
                .catch((error) => {
                  console.error(fileName, error);
                })
                .then(resolve)
                .catch(reject);
            })
            .catch((error) => {
              // eslint-disable-next-line prefer-promise-reject-errors
              reject({ error, fileName });
            });
        };

        if (fileName.endsWith('.xml')) {
          readStreamZlib
            .pipe(encodingDetector)
            .on('data', handleData)
            .on('error', handleUnzipperError)
            .on('end', handleEnd);
        } else {
          readStreamZlib
            .pipe(gunzip)
            .on('error', handleZlibError)
            .pipe(encodingDetector)
            .on('data', handleData)
            .on('end', handleEnd)
            .on('error', handleZlibError);
        }
      });
    },
  );

  const results = (await Promise.allSettled(tasks)) as Array<
  PromiseSettledResult<ParsedXml>
  >;
  failedResults.push(
    ...(
      results.filter(({ status }) => status === 'rejected') as Array<{
        status: 'rejected';
        reason: XmlError;
      }>
    ).map(({ reason }) => reason),
  );
};

export default processBatch;
