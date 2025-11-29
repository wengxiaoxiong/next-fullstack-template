import { TosClient } from '@volcengine/tos-sdk';
import 'dotenv/config'

export const client = new TosClient({
  accessKeyId: process.env.VOLCENGINE_ACCESS_KEY_ID ?? '',
  accessKeySecret: process.env.VOLCENGINE_ACCESS_KEY_SECRET ?? '',
  region: 'cn-shanghai',
  endpoint: 'tos-cn-shanghai.volces.com',
});

export const bucketName = 'comicgen';

