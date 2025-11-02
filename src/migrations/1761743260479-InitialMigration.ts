import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1761743260479 implements MigrationInterface {
    name = 'InitialMigration1761743260479'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "payments" ("payment_id" int NOT NULL IDENTITY(1,1), "payment_date" datetime2 NOT NULL CONSTRAINT "DF_685fffacc6464277439d0260ab9" DEFAULT GETDATE(), "amount" decimal(10,2) NOT NULL, "payment_method" varchar(20) NOT NULL CONSTRAINT "DF_3f65f62084af2ebfbe39f8955b1" DEFAULT 'Cash', "status" varchar(20) NOT NULL CONSTRAINT "DF_32b41cdb985a296213e9a928b50" DEFAULT 'pending', "transaction_id" varchar(100), "notes" text, "rental_id" int NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_1237daf748b7653a6ebb9492fe4" DEFAULT GETDATE(), CONSTRAINT "PK_8866a3cfff96b8e17c2b204aae0" PRIMARY KEY ("payment_id"))`);
        await queryRunner.query(`CREATE TABLE "locations" ("location_id" int NOT NULL IDENTITY(1,1), "location_name" varchar(255) NOT NULL, "address" varchar(255) NOT NULL, "contact_number" varchar(20) NOT NULL, "manager_name" varchar(100), "opening_time" time, "closing_time" time, "is_active" bit NOT NULL CONSTRAINT "DF_671d2965573972d9f87b83cc23a" DEFAULT 1, "created_at" datetime2 NOT NULL CONSTRAINT "DF_6078d870207b8386e700dfb0345" DEFAULT GETDATE(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_ff339711522e18cb1540aa30e7f" DEFAULT GETDATE(), CONSTRAINT "PK_582bb9b1865f02814bd7c2c9650" PRIMARY KEY ("location_id"))`);
        await queryRunner.query(`CREATE TABLE "rentals" ("rental_id" int NOT NULL IDENTITY(1,1), "rental_start_date" datetime2 NOT NULL, "rental_end_date" datetime2 NOT NULL, "actual_return_date" datetime2, "total_amount" decimal(10,2) NOT NULL, "late_fee" decimal(10,2) NOT NULL CONSTRAINT "DF_a11554e07cabe45597a1c4367e0" DEFAULT 0, "status" varchar(20) NOT NULL CONSTRAINT "DF_20715131f8422cee556fa9c76b4" DEFAULT 'active', "pickup_location_id" int NOT NULL, "return_location_id" int NOT NULL, "car_id" int NOT NULL, "customer_id" int NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_2faa6a7d305e9a58f075aac2872" DEFAULT GETDATE(), "reservation_id" int, CONSTRAINT "PK_9ceff8cf58c6fab2551a44cf9b2" PRIMARY KEY ("rental_id"))`);
        await queryRunner.query(`CREATE TABLE "insurances" ("insurance_id" int NOT NULL IDENTITY(1,1), "insurance_provider" varchar(255) NOT NULL, "policy_number" varchar(50) NOT NULL, "start_date" datetime2 NOT NULL, "end_date" datetime2 NOT NULL, "premium_amount" decimal(10,2) NOT NULL, "status" varchar(20) NOT NULL CONSTRAINT "DF_94e2ce69369be0f14bcc91f6bb9" DEFAULT 'active', "coverage_details" text, "car_id" int NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_e3cfb5184678d2503e32a74183e" DEFAULT GETDATE(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_953d0cf040b982fd4877b09b2e7" DEFAULT GETDATE(), CONSTRAINT "UQ_a7ec193da60a47661318ffe1180" UNIQUE ("policy_number"), CONSTRAINT "PK_e7cd98e1a72cdb7644910154c0d" PRIMARY KEY ("insurance_id"))`);
        await queryRunner.query(`CREATE TABLE "maintenances" ("maintenance_id" int NOT NULL IDENTITY(1,1), "maintenance_date" datetime2 NOT NULL, "description" varchar(255) NOT NULL, "cost" decimal(10,2) NOT NULL, "type" varchar(20) NOT NULL CONSTRAINT "DF_4814f3b6e03b7fed19490066125" DEFAULT 'routine', "status" varchar(20) NOT NULL CONSTRAINT "DF_7f7afe3639e645c6cffbaca27bf" DEFAULT 'scheduled', "completed_date" datetime2, "notes" text, "car_id" int NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_44df58252c18770edd34d41ae20" DEFAULT GETDATE(), CONSTRAINT "PK_7cbd62b06c04fc54f809d51f98f" PRIMARY KEY ("maintenance_id"))`);
        await queryRunner.query(`CREATE TABLE "cars" ("car_id" int NOT NULL IDENTITY(1,1), "car_model" varchar(100) NOT NULL, "car_manufacturer" varchar(100) NOT NULL, "year" varchar(4) NOT NULL, "color" varchar(50) NOT NULL, "car_type" varchar(20) NOT NULL CONSTRAINT "DF_274e5f2295d207b7a443be81b34" DEFAULT 'Sedan', "fuel_type" varchar(20) NOT NULL CONSTRAINT "DF_f3f83e73fc68ba59ddec53c3587" DEFAULT 'Petrol', "rental_rate" decimal(10,2) NOT NULL, "availability" varchar(20) NOT NULL CONSTRAINT "DF_d36a2d985d21b9f8de475f9e480" DEFAULT 'Available', "current_location_id" int, "mileage" int NOT NULL CONSTRAINT "DF_c7891c742ecc1960dd2ab937eac" DEFAULT 0, "license_plate" varchar(20) NOT NULL, "transmission" varchar(50), "seats" int, "doors" int, "engine_size" decimal(5,1), "features" varchar(100), "description" text, "image_url" varchar(255), "is_active" bit NOT NULL CONSTRAINT "DF_466d3e5ff88c0f7c54117b69973" DEFAULT 1, "created_at" datetime2 NOT NULL CONSTRAINT "DF_2555dc81dfd02577c74b1a7c3a2" DEFAULT GETDATE(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_3e9d6c03fe794f23db361d30424" DEFAULT GETDATE(), CONSTRAINT "UQ_97deb66a03be534e7c02d9add0a" UNIQUE ("license_plate"), CONSTRAINT "PK_04ff4e14175e8eba19974f58ac8" PRIMARY KEY ("car_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cars_type" ON "cars" ("car_type") `);
        await queryRunner.query(`CREATE INDEX "IDX_cars_license_plate" ON "cars" ("license_plate") `);
        await queryRunner.query(`CREATE INDEX "IDX_cars_availability" ON "cars" ("availability") `);
        await queryRunner.query(`CREATE TABLE "reservations" ("reservation_id" int NOT NULL IDENTITY(1,1), "reservation_date" datetime2 NOT NULL CONSTRAINT "DF_d2473ed3b520303ef6aff4f8aa0" DEFAULT GETDATE(), "pickup_date" datetime2 NOT NULL, "return_date" datetime2 NOT NULL, "status" varchar(20) NOT NULL CONSTRAINT "DF_c42f5dcdd13d6e63ee44b4cb239" DEFAULT 'pending', "advance_payment" decimal(10,2), "car_id" int NOT NULL, "customer_id" int NOT NULL, "pickup_location_id" int NOT NULL, "return_location_id" int NOT NULL, "created_at" datetime2 NOT NULL CONSTRAINT "DF_f33547b81a81feeedb501df3ae7" DEFAULT GETDATE(), CONSTRAINT "PK_414a88401d7ab4ce981a69784bb" PRIMARY KEY ("reservation_id"))`);
        await queryRunner.query(`CREATE TABLE "customers" ("customer_id" int NOT NULL IDENTITY(1,1), "first_name" varchar(100) NOT NULL, "last_name" varchar(100) NOT NULL, "phone_number" varchar(15) NOT NULL, "address" varchar(255) NOT NULL, "driver_license" varchar(20), "user_id" int, "created_at" datetime2 NOT NULL CONSTRAINT "DF_a8fcf679692db1c886e7f15d2ba" DEFAULT GETDATE(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_386a5e03676dab6b7bf4bf020bd" DEFAULT GETDATE(), CONSTRAINT "PK_6c444ce6637f2c1d71c3cf136c1" PRIMARY KEY ("customer_id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_11d81cd7be87b6f8865b0cf766" ON "customers" ("user_id") WHERE "user_id" IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "users" ("user_id" int NOT NULL IDENTITY(1,1), "email" varchar(100) NOT NULL, "password" varchar(255) NOT NULL, "role" varchar(50) NOT NULL CONSTRAINT "DF_ace513fa30d485cfd25c11a9e4a" DEFAULT 'customer', "is_active" bit NOT NULL CONSTRAINT "DF_20c7aea6112bef71528210f631d" DEFAULT 1, "created_at" datetime2 NOT NULL CONSTRAINT "DF_c9b5b525a96ddc2c5647d7f7fa5" DEFAULT GETDATE(), "updated_at" datetime2 NOT NULL CONSTRAINT "DF_6d596d799f9cb9dac6f7bf7c23c" DEFAULT GETDATE(), "customer_id" int, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_96aac72f1574b88752e9fb00089" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "REL_c7bc1ffb56c570f42053fa7503" ON "users" ("customer_id") WHERE "customer_id" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_a1ab150354cb67a7de7630412aa" FOREIGN KEY ("rental_id") REFERENCES "rentals"("rental_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rentals" ADD CONSTRAINT "FK_7d9982ba54309873d282c5b571e" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("reservation_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rentals" ADD CONSTRAINT "FK_243d136cb7fd3e65b4630fe6bf9" FOREIGN KEY ("car_id") REFERENCES "cars"("car_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rentals" ADD CONSTRAINT "FK_2e144b6f536b4fbad3c01bee620" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rentals" ADD CONSTRAINT "FK_a81088448a7088724715fcc3b0b" FOREIGN KEY ("pickup_location_id") REFERENCES "locations"("location_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rentals" ADD CONSTRAINT "FK_47320afc29be1c3f017223c7837" FOREIGN KEY ("return_location_id") REFERENCES "locations"("location_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "insurances" ADD CONSTRAINT "FK_fb2317364cb501ef3a6d90e3518" FOREIGN KEY ("car_id") REFERENCES "cars"("car_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "maintenances" ADD CONSTRAINT "FK_83db2f6e93cc33784fd2190a174" FOREIGN KEY ("car_id") REFERENCES "cars"("car_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cars" ADD CONSTRAINT "FK_a29316ad8b95148004b1148fcd0" FOREIGN KEY ("current_location_id") REFERENCES "locations"("location_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_678ef344812304c85332f36cb7d" FOREIGN KEY ("car_id") REFERENCES "cars"("car_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_f63cb79a34cdf2d47ab23f31a8b" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_16acc63140fc51ec76e44305aed" FOREIGN KEY ("pickup_location_id") REFERENCES "locations"("location_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_c4bd14190b37e67383edf3bcb45" FOREIGN KEY ("return_location_id") REFERENCES "locations"("location_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "FK_11d81cd7be87b6f8865b0cf7661" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_c7bc1ffb56c570f42053fa7503b" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_c7bc1ffb56c570f42053fa7503b"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "FK_11d81cd7be87b6f8865b0cf7661"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_c4bd14190b37e67383edf3bcb45"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_16acc63140fc51ec76e44305aed"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_f63cb79a34cdf2d47ab23f31a8b"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_678ef344812304c85332f36cb7d"`);
        await queryRunner.query(`ALTER TABLE "cars" DROP CONSTRAINT "FK_a29316ad8b95148004b1148fcd0"`);
        await queryRunner.query(`ALTER TABLE "maintenances" DROP CONSTRAINT "FK_83db2f6e93cc33784fd2190a174"`);
        await queryRunner.query(`ALTER TABLE "insurances" DROP CONSTRAINT "FK_fb2317364cb501ef3a6d90e3518"`);
        await queryRunner.query(`ALTER TABLE "rentals" DROP CONSTRAINT "FK_47320afc29be1c3f017223c7837"`);
        await queryRunner.query(`ALTER TABLE "rentals" DROP CONSTRAINT "FK_a81088448a7088724715fcc3b0b"`);
        await queryRunner.query(`ALTER TABLE "rentals" DROP CONSTRAINT "FK_2e144b6f536b4fbad3c01bee620"`);
        await queryRunner.query(`ALTER TABLE "rentals" DROP CONSTRAINT "FK_243d136cb7fd3e65b4630fe6bf9"`);
        await queryRunner.query(`ALTER TABLE "rentals" DROP CONSTRAINT "FK_7d9982ba54309873d282c5b571e"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_a1ab150354cb67a7de7630412aa"`);
        await queryRunner.query(`DROP INDEX "REL_c7bc1ffb56c570f42053fa7503" ON "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "REL_11d81cd7be87b6f8865b0cf766" ON "customers"`);
        await queryRunner.query(`DROP TABLE "customers"`);
        await queryRunner.query(`DROP TABLE "reservations"`);
        await queryRunner.query(`DROP INDEX "IDX_cars_availability" ON "cars"`);
        await queryRunner.query(`DROP INDEX "IDX_cars_license_plate" ON "cars"`);
        await queryRunner.query(`DROP INDEX "IDX_cars_type" ON "cars"`);
        await queryRunner.query(`DROP TABLE "cars"`);
        await queryRunner.query(`DROP TABLE "maintenances"`);
        await queryRunner.query(`DROP TABLE "insurances"`);
        await queryRunner.query(`DROP TABLE "rentals"`);
        await queryRunner.query(`DROP TABLE "locations"`);
        await queryRunner.query(`DROP TABLE "payments"`);
    }

}
