ALTER TABLE "public"."client"
ADD CONSTRAINT "account_fk" FOREIGN KEY ("account_id")
REFERENCES "public"."account"("account_id") ON DELETE NO ACTION ON UPDATE NO ACTION NOT DEFERRABLE;

ALTER TABLE "public"."user_role"
ADD CONSTRAINT "user_id_fk" FOREIGN KEY ("user_id")
REFERENCES "public"."user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION NOT DEFERRABLE;

ALTER TABLE "public"."user_role"
ADD CONSTRAINT "user_role_id_fk" FOREIGN KEY ("role_id")
REFERENCES "public"."role"("role_id") ON DELETE NO ACTION ON UPDATE NO ACTION NOT DEFERRABLE;