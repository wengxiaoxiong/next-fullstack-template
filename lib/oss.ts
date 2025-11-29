import OSS from "ali-oss";
import { env } from "node:process";

let appStore: OSS | null = null;

export const getOSSStore = (): OSS => {
  if (!appStore) {
    if (!env.OSS_KEY_ID || !env.OSS_KEY_SECRET) {
      throw new Error("OSS credentials are required: OSS_KEY_ID and OSS_KEY_SECRET must be set");
    }

    appStore = new OSS({
      region: env.OSS_REGION,
      accessKeyId: env.OSS_KEY_ID,
      accessKeySecret: env.OSS_KEY_SECRET,
      bucket: env.OSS_BUCKET,
      endpoint: env.OSS_ENDPOINT,
      // 增加超时时间配置
      timeout: 300000, // 5分钟超时
    });
  }
  return appStore;
};
