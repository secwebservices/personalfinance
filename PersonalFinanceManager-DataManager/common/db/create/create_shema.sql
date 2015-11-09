CREATE DATABASE "personal_finance";

CREATE USER "finance" ENCRYPTED PASSWORD 'Accezz-1s-pr0tected!' NOCREATEDB NOCREATEUSER;

\connect personal_finance

-------------------- Drop all the schemas in reverse order ---------------------
DROP SCHEMA "public" CASCADE;

----------------------------- Create Schema public -----------------------------
CREATE SCHEMA "public" AUTHORIZATION "finance";

GRANT USAGE
    ON SCHEMA "public" TO "finance";

--------------------- Create modify_date_stamp_fn Function ---------------------
CREATE OR REPLACE FUNCTION "public"."modify_date_stamp_fn" () RETURNS SETOF opaque AS
'
BEGIN
    -- if a trigger insert or update operation occurs
    IF TG_OP = ''INSERT'' OR TG_OP = ''UPDATE'' THEN
        -- assigns the current timestamp
        -- into the mod_time column
        NEW.modify_dt := now();

        -- displays the new row on an insert/update
        RETURN NEW;
    END IF;
END;
'
LANGUAGE 'plpgsql' VOLATILE CALLED ON NULL INPUT SECURITY INVOKER;