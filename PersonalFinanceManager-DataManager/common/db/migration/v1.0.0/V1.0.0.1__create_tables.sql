------------------------------ account table
CREATE TABLE "public"."account" (
  "account_id" BIGSERIAL NOT NULL ,
  "account_name" VARCHAR(128) NOT NULL ,
  "email" VARCHAR(128) NOT NULL ,
  "enabled" BOOLEAN NOT NULL ,
  "subdomain" VARCHAR(64) NOT NULL ,
  "create_dt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
  "modify_dt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT "account_pkey" PRIMARY KEY("account_id")
) WITH OIDS;

GRANT SELECT, INSERT, UPDATE ON "public"."account" TO "finance";

GRANT SELECT, UPDATE ON "public"."account_account_id_seq" TO "finance";
 
CREATE TRIGGER "account_modify_dt_tr" BEFORE UPDATE
    ON "public"."account" FOR EACH ROW
    EXECUTE PROCEDURE "public"."modify_date_stamp_fn"();
 
------------------------------ Client table 
CREATE  TABLE "public"."client" (
  "client_id" BIGSERIAL NOT NULL ,
  "client_name" VARCHAR(128) NOT NULL ,
  "client_email" VARCHAR(128) NOT NULL ,
  "client_phone" VARCHAR(32) NOT NULL ,
  "account_id" BIGINT NOT NULL,
  "create_dt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
  "modify_dt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
  "start_day" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  "end_day" TIMESTAMP WITHOUT TIME ZONE NULL, 
  CONSTRAINT "client_pkey" PRIMARY KEY("client_id")
) WITH OIDS;

GRANT SELECT, INSERT, UPDATE ON "public"."client" TO "finance";

GRANT SELECT, UPDATE ON "public"."client_client_id_seq" TO "finance";
 
CREATE TRIGGER "client_modify_dt_tr" BEFORE UPDATE
    ON "public"."client" FOR EACH ROW
    EXECUTE PROCEDURE "public"."modify_date_stamp_fn"();

------------------------------ User Table
CREATE TABLE "public"."user" (
  "user_id" BIGSERIAL NOT NULL,
  "username" varchar(128) NOT NULL,
  "password" varchar(128) NOT NULL,
  "email" varchar(255) NOT NULL,
  "create_dt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
  "modify_dt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
  "pw_reset_timer" BIGINT DEFAULT NULL,
  "pw_reset_key" varchar(128) DEFAULT NULL,
  "enabled" boolean NOT NULL DEFAULT 'true',
  "account_non_expired" boolean NOT NULL DEFAULT 'true',
  "credentials_non_expired" boolean NOT NULL DEFAULT 'true',
  "account_non_locked" boolean NOT NULL DEFAULT 'true',
  "account_id" BIGINT NULL,
  "client_id" BIGINT NULL,
  CONSTRAINT "user_pkey" PRIMARY KEY("user_id")
) WITH OIDS;

GRANT SELECT, INSERT, UPDATE ON "public"."user" TO "finance";

GRANT SELECT, UPDATE ON "public"."user_user_id_seq" TO "finance";

CREATE UNIQUE INDEX "user_username_key" ON "public"."user"
    USING btree ("username");
    
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"
    USING btree ("email");
    
CREATE UNIQUE INDEX "pw_reset_key_key" ON "public"."user"
    USING btree ("pw_reset_key");        
 
CREATE TRIGGER "user_modify_dt_tr" BEFORE UPDATE
    ON "public"."user" FOR EACH ROW
    EXECUTE PROCEDURE "public"."modify_date_stamp_fn"();

------------------------------ Role Table
CREATE TABLE "public"."role" (
  "role_id" BIGSERIAL NOT NULL,
  "code" varchar(64) NOT NULL,
  "name" varchar(128) NOT NULL,
  "create_dt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
  "modify_dt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT "role_pkey" PRIMARY KEY("role_id")
) WITH OIDS;

GRANT SELECT, INSERT, UPDATE ON "public"."role" TO "finance";

GRANT SELECT, UPDATE ON "public"."role_role_id_seq" TO "finance";
 
CREATE TRIGGER "role_modify_dt_tr" BEFORE UPDATE
    ON "public"."role" FOR EACH ROW
    EXECUTE PROCEDURE "public"."modify_date_stamp_fn"();

CREATE TABLE "public"."user_role" (
  "user_id" BIGINT NOT NULL,
  "role_id" BIGINT NOT NULL,
  "create_dt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
  "modify_dt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE ON "public"."user_role" TO "finance";
 
CREATE UNIQUE INDEX user_role_idx ON "public"."user_role" ("user_id", "role_id"); 
 
CREATE TRIGGER "user_role_modify_dt_tr" BEFORE UPDATE
    ON "public"."user_role" FOR EACH ROW
    EXECUTE PROCEDURE "public"."modify_date_stamp_fn"();  