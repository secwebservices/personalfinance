INSERT INTO "account" (
    "account_name", 
    "email", 
    "enabled", 
    "subdomain",  
    "create_dt",
    "modify_dt"
) VALUES (
    'personalfinance', 
    'personalfinance@secwebservices.com', 
    true, 
    'personalfinance', 
    '2013-08-25 00:00:00',
    '2013-08-25 00:00:00'
);

INSERT INTO "account" (
    "account_name", 
    "email", 
    "enabled", 
    "subdomain", 
    "create_dt",
    "modify_dt"
) VALUES (
    'demo', 
    'personalfinance-demo@secwebservices.com', 
    true, 
    'demo-personalfinance',
    '2013-08-25 00:00:00',
    '2013-08-25 00:00:00'
);

INSERT INTO "client" (
    "client_name", 
    "client_email", 
    "client_phone", 
    "create_dt", 
    "modify_dt",
    "start_day",
    "account_id"
) VALUES (
    'demo client', 
    'demo-client@secwebservices.com', 
    '111-222-3333', 
    '2013-08-25 00:00:00',
    '2013-08-25 00:00:00',
    '2013-08-25 00:00:00',
    (SELECT account_id FROM account WHERE account_name = 'demo')
);

INSERT INTO "role" (
    "role_id",
    "code",
    "name",
    "create_dt",
    "modify_dt"
) VALUES (
    1,
    'ROLE_USER',
    'User',
    '2013-08-21 00:00:00',
    '2013-08-21 00:00:00'
);

INSERT INTO "role" (
    "role_id",
    "code",
    "name",
    "create_dt",
    "modify_dt"
) VALUES (
    2,
    'ROLE_ADMIN',
    'Admin',
    '2013-08-21 00:00:00',
    '2013-08-21 00:00:00'
);

INSERT INTO "user" (
    "username", 
    "password", 
    "email", 
    "enabled", 
    "account_non_expired", 
    "credentials_non_expired", 
    "account_non_locked",
    "account_id", 
    "client_id",
    "create_dt",
    "modify_dt"
) VALUES (
    'admin', 
    '93acd0a67b0c6ce0ac9b1a32b0d098ec2cfcf94aac41a33a0fca8459b211e10d7231872d60ede1b5', 
    'personalfinance@secwebservices.com', 
    true, 
    true, 
    true, 
    true,
    null,
    null,
    '2013-08-25 00:00:00',
    '2013-08-25 00:00:00'
);

INSERT INTO "user" (
    "username", 
    "password", 
    "email", 
    "enabled", 
    "account_non_expired", 
    "credentials_non_expired", 
    "account_non_locked",
    "account_id",
    "client_id",
    "create_dt",
    "modify_dt"
) VALUES (
    'demo', 
    '93acd0a67b0c6ce0ac9b1a32b0d098ec2cfcf94aac41a33a0fca8459b211e10d7231872d60ede1b5', 
    'demo@secwebservices.com', 
    true, 
    true, 
    true, 
    true,
    null,
    (SELECT client_id FROM client WHERE client_name = 'demo client'), 
    '2013-08-25 00:00:00',
    '2013-08-25 00:00:00'
);

INSERT INTO "user_role" (
    "user_id",
    "role_id"
) VALUES (
    (SELECT user_id FROM "public"."user" WHERE username = 'admin'),
    (SELECT role_id FROM "public"."role" WHERE code = 'ROLE_USER')
);

INSERT INTO "user_role" (
    "user_id",
    "role_id"
) VALUES (
    (SELECT user_id FROM "public"."user" WHERE username = 'demo'),
    (SELECT role_id FROM "public"."role" WHERE code = 'ROLE_USER')
);

INSERT INTO "user_role" (
    "user_id",
    "role_id"
) VALUES (
    (SELECT user_id FROM "public"."user" WHERE username = 'admin'),
    (SELECT role_id FROM "public"."role" WHERE code = 'ROLE_ADMIN')
);