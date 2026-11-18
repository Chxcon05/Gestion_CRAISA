-- Mercadeo pasa a ser el administrador: sus usuarios suben a ADMIN antes de quitar el valor del enum.
UPDATE "users" SET "role" = 'ADMIN' WHERE "role" = 'MERCADEO';

-- Postgres no permite quitar un valor de un enum: se recrea el tipo y se convierte la columna.
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VENDEDOR');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VENDEDOR';
DROP TYPE "Role_old";
