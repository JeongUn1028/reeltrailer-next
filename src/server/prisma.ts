import * as PrismaClientPkg from "@prisma/client";
const PrismaClient = PrismaClientPkg.PrismaClient;

const prismaClientSingleton = () => {
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrima = globalThis as unknown as {
  prismaGlobal: PrismaClientSingleton | undefined;
};

const prisma = globalForPrima.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrima.prismaGlobal = prisma;
}
