import { Prisma } from "@prisma/client";
export function toDecimal(value) {
    return new Prisma.Decimal(String(value));
}
export function toFixedString(value, digits = 2) {
    if (!value)
        return "0.00";
    const num = Number(value.toString());
    return num.toFixed(digits);
}
