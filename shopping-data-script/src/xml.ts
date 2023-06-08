import { XMLParser } from 'fast-xml-parser';
import { type Xml } from './types.js';

const escapeQuotes = (data: string): string =>
  data.replace(/(?<=>[^<]*)"/g, '&quot;');

const parseXmlToJson = async (xmlData: string, fileName: string): Promise<Xml> => {
  const formattedXml = escapeQuotes(xmlData);

  const parser = new XMLParser({
    alwaysCreateTextNode: false,
    ignoreAttributes: false,
    ignoreDeclaration: true,
    processEntities: true,
    attributesGroupName: '$',
    attributeNamePrefix: '',
    ignorePiTags: true,
    htmlEntities: true,
    stopNodes: ['*.AdditionalRestrictions'],
    trimValues: true,
    transformAttributeName: (attributeName: string) => attributeName.toLowerCase(),
    transformTagName: (tagName: string) => tagName.toLowerCase(),
  });

  try {
    const parsedResult = parser.parse(formattedXml);
    return 'root' in parsedResult ? parsedResult.root : parsedResult;
  } catch {
    throw new Error(`Parser error at ${fileName}`);
  }
};

export default parseXmlToJson;
