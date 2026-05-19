import { Prisma } from "@prisma/client";

export function toDecimal(value: string | number) {
  return new Prisma.Decimal(String(value));
}

export function toFixedString(value: Prisma.Decimal | null | undefined, digits = 2) {
  if (!value) return "0.00";
  const num = Number(value.toString());
  return num.toFixed(digits);
}
