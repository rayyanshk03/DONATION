import dotenv from "dotenv";

dotenv.config();

function required(name: string, value?: string) {
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: required("DATABASE_URL", process.env.DATABASE_URL),
  redisUrl: process.env.REDIS_URL,
  rpcUrl: required("RPC_URL", process.env.RPC_URL),
  rpcWsUrl: process.env.RPC_WS_URL,
  vaultAddress: required("VAULT_ADDRESS", process.env.VAULT_ADDRESS),
  corsOrigin: process.env.CORS_ORIGIN,
};
