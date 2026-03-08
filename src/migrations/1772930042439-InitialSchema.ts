import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1772930042439 implements MigrationInterface {
    name = 'InitialSchema1772930042439'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_primarychain_enum" AS ENUM('ethereum', 'polygon', 'arbitrum', 'bsc', 'solana')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "address" character varying NOT NULL, "primaryChain" "public"."users_primarychain_enum" NOT NULL, "nonce" character varying, "pushToken" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b0ec0293d53a1385955f9834d5c" UNIQUE ("address"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."swap_orders_chain_enum" AS ENUM('ethereum', 'polygon', 'arbitrum', 'bsc', 'solana')`);
        await queryRunner.query(`CREATE TYPE "public"."swap_orders_status_enum" AS ENUM('open', 'matched', 'confirmed', 'deposited', 'completed', 'cancelled', 'expired')`);
        await queryRunner.query(`CREATE TABLE "swap_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "chain" "public"."swap_orders_chain_enum" NOT NULL, "offerToken" character varying NOT NULL, "offerTokenSymbol" character varying NOT NULL, "offerAmount" numeric(36,18) NOT NULL, "wantToken" character varying NOT NULL, "wantTokenSymbol" character varying NOT NULL, "wantAmount" numeric(36,18) NOT NULL, "status" "public"."swap_orders_status_enum" NOT NULL DEFAULT 'open', "offerAmountUsd" numeric(36,18), "wantAmountUsd" numeric(36,18), "expiresAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7c69a9b6d0039e6c9be20648bf1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f678a8702916916ed7263c2824" ON "swap_orders" ("offerToken", "wantToken", "chain", "status") `);
        await queryRunner.query(`CREATE TYPE "public"."escrow_transactions_chain_enum" AS ENUM('ethereum', 'polygon', 'arbitrum', 'bsc', 'solana')`);
        await queryRunner.query(`CREATE TYPE "public"."escrow_transactions_status_enum" AS ENUM('awaiting_deposit', 'deposit_confirmed', 'processing', 'distributed', 'refunded', 'failed')`);
        await queryRunner.query(`CREATE TYPE "public"."escrow_transactions_direction_enum" AS ENUM('inbound', 'outbound')`);
        await queryRunner.query(`CREATE TABLE "escrow_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "matchId" uuid NOT NULL, "fromAddress" character varying NOT NULL, "toAddress" character varying NOT NULL, "token" character varying NOT NULL, "tokenSymbol" character varying NOT NULL, "amount" numeric(36,18) NOT NULL, "chain" "public"."escrow_transactions_chain_enum" NOT NULL, "status" "public"."escrow_transactions_status_enum" NOT NULL DEFAULT 'awaiting_deposit', "direction" "public"."escrow_transactions_direction_enum" NOT NULL, "txHash" character varying, "blockNumber" integer, "confirmations" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_529d3ac2fa1b343b7beb59bd945" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."swap_matches_chain_enum" AS ENUM('ethereum', 'polygon', 'arbitrum', 'bsc', 'solana')`);
        await queryRunner.query(`CREATE TYPE "public"."swap_matches_status_enum" AS ENUM('open', 'matched', 'confirmed', 'deposited', 'completed', 'cancelled', 'expired')`);
        await queryRunner.query(`CREATE TABLE "swap_matches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderAId" uuid NOT NULL, "orderBId" uuid NOT NULL, "chain" "public"."swap_matches_chain_enum" NOT NULL, "userAConfirmed" boolean NOT NULL DEFAULT false, "userBConfirmed" boolean NOT NULL DEFAULT false, "feeBreakdown" jsonb, "status" "public"."swap_matches_status_enum" NOT NULL DEFAULT 'matched', "expiresAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d26dc7b4425e2a3c4849c52ebbe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "swap_orders" ADD CONSTRAINT "FK_792880cd0ded66e501b59da5159" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "escrow_transactions" ADD CONSTRAINT "FK_870d7f411b604484ed3fa595e80" FOREIGN KEY ("matchId") REFERENCES "swap_matches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "swap_matches" ADD CONSTRAINT "FK_05d2387f8dcfa020358db66efec" FOREIGN KEY ("orderAId") REFERENCES "swap_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "swap_matches" ADD CONSTRAINT "FK_34c76d832ae3d013fe074c19077" FOREIGN KEY ("orderBId") REFERENCES "swap_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "swap_matches" DROP CONSTRAINT "FK_34c76d832ae3d013fe074c19077"`);
        await queryRunner.query(`ALTER TABLE "swap_matches" DROP CONSTRAINT "FK_05d2387f8dcfa020358db66efec"`);
        await queryRunner.query(`ALTER TABLE "escrow_transactions" DROP CONSTRAINT "FK_870d7f411b604484ed3fa595e80"`);
        await queryRunner.query(`ALTER TABLE "swap_orders" DROP CONSTRAINT "FK_792880cd0ded66e501b59da5159"`);
        await queryRunner.query(`DROP TABLE "swap_matches"`);
        await queryRunner.query(`DROP TYPE "public"."swap_matches_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."swap_matches_chain_enum"`);
        await queryRunner.query(`DROP TABLE "escrow_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."escrow_transactions_direction_enum"`);
        await queryRunner.query(`DROP TYPE "public"."escrow_transactions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."escrow_transactions_chain_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f678a8702916916ed7263c2824"`);
        await queryRunner.query(`DROP TABLE "swap_orders"`);
        await queryRunner.query(`DROP TYPE "public"."swap_orders_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."swap_orders_chain_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_primarychain_enum"`);
    }

}
