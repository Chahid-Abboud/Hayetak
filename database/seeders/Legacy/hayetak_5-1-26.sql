

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




CREATE TYPE "public"."meal_type_enum" AS ENUM (
   'drink',
	'snack',
	'dinner',
	'lunch',
	'breakfast'
);


DROP TABLE IF EXISTS "public"."cache";

CREATE TABLE "public"."cache"(
   "key" character varying(255) NOT NULL,
   "value" text NOT NULL,
   "expiration" integer NOT NULL,
   CONSTRAINT "cache_pkey" PRIMARY KEY ("key")
);







DROP TABLE IF EXISTS "public"."cache_locks";

CREATE TABLE "public"."cache_locks"(
   "key" character varying(255) NOT NULL,
   "owner" character varying(255) NOT NULL,
   "expiration" integer NOT NULL,
   CONSTRAINT "cache_locks_pkey" PRIMARY KEY ("key")
);







-- Dump of table diet_items
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."diet_items";

CREATE SEQUENCE "public"."diet_items_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."diet_items"(
   "id" bigint DEFAULT nextval('public.diet_items_id_seq1'::regclass) NOT NULL,
   "diet_id" bigint NOT NULL,
   "category" character varying(80),
   "label" character varying(255),
   "default_portion" numeric,
   "calories" integer,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "diet_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_diet_items_diet" ON "public"."diet_items" ("diet_id");






-- Dump of table diets
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."diets";

CREATE SEQUENCE "public"."diets_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."diets"(
   "id" bigint DEFAULT nextval('public.diets_id_seq1'::regclass) NOT NULL,
   "user_id" bigint NOT NULL,
   "name" character varying(120) NOT NULL,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "diets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idx_diet_user_name" ON "public"."diets" ("user_id", "name");






-- Dump of table exercises
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."exercises";

CREATE SEQUENCE "public"."exercises_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."exercises"(
   "id" bigint DEFAULT nextval('public.exercises_id_seq1'::regclass) NOT NULL,
   "name" character varying(255) NOT NULL,
   "primary_muscle" character varying(120),
   "equipment" character varying(120),
   "difficulty" character varying(40),
   "demo_video" text,
   "tags" jsonb,
   "conditions" jsonb,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   "demo_url" text DEFAULT ''::text NOT NULL,
   "intensity_level" text,
   "description" text,
   "condition" text,
   CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exercises_name_equipment_unique" ON "public"."exercises" ("name", "equipment");
CREATE INDEX "idx_ex_name_trgm" ON "public"."exercises" ("name");
CREATE INDEX "idx_ex_tags_json" ON "public"."exercises" ("tags");


INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (341, 'Back Squat', 'legs', 'Barbell', NULL, NULL, NULL, '["anemia"]', '2025-10-14 09:01:55.000000', '2025-10-14 09:01:55.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (342, 'Incline Dumbbell Press', 'chest', 'Dumbbells', NULL, NULL, NULL, '["asthma"]', '2025-10-14 14:10:11.000000', '2025-10-14 14:10:11.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (343, 'Lat Pulldown', 'back', 'Machine', NULL, NULL, NULL, '["heart"]', '2025-10-14 14:10:11.000000', '2025-10-14 14:10:11.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (344, 'Barbell Bench Press', 'chest', 'barbell', 'intermediate', NULL, '[]', '[]', '2025-11-12 16:54:24.227000', '2025-11-12 16:54:24.227000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (345, 'Conventional Deadlift', 'back', 'barbell', 'advanced', NULL, '[]', '[]', '2025-11-12 16:54:24.227000', '2025-11-12 16:54:24.227000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (346, 'EZ-Bar Curl', 'biceps', 'barbell', 'beginner', NULL, '[]', '[]', '2025-11-12 16:54:24.227000', '2025-11-12 16:54:24.227000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (347, 'Leg Curl', 'hamstrings', 'machine', 'beginner', NULL, '[]', '[]', '2025-11-12 16:54:24.227000', '2025-11-12 16:54:24.227000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (348, 'Standing Calf Raise', 'calves', 'machine', 'beginner', NULL, '[]', '[]', '2025-11-12 16:54:24.227000', '2025-11-12 16:54:24.227000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (349, 'Triceps Pushdown', 'triceps', 'cable', 'beginner', NULL, '[]', '[]', '2025-11-12 16:54:24.227000', '2025-11-12 16:54:24.227000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (39, 'Romanian Deadlift', 'legs', 'Cable', NULL, 'https://www.youtube.com/watch?v=DJpHADyP-Ko', '["asthma","cable"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (40, 'Arnold Press', 'shoulders', 'Barbell', NULL, 'https://www.youtube.com/watch?v=vj2w851ZHRM', '["asthma","barbell","anemia"]', '["asthma","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (41, 'Skull Crusher', 'biceps', 'Bands', NULL, 'https://www.youtube.com/watch?v=d_KZxkY_0cM', '["asthma","bands","heart","anemia"]', '["asthma","heart","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (42, 'Plank', 'core', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=pSHjTRCQxIw', '["asthma","bodyweight","heart","high_blood_pressure"]', '["asthma","heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (43, 'Barbell Hip Thrust', 'glutes', 'Machine', NULL, 'https://www.youtube.com/watch?v=LM8XHLYJoYs', '["asthma","machine","heart","high_blood_pressure"]', '["asthma","heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (44, 'Barbell Shrug', 'back', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=7-7Ln9N1M0k', '["asthma","dumbbells","heart","high_blood_pressure"]', '["asthma","heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (37, 'Cable Crossover', 'chest', 'Machine', NULL, 'https://www.youtube.com/watch?v=taI4XduLpTk', '["asthma","machine","heart","no_legs"]', '["asthma","heart","no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (38, 'Pull-Up', 'back', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=eGo4IYlbE5g', '["asthma","dumbbells","high_blood_pressure"]', '["asthma","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (45, 'Incline Dumbbell Press', 'chest', 'Cable', NULL, 'https://www.youtube.com/watch?v=8iPEnn-ltC8', '["asthma","cable","heart","anemia"]', '["asthma","heart","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (46, 'Barbell Row', 'back', 'Barbell', NULL, 'https://www.youtube.com/watch?v=vT2GjY_Umpw', '["asthma","barbell","heart","high_blood_pressure","anemia"]', '["asthma","heart","high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (47, 'Squat', 'legs', 'Bands', NULL, 'https://www.youtube.com/watch?v=YaXPRqUwItQ', '["asthma","bands","heart","anemia"]', '["asthma","heart","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (48, 'Arnold Press', 'shoulders', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=vj2w851ZHRM', '["asthma","bodyweight","high_blood_pressure"]', '["asthma","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (49, 'Preacher Curl', 'biceps', 'Machine', NULL, 'https://www.youtube.com/watch?v=fIWP-FRFNU0', '["asthma","machine","high_blood_pressure","anemia"]', '["asthma","high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (50, 'Hanging Leg Raise', 'core', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=HDgq3x0B0GQ', '["asthma","dumbbells","heart"]', '["asthma","heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (51, 'Glute Bridge', 'glutes', 'Cable', NULL, 'https://www.youtube.com/watch?v=8bbE64NuDTU', '["asthma","cable","heart"]', '["asthma","heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (52, 'Dumbbell Shrug', 'back', 'Barbell', NULL, 'https://www.youtube.com/watch?v=1v7S_7DnkPk', '["asthma","barbell","heart"]', '["asthma","heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (53, 'Chest Fly', 'chest', 'Bands', NULL, 'https://www.youtube.com/watch?v=eozdVDA78K0', '["asthma","bands","heart"]', '["asthma","heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (54, 'Single-Arm Dumbbell Row', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=pYcpY20QaE8', '["asthma","bodyweight","high_blood_pressure"]', '["asthma","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (55, 'Squat', 'legs', 'Machine', NULL, 'https://www.youtube.com/watch?v=YaXPRqUwItQ', '["asthma","machine"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (56, 'Overhead Press', 'shoulders', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=qEwKCR5JCog', '["asthma","dumbbells","heart"]', '["asthma","heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (57, 'Hammer Curl', 'biceps', 'Cable', NULL, 'https://www.youtube.com/watch?v=zC3nLlEvin4', '["asthma","cable","heart","anemia"]', '["asthma","heart","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (58, 'Cable Crunch', 'core', 'Barbell', NULL, 'https://www.youtube.com/watch?v=G4XH7a0fH0M', '["asthma","barbell","heart"]', '["asthma","heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (59, 'Cable Pull-Through', 'glutes', 'Bands', NULL, 'https://www.youtube.com/watch?v=F4Kc5gHhA6Y', '["asthma","bands","heart"]', '["asthma","heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (60, 'Face Pull (Traps)', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=rep-qVOkqgk', '["asthma","bodyweight","heart","no_legs"]', '["asthma","heart","no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (61, 'Bench Press', 'chest', 'Machine', NULL, 'https://www.youtube.com/watch?v=rT7DgCr-3pg', '["asthma","machine","heart","high_blood_pressure"]', '["asthma","heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (62, 'Deadlift', 'back', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=op9kVnSso6Q', '["asthma","dumbbells","no_legs","high_blood_pressure","anemia"]', '["asthma","no_legs","high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (63, 'Leg Extension', 'legs', 'Cable', NULL, 'https://www.youtube.com/watch?v=yRxs4lFxiJw', '["asthma","cable","high_blood_pressure","anemia"]', '["asthma","high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (64, 'Bicep Curl', 'biceps', 'Bands', NULL, 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo', '["asthma","bands"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (65, 'Russian Twist', 'core', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=wkD8rjkodUI', '["asthma","bodyweight","heart"]', '["asthma","heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (66, 'Step-Up', 'glutes', 'Machine', NULL, 'https://www.youtube.com/watch?v=dQqApCGd5Ss', '["asthma","machine","heart"]', '["asthma","heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (67, 'Behind-the-Back Shrug', 'back', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=H7XQLba9BH4', '["asthma","dumbbells","heart"]', '["asthma","heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (68, 'Push-Up', 'chest', 'Cable', NULL, 'https://www.youtube.com/watch?v=_l3ySVKYVJ8', '["asthma","cable","high_blood_pressure"]', '["asthma","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (69, 'Romanian Deadlift', 'legs', 'Bands', NULL, 'https://www.youtube.com/watch?v=DJpHADyP-Ko', '["asthma","bands","anemia"]', '["asthma","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (70, 'Front Raise', 'shoulders', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=-t7fuZ0KhDA', '["asthma","bodyweight","anemia"]', '["asthma","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (71, 'Hammer Curl', 'biceps', 'Machine', NULL, 'https://www.youtube.com/watch?v=zC3nLlEvin4', '["asthma","machine","anemia"]', '["asthma","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (72, 'Bicycle Crunch', 'core', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=9FGilxCbdz8', '["asthma","dumbbells"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (73, 'Reverse Lunge', 'glutes', 'Cable', NULL, 'https://www.youtube.com/watch?v=QOVaHwm-Q6U', '["asthma","cable"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (74, 'Farmer\'s Walk', 'back', 'Barbell', NULL, 'https://www.youtube.com/watch?v=QJ7pMoDZX8o', '["asthma","barbell"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (75, 'Cable Crossover', 'chest', 'Bands', NULL, 'https://www.youtube.com/watch?v=taI4XduLpTk', '["asthma","bands"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (76, 'T-Bar Row', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=8b8aKhN5C3c', '["asthma","bodyweight"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (78, 'Upright Row', 'shoulders', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=Z5R41AK0C0g', '["asthma","dumbbells"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (79, 'Skull Crusher', 'biceps', 'Cable', NULL, 'https://www.youtube.com/watch?v=d_KZxkY_0cM', '["asthma","cable"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (80, 'Ab Wheel Rollout', 'core', 'Barbell', NULL, 'https://www.youtube.com/watch?v=v66p-vBrRLQ', '["asthma","barbell"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (81, 'Frog Pump', 'glutes', 'Bands', NULL, 'https://www.youtube.com/watch?v=hqCFRwj67N8', '["asthma","bands"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (82, 'Rack Pull', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=8iPEnn-ltC8&t=1s', '["asthma","bodyweight","no_legs"]', '["asthma","no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (83, 'Decline Barbell Press', 'chest', 'Machine', NULL, 'https://www.youtube.com/watch?v=QYJ3y7n1d6Q', '["asthma","machine","no_legs","high_blood_pressure"]', '["asthma","no_legs","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (84, 'Lat Pulldown', 'back', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=CAwf7n6Luuc', '["asthma","dumbbells","no_legs","high_blood_pressure"]', '["asthma","no_legs","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (85, 'Lunges', 'legs', 'Cable', NULL, 'https://www.youtube.com/watch?v=QOVaHwm-Q6U', '["asthma","cable","heart","high_blood_pressure"]', '["asthma","heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (86, 'Upright Row', 'shoulders', 'Barbell', NULL, 'https://www.youtube.com/watch?v=Z5R41AK0C0g', '["asthma","barbell"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (87, 'Preacher Curl', 'biceps', 'Bands', NULL, 'https://www.youtube.com/watch?v=fIWP-FRFNU0', '["asthma","bands","heart","anemia"]', '["asthma","heart","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (88, 'Dead Bug', 'core', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=4botcJcQKNA', '["asthma","bodyweight"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (89, 'Sumo Deadlift', 'glutes', 'Machine', NULL, 'https://www.youtube.com/watch?v=5zAkYWoR_4c', '["asthma","machine"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (90, 'High Pull', 'back', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=ycn2C66wT54', '["asthma","dumbbells"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (91, 'Bench Press', 'chest', 'Cable', NULL, 'https://www.youtube.com/watch?v=rT7DgCr-3pg', '["asthma","cable"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (92, 'Deadlift', 'back', 'Barbell', NULL, 'https://www.youtube.com/watch?v=op9kVnSso6Q', '["asthma","barbell"]', '["asthma"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (93, 'Single-Arm Dumbbell Row', 'back', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=pYcpY20QaE8', '["heart","dumbbells","no_legs","anemia"]', '["heart","no_legs","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (94, 'Overhead Press', 'shoulders', 'Barbell', NULL, 'https://www.youtube.com/watch?v=qEwKCR5JCog', '["heart","barbell"]', '["heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (95, 'Side Plank', 'core', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=K2VljzCC16g', '["heart","bodyweight","high_blood_pressure","anemia"]', '["heart","high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (96, '45-Degree Back Extension', 'glutes', 'Machine', NULL, 'https://www.youtube.com/watch?v=ph3pddpKzzw', '["heart","machine","high_blood_pressure","anemia"]', '["heart","high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (97, 'Cable Upright Row', 'back', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=QXZvUnPsQ9E', '["heart","dumbbells","high_blood_pressure","anemia"]', '["heart","high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (98, 'Decline Barbell Press', 'chest', 'Cable', NULL, 'https://www.youtube.com/watch?v=QYJ3y7n1d6Q', '["heart","cable","high_blood_pressure","anemia"]', '["heart","high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (99, 'Upright Row', 'shoulders', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=Z5R41AK0C0g', '["heart","bodyweight","high_blood_pressure"]', '["heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (100, 'Skull Crusher', 'biceps', 'Machine', NULL, 'https://www.youtube.com/watch?v=d_KZxkY_0cM', '["heart","machine","high_blood_pressure"]', '["heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (101, 'V-Up', 'core', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=iP2fjvG0g3w', '["heart","dumbbells","high_blood_pressure"]', '["heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (102, 'Kettlebell Swing', 'glutes', 'Cable', NULL, 'https://www.youtube.com/watch?v=YSxHifyI1S4', '["heart","cable","high_blood_pressure"]', '["heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (103, 'Trap Bar Shrug', 'back', 'Barbell', NULL, 'https://www.youtube.com/watch?v=YkPYSf8Lu3U', '["heart","barbell","high_blood_pressure"]', '["heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (104, 'Barbell Row', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=vT2GjY_Umpw', '["heart","bodyweight","high_blood_pressure"]', '["heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (105, 'Leg Press', 'legs', 'Machine', NULL, 'https://www.youtube.com/watch?v=IZxyjW7MPJQ', '["heart","machine","high_blood_pressure","anemia"]', '["heart","high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (106, 'Lateral Raise', 'shoulders', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=kDqklk1ZESo', '["heart","dumbbells"]', '["heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (107, 'Mountain Climber', 'core', 'Barbell', NULL, 'https://www.youtube.com/watch?v=nmwgirgXLYM', '["heart","barbell","high_blood_pressure"]', '["heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (108, 'Single-Leg RDL', 'glutes', 'Bands', NULL, 'https://www.youtube.com/watch?v=E5FYUBo_5co', '["heart","bands","high_blood_pressure"]', '["heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (109, 'Snatch Grip Deadlift', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=6t9-6X1-9mY', '["heart","bodyweight","no_legs","high_blood_pressure"]', '["heart","no_legs","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (110, 'Chest Fly', 'chest', 'Machine', NULL, 'https://www.youtube.com/watch?v=eozdVDA78K0', '["heart","machine"]', '["heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (111, 'Calf Raise', 'legs', 'Cable', NULL, 'https://www.youtube.com/watch?v=YMmgqO8Jo-k', '["heart","cable","anemia"]', '["heart","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (112, 'Cable Crossover', 'chest', 'Cable', NULL, 'https://www.youtube.com/watch?v=taI4XduLpTk', '["heart","cable","anemia"]', '["heart","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (113, 'Pull-Up', 'back', 'Barbell', NULL, 'https://www.youtube.com/watch?v=eGo4IYlbE5g', '["heart","barbell","anemia"]', '["heart","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (114, 'Lateral Raise', 'shoulders', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=kDqklk1ZESo', '["heart","bodyweight","high_blood_pressure"]', '["heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (115, 'Overhead Tricep Extension', 'biceps', 'Machine', NULL, 'https://www.youtube.com/watch?v=nRiJVZDpdL0', '["heart","machine"]', '["heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (116, 'Incline Dumbbell Press', 'chest', 'Bands', NULL, 'https://www.youtube.com/watch?v=8iPEnn-ltC8', '["heart","bands","high_blood_pressure","anemia"]', '["heart","high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (77, 'Leg Extension', 'legs', 'Machine', NULL, 'https://www.youtube.com/watch?v=yRxs4lFxiJw', '["asthma","machine","anemia"]', '["asthma","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (117, 'Lat Pulldown', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=CAwf7n6Luuc', '["heart","bodyweight","anemia"]', '["heart","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (118, 'Lunges', 'legs', 'Machine', NULL, 'https://www.youtube.com/watch?v=QOVaHwm-Q6U', '["heart","machine"]', '["heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (119, 'Preacher Curl', 'biceps', 'Cable', NULL, 'https://www.youtube.com/watch?v=fIWP-FRFNU0', '["heart","cable"]', '["heart"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (120, 'Lateral Raise', 'shoulders', 'Barbell', NULL, 'https://www.youtube.com/watch?v=kDqklk1ZESo', '["heart","barbell","high_blood_pressure"]', '["heart","high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (121, 'T-Bar Row', 'back', 'Barbell', NULL, 'https://www.youtube.com/watch?v=8b8aKhN5C3c', '["heart","barbell","high_blood_pressure","anemia"]', '["heart","high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (122, 'Face Pull', 'shoulders', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=rep-qVOkqgk', '["heart","bodyweight","anemia"]', '["heart","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (123, 'Front Raise', 'shoulders', 'Cable', NULL, 'https://www.youtube.com/watch?v=-t7fuZ0KhDA', '["no_legs","cable"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (124, 'Skull Crusher', 'biceps', 'Barbell', NULL, 'https://www.youtube.com/watch?v=d_KZxkY_0cM', '["no_legs","barbell"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (125, 'Bicycle Crunch', 'core', 'Bands', NULL, 'https://www.youtube.com/watch?v=9FGilxCbdz8', '["no_legs","bands"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (126, 'Farmer\'s Walk', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=QJ7pMoDZX8o', '["no_legs","bodyweight"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (127, 'Hammer Curl', 'biceps', 'Barbell', NULL, 'https://www.youtube.com/watch?v=zC3nLlEvin4', '["no_legs","barbell"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (128, 'Ab Wheel Rollout', 'core', 'Bands', NULL, 'https://www.youtube.com/watch?v=v66p-vBrRLQ', '["no_legs","bands"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (129, 'T-Bar Row', 'back', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=8b8aKhN5C3c', '["no_legs","dumbbells","anemia"]', '["no_legs","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (130, 'Overhead Press', 'shoulders', 'Cable', NULL, 'https://www.youtube.com/watch?v=qEwKCR5JCog', '["no_legs","cable"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (131, 'Tricep Pushdown', 'biceps', 'Barbell', NULL, 'https://www.youtube.com/watch?v=2-LAMcpzODU', '["no_legs","barbell"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (132, 'Dead Bug', 'core', 'Bands', NULL, 'https://www.youtube.com/watch?v=4botcJcQKNA', '["no_legs","bands"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (133, 'High Pull', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=ycn2C66wT54', '["no_legs","bodyweight","high_blood_pressure","anemia"]', '["no_legs","high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (134, 'Arnold Press', 'shoulders', 'Cable', NULL, 'https://www.youtube.com/watch?v=vj2w851ZHRM', '["no_legs","cable"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (135, 'Overhead Tricep Extension', 'biceps', 'Barbell', NULL, 'https://www.youtube.com/watch?v=nRiJVZDpdL0', '["no_legs","barbell"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (136, 'Side Plank', 'core', 'Bands', NULL, 'https://www.youtube.com/watch?v=K2VljzCC16g', '["no_legs","bands"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (137, 'Cable Upright Row', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=QXZvUnPsQ9E', '["no_legs","bodyweight"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (138, 'Incline Dumbbell Press', 'chest', 'Machine', NULL, 'https://www.youtube.com/watch?v=8iPEnn-ltC8', '["no_legs","machine","anemia"]', '["no_legs","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (139, 'Barbell Row', 'back', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=vT2GjY_Umpw', '["no_legs","dumbbells"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (140, 'Lateral Raise', 'shoulders', 'Cable', NULL, 'https://www.youtube.com/watch?v=kDqklk1ZESo', '["no_legs","cable"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (141, 'Bicep Curl', 'biceps', 'Barbell', NULL, 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo', '["no_legs","barbell"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (142, 'V-Up', 'core', 'Bands', NULL, 'https://www.youtube.com/watch?v=iP2fjvG0g3w', '["no_legs","bands"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (143, 'Trap Bar Shrug', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=YkPYSf8Lu3U', '["no_legs","bodyweight"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (144, 'Push-Up', 'chest', 'Machine', NULL, 'https://www.youtube.com/watch?v=_l3ySVKYVJ8', '["no_legs","machine","high_blood_pressure","anemia"]', '["no_legs","high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (145, 'Preacher Curl', 'biceps', 'Barbell', NULL, 'https://www.youtube.com/watch?v=fIWP-FRFNU0', '["no_legs","barbell"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (146, 'Mountain Climber', 'core', 'Bands', NULL, 'https://www.youtube.com/watch?v=nmwgirgXLYM', '["no_legs","bands"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (147, 'Plank', 'core', 'Bands', NULL, 'https://www.youtube.com/watch?v=pSHjTRCQxIw', '["no_legs","bands"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (148, 'Barbell Shrug', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=7-7Ln9N1M0k', '["no_legs","bodyweight"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (149, 'Hanging Leg Raise', 'core', 'Bands', NULL, 'https://www.youtube.com/watch?v=HDgq3x0B0GQ', '["no_legs","bands"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (150, 'Dumbbell Shrug', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=1v7S_7DnkPk', '["no_legs","bodyweight"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (151, 'Cable Crunch', 'core', 'Bands', NULL, 'https://www.youtube.com/watch?v=G4XH7a0fH0M', '["no_legs","bands"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (152, 'Russian Twist', 'core', 'Bands', NULL, 'https://www.youtube.com/watch?v=wkD8rjkodUI', '["no_legs","bands"]', '["no_legs"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (153, 'Behind-the-Back Shrug', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=H7XQLba9BH4', '["no_legs","bodyweight","anemia"]', '["no_legs","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (154, 'Front Raise', 'shoulders', 'Barbell', NULL, 'https://www.youtube.com/watch?v=-t7fuZ0KhDA', '["high_blood_pressure","barbell","anemia"]', '["high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (160, 'Ab Wheel Rollout', 'core', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=v66p-vBrRLQ', '["high_blood_pressure","dumbbells","anemia"]', '["high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (161, 'Frog Pump', 'glutes', 'Cable', NULL, 'https://www.youtube.com/watch?v=hqCFRwj67N8', '["high_blood_pressure","cable","anemia"]', '["high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (162, 'Rack Pull', 'back', 'Barbell', NULL, 'https://www.youtube.com/watch?v=8iPEnn-ltC8&t=1s', '["high_blood_pressure","barbell","anemia"]', '["high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (163, 'Romanian Deadlift', 'legs', 'Machine', NULL, 'https://www.youtube.com/watch?v=DJpHADyP-Ko', '["high_blood_pressure","machine"]', '["high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (164, 'Arnold Press', 'shoulders', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=vj2w851ZHRM', '["high_blood_pressure","dumbbells","anemia"]', '["high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (165, 'Tricep Pushdown', 'biceps', 'Cable', NULL, 'https://www.youtube.com/watch?v=2-LAMcpzODU', '["high_blood_pressure","cable"]', '["high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (166, 'Dead Bug', 'core', 'Barbell', NULL, 'https://www.youtube.com/watch?v=4botcJcQKNA', '["high_blood_pressure","barbell","anemia"]', '["high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (167, 'Sumo Deadlift', 'glutes', 'Bands', NULL, 'https://www.youtube.com/watch?v=5zAkYWoR_4c', '["high_blood_pressure","bands","anemia"]', '["high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (168, 'Tricep Pushdown', 'biceps', 'Bands', NULL, 'https://www.youtube.com/watch?v=2-LAMcpzODU', '["high_blood_pressure","bands"]', '["high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (169, 'Chest Fly', 'chest', 'Cable', NULL, 'https://www.youtube.com/watch?v=eozdVDA78K0', '["high_blood_pressure","cable"]', '["high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (170, 'Leg Press', 'legs', 'Bands', NULL, 'https://www.youtube.com/watch?v=IZxyjW7MPJQ', '["high_blood_pressure","bands"]', '["high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (171, 'Push-Up', 'chest', 'Bands', NULL, 'https://www.youtube.com/watch?v=_l3ySVKYVJ8', '["high_blood_pressure","bands","anemia"]', '["high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (172, 'Face Pull', 'shoulders', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=rep-qVOkqgk', '["high_blood_pressure","dumbbells"]', '["high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (173, 'Bicep Curl', 'biceps', 'Cable', NULL, 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo', '["high_blood_pressure","cable"]', '["high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (174, 'Leg Press', 'legs', 'Cable', NULL, 'https://www.youtube.com/watch?v=IZxyjW7MPJQ', '["high_blood_pressure","cable"]', '["high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (175, 'Hanging Leg Raise', 'core', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=HDgq3x0B0GQ', '["anemia","bodyweight"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (176, 'Glute Bridge', 'glutes', 'Machine', NULL, 'https://www.youtube.com/watch?v=8bbE64NuDTU', '["anemia","machine"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (177, 'Dumbbell Shrug', 'back', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=1v7S_7DnkPk', '["anemia","dumbbells"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (178, 'Overhead Press', 'shoulders', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=qEwKCR5JCog', '["anemia","bodyweight"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (179, 'Cable Crunch', 'core', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=G4XH7a0fH0M', '["anemia","dumbbells"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (180, 'Cable Pull-Through', 'glutes', 'Cable', NULL, 'https://www.youtube.com/watch?v=F4Kc5gHhA6Y', '["anemia","cable"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (181, 'Face Pull (Traps)', 'back', 'Barbell', NULL, 'https://www.youtube.com/watch?v=rep-qVOkqgk', '["anemia","barbell"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (182, 'Overhead Tricep Extension', 'biceps', 'Cable', NULL, 'https://www.youtube.com/watch?v=nRiJVZDpdL0', '["anemia","cable"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (183, 'Russian Twist', 'core', 'Barbell', NULL, 'https://www.youtube.com/watch?v=wkD8rjkodUI', '["anemia","barbell"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (184, 'Step-Up', 'glutes', 'Bands', NULL, 'https://www.youtube.com/watch?v=dQqApCGd5Ss', '["anemia","bands"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (185, 'Hammer Curl', 'biceps', 'Bands', NULL, 'https://www.youtube.com/watch?v=zC3nLlEvin4', '["anemia","bands"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (186, 'Deadlift', 'back', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=op9kVnSso6Q', '["anemia","bodyweight"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (187, 'Front Raise', 'shoulders', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=-t7fuZ0KhDA', '["anemia","dumbbells"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (188, 'Squat', 'legs', 'Cable', NULL, 'https://www.youtube.com/watch?v=YaXPRqUwItQ', '["anemia","cable"]', '["anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (155, 'Overhead Tricep Extension', 'biceps', 'Bands', NULL, 'https://www.youtube.com/watch?v=nRiJVZDpdL0', '["high_blood_pressure","bands"]', '["high_blood_pressure"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (156, 'Bicycle Crunch', 'core', 'Bodyweight', NULL, 'https://www.youtube.com/watch?v=9FGilxCbdz8', '["high_blood_pressure","bodyweight","anemia"]', '["high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (157, 'Reverse Lunge', 'glutes', 'Machine', NULL, 'https://www.youtube.com/watch?v=QOVaHwm-Q6U', '["high_blood_pressure","machine","anemia"]', '["high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (158, 'Farmer\'s Walk', 'back', 'Dumbbells', NULL, 'https://www.youtube.com/watch?v=QJ7pMoDZX8o', '["high_blood_pressure","dumbbells","anemia"]', '["high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);
INSERT INTO "public"."exercises" ("id", "name", "primary_muscle", "equipment", "difficulty", "demo_video", "tags", "conditions", "created_at", "updated_at", "demo_url", "intensity_level", "description", "condition") VALUES (159, 'Lunges', 'legs', 'Bands', NULL, 'https://www.youtube.com/watch?v=QOVaHwm-Q6U', '["high_blood_pressure","bands","anemia"]', '["high_blood_pressure","anemia"]', '2025-10-14 08:41:07.000000', '2025-11-13 09:02:29.000000', '', NULL, NULL, NULL);




-- Dump of table exercises_stage
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."exercises_stage";

CREATE TABLE "public"."exercises_stage"(
   "id" bigint,
   "exercise_name" text,
   "muscle_group" text,
   "equipment" text,
   "intensity_level" text,
   "description" text,
   "condition" text,
   "demo_video" text,
   CONSTRAINT "undefined" PRIMARY KEY (undefined)
);







-- Dump of table failed_jobs
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."failed_jobs";

CREATE SEQUENCE "public"."failed_jobs_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."failed_jobs"(
   "id" bigint DEFAULT nextval('public.failed_jobs_id_seq1'::regclass) NOT NULL,
   "uuid" character varying(255) NOT NULL,
   "connection" text NOT NULL,
   "queue" text NOT NULL,
   "payload" text NOT NULL,
   "exception" text NOT NULL,
   "failed_at" timestamp with time zone DEFAULT now() NOT NULL,
   CONSTRAINT "failed_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "failed_jobs_uuid_key" ON "public"."failed_jobs" ("uuid");






-- Dump of table foods
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."foods";

CREATE SEQUENCE "public"."foods_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."foods"(
   "id" bigint DEFAULT nextval('public.foods_id_seq1'::regclass) NOT NULL,
   "name" character varying(255) NOT NULL,
   "brand" character varying(120),
   "calories" numeric DEFAULT 0 NOT NULL,
   "protein_g" numeric DEFAULT 0 NOT NULL,
   "carbs_g" numeric DEFAULT 0 NOT NULL,
   "fat_g" numeric DEFAULT 0 NOT NULL,
   "fiber_g" numeric DEFAULT 0 NOT NULL,
   "sugar_g" numeric DEFAULT 0 NOT NULL,
   "serving_size" numeric DEFAULT 100 NOT NULL,
   "serving_unit" character varying(50) DEFAULT 'g'::character varying NOT NULL,
   "sodium_mg" integer DEFAULT 0 NOT NULL,
   "cholesterol_mg" integer DEFAULT 0 NOT NULL,
   "meal_types" mealtypeenum[] NOT NULL,
   "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
   "created_at" timestamp with time zone DEFAULT now() NOT NULL,
   "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
   CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_foods_name_trgm" ON "public"."foods" ("name");
CREATE INDEX "idx_foods_tags_gin" ON "public"."foods" ("tags");
CREATE INDEX "idx_foods_types_gin" ON "public"."foods" ("meal_types");


INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (1, 'Mujadara', NULL, 446.40, 41.70, 33.80, 15.80, 4.20, 13.30, 100.00, 'g', 651, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (2, 'Tabbouleh', NULL, 749.70, 30.90, 32.10, 13.70, 4.20, 14.70, 100.00, 'g', 1068, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (3, 'Kibbeh Nayyeh', NULL, 863.10, 41.50, 39.80, 19.90, 4.40, 10.70, 100.00, 'g', 580, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (4, 'Warak Enab', NULL, 396.00, 35.80, 33.40, 28.90, 6.10, 1.90, 100.00, 'g', 1064, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (5, 'Fatteh Hummus', NULL, 419.20, 41.50, 79.30, 13.10, 6.80, 2.30, 100.00, 'g', 186, 0, '{breakfast,dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (6, 'Bamieh Stew', NULL, 629.20, 16.30, 78.50, 44.60, 11.40, 11.50, 100.00, 'g', 765, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (7, 'Mloukhieh', NULL, 596.00, 31.70, 19.70, 16.80, 10.90, 12.60, 100.00, 'g', 179, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (8, 'Lentil Soup', NULL, 217.40, 32.30, 33.60, 20.40, 9.90, 4.20, 100.00, 'g', 984, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (9, 'Fattoush', NULL, 599.10, 15.30, 78.30, 26.50, 4.70, 8.80, 100.00, 'g', 67, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (10, 'Kafta with Rice', NULL, 336.00, 26.60, 54.70, 43.20, 11.10, 1.20, 100.00, 'g', 142, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (11, 'Riz a Djej', NULL, 461.00, 24.80, 70.20, 20.90, 11.00, 10.70, 100.00, 'g', 520, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (12, 'Stuffed Zucchini', NULL, 734.60, 16.60, 57.60, 10.20, 5.00, 9.80, 100.00, 'g', 347, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (13, 'Sheikh el Mahshi', NULL, 874.00, 17.90, 25.50, 35.90, 8.90, 3.60, 100.00, 'g', 418, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (14, 'Loubieh Bzeit', NULL, 844.60, 33.10, 30.30, 11.10, 2.50, 10.40, 100.00, 'g', 1042, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (15, 'Batata Harra', NULL, 333.40, 11.70, 66.00, 16.50, 9.20, 1.90, 100.00, 'g', 1161, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (16, 'Kousa Mahshi', NULL, 519.00, 42.50, 44.50, 13.60, 10.60, 9.60, 100.00, 'g', 423, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (17, 'Yakhnet Fasoulia', NULL, 447.80, 5.80, 39.40, 39.30, 11.50, 14.80, 100.00, 'g', 960, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (18, 'Eggplant Fatteh', NULL, 502.30, 15.30, 10.10, 35.60, 5.50, 14.20, 100.00, 'g', 860, 0, '{breakfast,dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (19, 'Lebanese Potato Stew', NULL, 494.20, 23.30, 76.10, 11.90, 4.20, 6.10, 100.00, 'g', 379, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (20, 'Spinach Fatayer', NULL, 750.90, 7.50, 64.80, 20.70, 4.70, 7.60, 100.00, 'g', 353, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (21, 'Moghrabieh', NULL, 161.60, 43.20, 31.90, 7.30, 8.30, 6.70, 100.00, 'g', 966, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (22, 'Freekeh Chicken', NULL, 312.10, 26.00, 66.00, 31.80, 4.50, 2.30, 100.00, 'g', 640, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (23, 'Lebanese Omelette', NULL, 601.10, 44.00, 13.60, 40.00, 10.30, 12.50, 100.00, 'g', 193, 0, '{breakfast,dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (24, 'Manoushe Homemade', NULL, 743.40, 5.50, 11.70, 12.10, 1.10, 14.80, 100.00, 'g', 359, 0, '{breakfast,dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (25, 'Lebanese Meat Pie', NULL, 892.60, 31.90, 55.00, 36.80, 7.40, 6.70, 100.00, 'g', 970, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (26, 'Burghul with Tomatoes', NULL, 248.70, 29.80, 26.00, 9.10, 3.30, 0.60, 100.00, 'g', 70, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (27, 'Hummus Bowl', NULL, 362.00, 21.70, 24.70, 3.50, 8.40, 3.50, 100.00, 'g', 668, 0, '{breakfast,dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (28, 'Labneh with Olive Oil', NULL, 275.30, 38.20, 26.00, 25.50, 11.20, 11.80, 100.00, 'g', 334, 0, '{breakfast,dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (29, 'Grilled Halloumi', NULL, 694.70, 20.50, 45.20, 44.20, 1.60, 14.70, 100.00, 'g', 874, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (30, 'Eggplant Moussaka', NULL, 272.60, 44.90, 47.80, 18.50, 2.80, 8.20, 100.00, 'g', 879, 0, '{breakfast,dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (31, 'Homemade Shawarma Plate', NULL, 649.80, 36.60, 50.30, 23.30, 11.20, 11.30, 100.00, 'g', 747, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (32, 'Chicken with Rice', NULL, 815.40, 25.60, 46.70, 22.00, 4.50, 10.00, 100.00, 'g', 750, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (33, 'Lebanese Lentil Risotto', NULL, 419.10, 39.80, 17.80, 43.90, 9.60, 2.60, 100.00, 'g', 95, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (34, 'Vegetable Stew', NULL, 740.60, 30.40, 49.50, 44.00, 2.70, 7.30, 100.00, 'g', 784, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (35, 'Lebanese Falafel Plate', NULL, 837.80, 44.30, 35.20, 5.80, 6.60, 7.90, 100.00, 'g', 68, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (36, 'Tahini Salad', NULL, 466.40, 40.70, 16.70, 26.50, 6.60, 11.60, 100.00, 'g', 954, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (37, 'Zaatar Bread', NULL, 789.70, 14.10, 12.70, 26.90, 10.20, 8.70, 100.00, 'g', 989, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (38, 'Garlic Potatoes', NULL, 837.60, 38.80, 67.80, 34.90, 8.10, 3.20, 100.00, 'g', 191, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (39, 'Stuffed Peppers', NULL, 788.30, 17.40, 64.60, 8.90, 2.20, 9.20, 100.00, 'g', 661, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (40, 'Tomato Kibbeh', NULL, 499.60, 17.50, 47.70, 25.70, 7.90, 0.00, 100.00, 'g', 405, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (41, 'Chickpea Stew', NULL, 689.30, 33.00, 13.70, 35.90, 4.30, 7.70, 100.00, 'g', 276, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (42, 'Yogurt Cucumber Salad', NULL, 279.30, 8.30, 16.40, 18.70, 2.50, 5.60, 100.00, 'g', 434, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (43, 'Cabbage Rolls', NULL, 325.40, 35.30, 69.00, 8.80, 6.90, 12.40, 100.00, 'g', 540, 0, '{snack}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (44, 'Stuffed Vine Leaves', NULL, 481.50, 33.40, 12.20, 19.70, 3.20, 0.10, 100.00, 'g', 207, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (45, 'Beet Salad', NULL, 448.80, 40.00, 24.40, 3.10, 2.80, 4.70, 100.00, 'g', 315, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (46, 'Chard Stew', NULL, 503.40, 13.50, 53.80, 31.50, 9.20, 9.80, 100.00, 'g', 890, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (47, 'Mujadara Hamra', NULL, 718.60, 17.40, 22.80, 34.90, 8.30, 2.60, 100.00, 'g', 413, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (48, 'Potato Kibbeh', NULL, 241.60, 9.80, 74.80, 24.50, 9.80, 12.60, 100.00, 'g', 951, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (49, 'Lebanese Grilled Veggies', NULL, 680.80, 19.60, 53.20, 4.10, 3.40, 12.20, 100.00, 'g', 1047, 0, '{breakfast,dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (50, 'Hindbeh', NULL, 168.30, 8.20, 28.80, 38.80, 3.90, 10.10, 100.00, 'g', 382, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (51, 'Toum Dip', NULL, 602.20, 41.50, 23.60, 13.90, 2.90, 10.30, 100.00, 'g', 75, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (52, 'Chicken Shawarma Sandwich', NULL, 167.30, 15.20, 34.60, 44.60, 9.20, 6.80, 100.00, 'g', 279, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (53, 'Beef Shawarma Plate', NULL, 854.30, 5.90, 70.20, 35.60, 2.80, 11.90, 100.00, 'g', 394, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (54, 'Taouk Sandwich', NULL, 818.20, 24.60, 42.20, 30.20, 9.70, 9.70, 100.00, 'g', 546, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (55, 'Mixed Grill Platter', NULL, 468.30, 44.70, 55.00, 5.40, 10.70, 11.70, 330.00, 'ml', 790, 0, '{drink}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (56, 'Falafel Wrap', NULL, 443.70, 37.50, 63.60, 19.50, 6.50, 10.00, 100.00, 'g', 266, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (57, 'Manakish Zaatar', NULL, 551.40, 27.60, 58.10, 22.10, 9.30, 5.00, 100.00, 'g', 330, 0, '{breakfast,dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (58, 'Manakish Cheese', NULL, 522.90, 6.50, 45.00, 39.90, 3.00, 4.70, 100.00, 'g', 174, 0, '{breakfast,dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (59, 'Meat Pizza (Lahm Bi Ajeen)', NULL, 516.10, 24.20, 34.30, 28.00, 8.10, 11.40, 100.00, 'g', 765, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (60, 'Fatteh Shawarma', NULL, 263.60, 13.70, 12.70, 26.60, 7.10, 13.40, 100.00, 'g', 758, 0, '{breakfast,dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (61, 'Burger Taouk Style', NULL, 636.40, 19.00, 67.90, 35.50, 3.40, 7.10, 100.00, 'g', 1096, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (62, 'Malak al Taouk Sandwich', NULL, 768.30, 33.10, 10.70, 25.00, 6.20, 4.30, 100.00, 'g', 992, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (63, 'Zaatar w Zeit Wrap', NULL, 672.80, 21.90, 18.10, 25.60, 2.00, 1.00, 100.00, 'g', 1000, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (64, 'Kabab Platter', NULL, 664.50, 19.20, 78.40, 34.80, 1.40, 7.70, 330.00, 'ml', 164, 0, '{drink}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (65, 'Beef Kafta Sandwich', NULL, 859.50, 8.50, 59.80, 29.70, 11.70, 10.20, 100.00, 'g', 1160, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (66, 'Hummus Shawarma Bowl', NULL, 353.60, 7.20, 17.90, 16.90, 6.30, 10.10, 100.00, 'g', 147, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (67, 'Chicken Caesar Wrap', NULL, 395.80, 20.60, 32.90, 20.60, 8.70, 10.20, 100.00, 'g', 624, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (68, 'Lebanese Pizza', NULL, 328.00, 28.60, 58.80, 38.70, 11.60, 2.30, 100.00, 'g', 1065, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (69, 'Cheese Roll', NULL, 611.40, 31.10, 17.70, 13.10, 1.60, 1.90, 100.00, 'g', 711, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (70, 'Zaatar Fries', NULL, 290.70, 15.90, 47.60, 10.60, 1.50, 1.80, 100.00, 'g', 106, 0, '{snack}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (71, 'Batata Harra Box', NULL, 786.20, 42.00, 46.50, 5.00, 2.90, 9.10, 100.00, 'g', 346, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (72, 'Fatayer Combo', NULL, 244.30, 8.40, 68.80, 29.40, 5.80, 6.20, 100.00, 'g', 652, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (73, 'Hummus with Meat', NULL, 152.70, 42.00, 79.30, 14.60, 5.00, 3.30, 100.00, 'g', 1190, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (74, 'Tabbouleh Bowl', NULL, 391.40, 7.00, 43.60, 38.60, 2.50, 0.60, 100.00, 'g', 837, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (75, 'Warak Enab Plate', NULL, 743.30, 10.50, 61.90, 12.20, 1.40, 11.50, 100.00, 'g', 138, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (76, 'Lebanese Mixed Mezza', NULL, 158.20, 44.20, 30.60, 18.20, 3.50, 9.90, 100.00, 'g', 597, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (77, 'Grilled Halloumi Sandwich', NULL, 530.00, 20.60, 10.90, 23.10, 10.00, 2.70, 100.00, 'g', 395, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (78, 'Fatteh Taouk', NULL, 865.50, 34.10, 21.50, 6.60, 8.40, 4.90, 100.00, 'g', 820, 0, '{breakfast,dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (79, 'Falafel Bowl', NULL, 155.50, 40.60, 62.10, 29.10, 9.30, 8.80, 100.00, 'g', 93, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (80, 'Shish Taouk Plate', NULL, 571.50, 33.00, 19.40, 22.00, 10.30, 1.90, 100.00, 'g', 868, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (81, 'Lebanese Saj Sandwich', NULL, 515.30, 34.70, 22.40, 12.60, 11.10, 13.90, 100.00, 'g', 851, 0, '{breakfast,dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (82, 'Zinger Taouk Wrap', NULL, 776.90, 6.10, 37.00, 6.00, 1.70, 13.20, 100.00, 'g', 357, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (83, 'Halloumi Burger', NULL, 594.90, 15.10, 18.50, 9.20, 11.60, 3.50, 100.00, 'g', 961, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (84, 'Kofta Platter', NULL, 550.60, 31.30, 68.00, 4.80, 11.10, 11.90, 330.00, 'ml', 209, 0, '{drink}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (85, 'Lebanese Fries Box', NULL, 507.40, 20.90, 50.00, 42.50, 5.90, 4.10, 100.00, 'g', 587, 0, '{snack}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (86, 'Chicken Sub', NULL, 362.50, 7.90, 67.00, 38.00, 5.40, 8.20, 100.00, 'g', 190, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (87, 'Tawouk Fries Combo', NULL, 625.20, 35.40, 33.80, 24.90, 10.00, 14.70, 100.00, 'g', 56, 0, '{snack}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (88, 'Zaatar Saj', NULL, 285.70, 42.00, 67.10, 42.50, 11.60, 6.90, 100.00, 'g', 1089, 0, '{breakfast,dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (89, 'Grilled Fish Platter', NULL, 454.30, 18.60, 75.10, 22.90, 9.30, 2.90, 330.00, 'ml', 1111, 0, '{drink}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (90, 'Shrimp Taouk Plate', NULL, 220.20, 41.50, 14.70, 32.70, 4.30, 11.40, 100.00, 'g', 1135, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (91, 'Fatteh Mix', NULL, 632.00, 26.80, 15.50, 39.50, 7.20, 12.10, 100.00, 'g', 1174, 0, '{breakfast,dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (92, 'Falafel Sandwich', NULL, 407.90, 11.30, 73.50, 33.20, 5.50, 7.10, 100.00, 'g', 880, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (93, 'Kafta Plate', NULL, 539.20, 34.60, 24.00, 27.50, 11.50, 3.30, 100.00, 'g', 1134, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (94, 'Zaatar Mix Pizza', NULL, 811.20, 5.80, 39.60, 38.90, 10.00, 13.30, 100.00, 'g', 218, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (95, 'Fried Kibbeh', NULL, 669.00, 6.40, 75.70, 9.20, 9.10, 10.90, 100.00, 'g', 727, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (96, 'Grilled Tawouk Plate', NULL, 879.60, 18.40, 52.40, 14.20, 4.10, 9.30, 100.00, 'g', 650, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (97, 'Chicken Fatteh', NULL, 859.30, 11.30, 62.10, 38.10, 1.50, 6.50, 100.00, 'g', 644, 0, '{breakfast,dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (98, 'Falafel Sandwich Box', NULL, 588.00, 33.10, 37.60, 14.40, 5.20, 1.90, 100.00, 'g', 819, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (99, 'Fatteh Warak Enab', NULL, 796.40, 28.20, 69.30, 9.80, 5.40, 10.70, 100.00, 'g', 1015, 0, '{breakfast,dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (100, 'Lamb Rice Plate', NULL, 205.10, 28.40, 78.70, 25.70, 3.80, 5.30, 100.00, 'g', 776, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (101, 'Spicy Taouk Wrap', NULL, 873.90, 15.50, 13.30, 5.00, 11.10, 9.30, 100.00, 'g', 593, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (102, 'Mixed Shawarma Bowl', NULL, 871.00, 29.90, 17.00, 26.40, 7.20, 4.90, 100.00, 'g', 375, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (103, 'Lebanese Meat Stew', NULL, 563.70, 40.60, 16.80, 12.90, 8.60, 6.80, 100.00, 'g', 1162, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (104, 'Spinach with Rice', NULL, 818.80, 16.30, 22.30, 27.80, 5.80, 9.70, 100.00, 'g', 1155, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (105, 'Okra with Tomato', NULL, 281.10, 13.30, 63.20, 3.10, 7.10, 0.20, 100.00, 'g', 133, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (106, 'Rice with Lentils', NULL, 237.70, 41.70, 16.00, 39.40, 1.20, 7.50, 100.00, 'g', 389, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (107, 'Vegetable Couscous', NULL, 166.20, 33.90, 24.90, 43.70, 3.60, 11.80, 100.00, 'g', 944, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (108, 'Freekeh with Lamb', NULL, 366.50, 18.90, 75.20, 6.90, 5.80, 14.80, 100.00, 'g', 1103, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (109, 'Yakhnet Sbanegh', NULL, 553.80, 43.70, 25.20, 15.90, 3.70, 2.70, 100.00, 'g', 857, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (110, 'Stuffed Eggplant', NULL, 755.30, 37.60, 30.60, 40.40, 5.10, 10.90, 100.00, 'g', 617, 0, '{breakfast,dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (111, 'Homemade Falafel', NULL, 270.10, 31.20, 61.50, 38.50, 1.90, 7.20, 100.00, 'g', 883, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (112, 'Kibbeh Labanieh', NULL, 846.50, 10.40, 11.10, 15.20, 5.60, 3.50, 100.00, 'g', 158, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (113, 'Eggplant Fatteh', NULL, 206.90, 9.70, 57.80, 22.20, 10.90, 0.20, 100.00, 'g', 813, 0, '{breakfast,dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (114, 'Loubieh with Olive Oil', NULL, 601.70, 29.40, 10.20, 20.30, 11.10, 0.70, 100.00, 'g', 693, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (115, 'Chicken and Potatoes', NULL, 393.40, 37.90, 60.80, 18.70, 1.50, 1.90, 100.00, 'g', 122, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (116, 'Ruz bi Djaj', NULL, 623.40, 16.30, 36.60, 28.10, 5.10, 12.40, 100.00, 'g', 73, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (117, 'Lebanese Meatballs', NULL, 752.50, 39.20, 79.40, 8.30, 6.70, 4.00, 100.00, 'g', 911, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (118, 'Stuffed Tomatoes', NULL, 674.10, 19.90, 65.60, 30.50, 4.00, 13.00, 100.00, 'g', 1196, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (119, 'Hindbeh bi Zeit', NULL, 644.20, 29.70, 76.00, 3.40, 10.60, 2.00, 100.00, 'g', 176, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (120, 'Homemade Fries', NULL, 506.10, 8.50, 24.70, 12.50, 2.70, 13.40, 100.00, 'g', 577, 0, '{snack}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (121, 'Grilled Eggplant', NULL, 438.20, 22.60, 69.30, 15.40, 3.90, 11.20, 100.00, 'g', 68, 0, '{breakfast,dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (122, 'Vegetable Stuffed Peppers', NULL, 566.00, 23.10, 56.80, 40.60, 1.30, 9.90, 100.00, 'g', 827, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (123, 'Homemade Tabbouleh Deluxe', NULL, 239.60, 42.70, 22.30, 23.00, 10.70, 13.50, 100.00, 'g', 1110, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (124, 'Rice and Chickpeas', NULL, 875.20, 13.50, 31.80, 25.50, 2.90, 7.60, 100.00, 'g', 295, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (125, 'Lebanese Chard Rolls', NULL, 328.60, 39.10, 47.10, 34.40, 10.70, 11.10, 100.00, 'g', 648, 0, '{snack}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (126, 'Homemade Fatteh Mix', NULL, 569.20, 33.00, 51.70, 42.40, 11.50, 13.40, 100.00, 'g', 819, 0, '{breakfast,dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (127, 'Spinach Pies', NULL, 272.50, 24.70, 73.10, 12.70, 4.00, 13.10, 100.00, 'g', 409, 0, '{dinner,lunch}', '["home","homemade","traditional"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (128, 'Grilled Kafta Plate', NULL, 804.90, 18.70, 63.90, 29.60, 7.40, 9.90, 100.00, 'g', 1174, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (129, 'Chicken Sub Combo', NULL, 422.40, 23.60, 38.90, 18.70, 4.00, 11.50, 100.00, 'g', 770, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (130, 'Lebanese Tacos', NULL, 834.10, 14.80, 53.10, 37.80, 5.10, 8.20, 100.00, 'g', 342, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (131, 'Fatteh Falafel', NULL, 838.30, 34.50, 64.40, 21.70, 4.70, 6.70, 100.00, 'g', 492, 0, '{breakfast,dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (132, 'Grilled Lamb Plate', NULL, 859.20, 30.40, 27.30, 21.00, 5.90, 8.10, 100.00, 'g', 172, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (133, 'Mixed Grill Box', NULL, 344.00, 33.40, 56.80, 25.50, 10.50, 1.80, 100.00, 'g', 938, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (134, 'Shawarma Saj', NULL, 206.70, 28.00, 67.90, 21.40, 6.40, 2.10, 100.00, 'g', 204, 0, '{breakfast,dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (135, 'Beef Burger', NULL, 325.50, 13.10, 16.20, 18.50, 2.10, 6.90, 100.00, 'g', 775, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (136, 'Chicken Burger', NULL, 331.30, 37.10, 39.40, 27.20, 6.40, 7.20, 100.00, 'g', 597, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (137, 'Taouk Platter', NULL, 842.20, 31.40, 31.50, 8.10, 2.10, 1.10, 330.00, 'ml', 825, 0, '{drink}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (138, 'Falafel Fries Combo', NULL, 799.80, 43.00, 46.50, 31.60, 10.00, 2.30, 100.00, 'g', 893, 0, '{snack}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (139, 'Lebanese Rice Bowl', NULL, 161.20, 25.00, 53.20, 14.80, 10.90, 14.50, 100.00, 'g', 970, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (140, 'Grilled Chicken Salad', NULL, 518.70, 34.00, 41.30, 43.10, 3.40, 11.40, 100.00, 'g', 831, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (141, 'Taouk Box', NULL, 269.30, 14.40, 10.80, 32.40, 10.20, 3.20, 100.00, 'g', 418, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (142, 'Falafel Plate Combo', NULL, 230.90, 41.40, 19.80, 14.10, 3.00, 12.90, 100.00, 'g', 248, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (143, 'Cheese Saj', NULL, 890.50, 14.00, 58.40, 28.20, 10.40, 13.80, 100.00, 'g', 436, 0, '{breakfast,dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (144, 'Kibbeh Plate', NULL, 731.50, 12.50, 32.10, 4.20, 4.00, 1.50, 100.00, 'g', 132, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (145, 'Lebanese Taouk Burger', NULL, 635.20, 23.90, 45.90, 4.50, 2.50, 6.50, 100.00, 'g', 355, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (146, 'Fatteh Combo', NULL, 746.10, 10.30, 73.10, 19.30, 9.40, 9.70, 100.00, 'g', 355, 0, '{breakfast,dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (147, 'Zaatar Fries Bowl', NULL, 473.40, 24.30, 31.10, 12.80, 7.10, 2.20, 100.00, 'g', 656, 0, '{snack}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (148, 'Fish Sandwich', NULL, 743.90, 43.30, 55.90, 28.40, 9.50, 8.50, 100.00, 'g', 848, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (149, 'Shrimp Plate', NULL, 471.80, 10.10, 44.90, 24.60, 9.70, 2.30, 100.00, 'g', 198, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (150, 'Lebanese Mezza Combo', NULL, 311.40, 7.60, 67.10, 25.20, 7.70, 2.30, 100.00, 'g', 1110, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (151, 'Zaatar Taouk Wrap', NULL, 724.70, 38.70, 37.20, 24.60, 3.30, 11.70, 100.00, 'g', 1027, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (152, 'Chicken Caesar Plate', NULL, 246.60, 26.30, 51.60, 44.70, 5.50, 3.50, 100.00, 'g', 420, 0, '{dinner,lunch}', '["popular","restaurant"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (153, 'Coca-Cola Classic', NULL, 140.00, 0.00, 35.00, 0.00, 0.00, 35.00, 330.00, 'ml', 20, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (154, 'Coca-Cola Zero Sugar', NULL, 1.00, 0.00, 0.00, 0.00, 0.00, 0.00, 330.00, 'ml', 20, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (155, 'Coca-Cola Cherry', NULL, 150.00, 0.00, 39.00, 0.00, 0.00, 39.00, 330.00, 'ml', 25, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (156, 'Pepsi Classic', NULL, 139.00, 0.00, 35.00, 0.00, 0.00, 35.00, 330.00, 'ml', 15, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (157, 'Pepsi Max', NULL, 1.00, 0.00, 0.00, 0.00, 0.00, 0.00, 330.00, 'ml', 20, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (158, 'Pepsi Wild Cherry', NULL, 150.00, 0.00, 40.00, 0.00, 0.00, 40.00, 330.00, 'ml', 25, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (159, 'Sprite', NULL, 140.00, 0.00, 38.00, 0.00, 0.00, 38.00, 330.00, 'ml', 25, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (160, 'Sprite Zero', NULL, 1.00, 0.00, 0.00, 0.00, 0.00, 0.00, 330.00, 'ml', 20, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (161, 'Fanta Orange', NULL, 160.00, 0.00, 44.00, 0.00, 0.00, 44.00, 330.00, 'ml', 25, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (162, 'Fanta Grape', NULL, 170.00, 0.00, 46.00, 0.00, 0.00, 46.00, 330.00, 'ml', 30, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (163, 'Fanta Pineapple', NULL, 170.00, 0.00, 46.00, 0.00, 0.00, 46.00, 330.00, 'ml', 30, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (164, 'Dr Pepper', NULL, 150.00, 0.00, 40.00, 0.00, 0.00, 40.00, 100.00, 'g', 55, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (165, 'Dr Pepper Cherry', NULL, 155.00, 0.00, 42.00, 0.00, 0.00, 42.00, 100.00, 'g', 55, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (166, 'Mountain Dew', NULL, 170.00, 0.00, 46.00, 0.00, 0.00, 46.00, 100.00, 'g', 60, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (167, 'Mountain Dew Code Red', NULL, 170.00, 0.00, 46.00, 0.00, 0.00, 46.00, 100.00, 'g', 65, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (168, 'Mountain Dew Baja Blast', NULL, 160.00, 0.00, 44.00, 0.00, 0.00, 44.00, 100.00, 'g', 60, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (169, '7UP', NULL, 140.00, 0.00, 36.00, 0.00, 0.00, 36.00, 100.00, 'g', 20, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (170, 'Mirinda Orange', NULL, 160.00, 0.00, 44.00, 0.00, 0.00, 44.00, 100.00, 'g', 30, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (171, 'Mirinda Strawberry', NULL, 160.00, 0.00, 44.00, 0.00, 0.00, 44.00, 100.00, 'g', 30, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (172, 'Schweppes Tonic Water', NULL, 120.00, 0.00, 30.00, 0.00, 0.00, 30.00, 330.00, 'ml', 35, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (173, 'Canada Dry Ginger Ale', NULL, 140.00, 0.00, 35.00, 0.00, 0.00, 35.00, 330.00, 'ml', 35, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (174, 'Faygo Redpop', NULL, 160.00, 0.00, 44.00, 0.00, 0.00, 44.00, 100.00, 'g', 40, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (175, 'Jarritos Mango', NULL, 150.00, 0.00, 38.00, 0.00, 0.00, 38.00, 100.00, 'g', 35, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (176, 'Jarritos Tamarind', NULL, 140.00, 0.00, 37.00, 0.00, 0.00, 37.00, 100.00, 'g', 30, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (177, 'Red Bull', NULL, 110.00, 2.00, 27.00, 0.00, 0.00, 27.00, 100.00, 'g', 105, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (178, 'Red Bull Sugarfree', NULL, 10.00, 2.00, 2.00, 0.00, 0.00, 2.00, 100.00, 'g', 105, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (179, 'Red Bull Tropical', NULL, 120.00, 2.00, 29.00, 0.00, 0.00, 29.00, 100.00, 'g', 105, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (180, 'Monster Energy', NULL, 210.00, 2.00, 54.00, 0.00, 0.00, 54.00, 330.00, 'ml', 180, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (181, 'Monster Zero Ultra', NULL, 10.00, 2.00, 2.00, 0.00, 0.00, 2.00, 100.00, 'g', 180, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (182, 'Monster Mango Loco', NULL, 230.00, 2.00, 58.00, 0.00, 0.00, 58.00, 100.00, 'g', 180, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (183, 'Rockstar Energy', NULL, 250.00, 2.00, 63.00, 0.00, 0.00, 63.00, 330.00, 'ml', 200, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (184, 'Rockstar Punched', NULL, 260.00, 2.00, 65.00, 0.00, 0.00, 65.00, 100.00, 'g', 200, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (185, 'Rockstar Sugarfree', NULL, 25.00, 2.00, 5.00, 0.00, 0.00, 5.00, 100.00, 'g', 200, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (186, 'Bang Energy Blue Razz', NULL, 0.00, 2.00, 0.00, 0.00, 0.00, 0.00, 330.00, 'ml', 40, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (187, 'Bang Energy Peach Mango', NULL, 0.00, 2.00, 0.00, 0.00, 0.00, 0.00, 330.00, 'ml', 40, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (188, '5-Hour Energy Shot', NULL, 5.00, 2.00, 1.00, 0.00, 0.00, 1.00, 330.00, 'ml', 10, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (189, 'Tropicana Orange Juice', NULL, 110.00, 1.00, 26.00, 0.00, 0.50, 22.00, 330.00, 'ml', 5, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (190, 'Tropicana Grapefruit Juice', NULL, 100.00, 1.00, 24.00, 0.00, 0.50, 20.00, 330.00, 'ml', 5, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (191, 'Minute Maid Apple Juice', NULL, 120.00, 1.00, 29.00, 0.00, 0.50, 25.00, 330.00, 'ml', 10, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (192, 'Minute Maid Mango Juice', NULL, 130.00, 1.00, 32.00, 0.00, 0.50, 28.00, 330.00, 'ml', 10, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (193, 'Capri Sun Strawberry Kiwi', NULL, 60.00, 1.00, 16.00, 0.00, 0.50, 12.00, 100.00, 'g', 15, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (194, 'Capri Sun Pacific Cooler', NULL, 60.00, 1.00, 16.00, 0.00, 0.50, 12.00, 100.00, 'g', 15, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (195, 'Rani Float Peach', NULL, 135.00, 1.00, 34.00, 0.00, 0.50, 30.00, 100.00, 'g', 25, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (196, 'Simply Lemonade', NULL, 120.00, 1.00, 28.00, 0.00, 0.50, 24.00, 100.00, 'g', 10, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (197, 'Simply Limeade', NULL, 120.00, 1.00, 28.00, 0.00, 0.50, 24.00, 100.00, 'g', 10, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (198, 'Ocean Spray Cranberry', NULL, 110.00, 1.00, 28.00, 0.00, 0.50, 24.00, 100.00, 'g', 5, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (199, 'Ocean Spray Grape', NULL, 120.00, 1.00, 29.00, 0.00, 0.50, 25.00, 100.00, 'g', 5, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (200, 'Evian Water', NULL, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 330.00, 'ml', 5, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (201, 'Fiji Water', NULL, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 330.00, 'ml', 6, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (202, 'Perrier Sparkling Water', NULL, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 330.00, 'ml', 0, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (203, 'San Pellegrino Sparkling', NULL, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 330.00, 'ml', 0, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (204, 'SmartWater', NULL, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 330.00, 'ml', 5, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (205, 'Dasani Water', NULL, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 330.00, 'ml', 5, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (206, 'Aquafina Water', NULL, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 330.00, 'ml', 5, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (207, 'Starbucks Frappuccino Mocha', NULL, 190.00, 3.00, 31.00, 2.00, 0.00, 29.00, 330.00, 'ml', 120, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (208, 'Starbucks Cold Brew Black', NULL, 15.00, 3.00, 3.00, 2.00, 0.00, 1.00, 100.00, 'g', 10, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (209, 'Starbucks Nitro Cold Brew', NULL, 10.00, 3.00, 2.00, 2.00, 0.00, 0.00, 100.00, 'g', 10, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (210, 'Dunkin Iced Coffee Mocha', NULL, 180.00, 3.00, 29.00, 2.00, 0.00, 27.00, 330.00, 'ml', 115, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (211, 'Dunkin Cold Brew Black', NULL, 15.00, 3.00, 3.00, 2.00, 0.00, 1.00, 100.00, 'g', 10, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (212, 'Nescafé Latte Can', NULL, 120.00, 3.00, 23.00, 2.00, 0.00, 21.00, 330.00, 'ml', 100, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (213, 'Lipton Ice Tea Lemon', NULL, 135.00, 0.00, 33.00, 0.00, 0.00, 33.00, 330.00, 'ml', 20, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (214, 'Arizona Green Tea Honey', NULL, 210.00, 0.00, 51.00, 0.00, 0.00, 51.00, 330.00, 'ml', 15, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (215, 'Nestea Peach', NULL, 135.00, 0.00, 33.00, 0.00, 0.00, 33.00, 330.00, 'ml', 25, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (216, 'Pure Leaf Iced Tea Unsweetened', NULL, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 330.00, 'ml', 15, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (217, 'Gold Peak Sweet Tea', NULL, 180.00, 0.00, 46.00, 0.00, 0.00, 46.00, 330.00, 'ml', 25, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (218, 'Ayran', NULL, 110.00, 2.00, 9.00, 2.00, 0.50, 7.00, 330.00, 'ml', 280, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (219, 'Kombucha Ginger Lemon', NULL, 70.00, 2.00, 16.00, 2.00, 0.50, 14.00, 330.00, 'ml', 20, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (220, 'Kombucha Raspberry', NULL, 80.00, 2.00, 18.00, 2.00, 0.50, 16.00, 330.00, 'ml', 20, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (221, 'Horchata', NULL, 120.00, 2.00, 26.00, 2.00, 0.50, 24.00, 330.00, 'ml', 50, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (222, 'Matcha Latte', NULL, 140.00, 2.00, 26.00, 2.00, 0.50, 24.00, 330.00, 'ml', 70, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (223, 'Thai Iced Tea', NULL, 180.00, 2.00, 45.00, 2.00, 0.50, 43.00, 330.00, 'ml', 60, 0, '{drink}', '["beverage","drink"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (224, 'Gandour Tarboosh (Ras el Abed)', NULL, 150.00, 1.50, 22.00, 7.00, 0.00, 16.00, 100.00, 'g', 45, 0, '{snack}', '["brand=gandour","classic","flavor=marshmallow cone","local","size=32g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (225, 'Gandour Pik-One', NULL, 180.00, 2.00, 24.00, 9.00, 0.50, 20.00, 100.00, 'g', 80, 0, '{snack}', '["brand=gandour","flavor=nougat & caramel","local","size=37g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (226, 'Snickers Bar', NULL, 248.00, 4.60, 32.00, 12.00, 1.20, 27.00, 100.00, 'g', 120, 0, '{snack}', '["brand=mars","contains_nuts","flavor=peanut caramel","imported","size=50g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (227, 'Mars Bar', NULL, 228.00, 2.20, 35.00, 8.50, 0.60, 31.00, 100.00, 'g', 90, 0, '{snack}', '["brand=mars","flavor=caramel nougat","imported","size=51g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (228, 'Galaxy Smooth Milk', NULL, 216.00, 2.80, 24.00, 12.00, 0.70, 22.00, 100.00, 'g', 30, 0, '{snack}', '["brand=mars","flavor=milk chocolate","imported","size=40g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (229, 'Cadbury Dairy Milk', NULL, 240.00, 3.80, 26.00, 13.00, 0.80, 24.00, 100.00, 'g', 40, 0, '{snack}', '["brand=cadbury","flavor=milk chocolate","imported","size=45g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (230, 'KitKat 4-Finger', NULL, 207.00, 3.90, 26.00, 10.80, 0.70, 21.00, 100.00, 'g', 36, 0, '{snack}', '["brand=nestlé","flavor=wafer chocolate","imported","size=41g","wafer"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (231, 'Patchi Dark Square', NULL, 56.00, 0.70, 4.40, 4.10, 0.90, 3.20, 100.00, 'g', 0, 0, '{snack}', '["brand=patchi","dark","flavor=dark chocolate","local","premium","size=10g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (232, 'Ferrero Rocher (3 pieces)', NULL, 227.00, 3.10, 16.50, 16.40, 1.80, 15.40, 100.00, 'g', 21, 0, '{snack}', '["brand=ferrero","contains_nuts","flavor=hazelnut","imported","size=37g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (233, 'Gandour Unica', NULL, 160.00, 2.00, 16.00, 9.00, 0.60, 10.00, 100.00, 'g', 55, 0, '{snack}', '["brand=gandour","flavor=chocolate-coated wafer","local","size=30g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (234, 'Loacker Quadratini (Hazelnut, 8 pcs)', NULL, 200.00, 3.30, 24.00, 10.00, 0.90, 10.00, 100.00, 'g', 45, 0, '{snack}', '["brand=loacker","contains_nuts","flavor=hazelnut","imported","size=37g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (235, 'Nestlé KitKat Chunky', NULL, 207.00, 3.50, 26.00, 10.50, 0.70, 21.00, 100.00, 'g', 36, 0, '{snack}', '["brand=nestlé","flavor=wafer chocolate","imported","size=40g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (236, 'Master Chips Classic Salt', NULL, 240.00, 3.00, 24.00, 15.00, 3.00, 0.50, 100.00, 'g', 300, 0, '{snack}', '["brand=master","flavor=salted","fried","gluten_free","local","size=45g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (237, 'Master Chips Ketchup', NULL, 230.00, 3.00, 23.00, 14.00, 3.00, 2.00, 100.00, 'g', 320, 0, '{snack}', '["brand=master","flavor=ketchup","fried","local","size=45g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (238, 'Master Kettle Cooked Sea Salt', NULL, 210.00, 3.20, 21.00, 13.00, 2.50, 0.80, 100.00, 'g', 260, 0, '{snack}', '["brand=master","flavor=kettle cooked","gluten_free","kettle","local","size=40g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (239, 'Pringles Original (small can)', NULL, 210.00, 2.00, 21.00, 13.00, 1.20, 0.30, 100.00, 'g', 250, 0, '{snack}', '["brand=pringles","flavor=original","imported","size=40g","stackable"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (240, 'Doritos Nacho Cheese', NULL, 200.00, 3.30, 21.00, 12.00, 1.50, 1.10, 100.00, 'g', 300, 0, '{snack}', '["brand=doritos","cheese","flavor=cheese","imported","size=40g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (241, 'Cheetos Crunchy', NULL, 200.00, 2.50, 15.00, 12.00, 1.00, 1.00, 100.00, 'g', 320, 0, '{snack}', '["brand=cheetos","cheese","flavor=cheese","imported","size=35g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (242, 'Quest Protein Bar Chocolate Chip Cookie Dough', NULL, 200.00, 21.00, 23.00, 8.00, 14.00, 1.00, 330.00, 'ml', 220, 0, '{drink}', '["brand=quest","flavor=cookie dough","high_protein","imported","size=60g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (243, 'Grenade Carb Killa Chocolate Salted Caramel', NULL, 217.00, 20.00, 16.00, 9.00, 6.60, 1.50, 330.00, 'ml', 240, 0, '{drink}', '["brand=grenade","flavor=salted caramel","high_protein","imported","size=60g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (244, 'Clif Builder\'s Protein Bar Chocolate', NULL, 280.00, 20.00, 29.00, 9.00, 3.00, 20.00, 330.00, 'ml', 210, 0, '{drink}', '["brand=clif","flavor=chocolate","high_protein","imported","size=68g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (245, 'Banana (medium)', NULL, 105.00, 1.30, 27.00, 0.30, 3.10, 14.40, 100.00, 'g', 1, 0, '{snack}', '["affordable","brand=fresh","flavor=banana","fresh","size=118g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (246, 'Apple (medium)', NULL, 95.00, 0.50, 25.00, 0.30, 4.40, 19.00, 100.00, 'g', 2, 0, '{snack}', '["brand=fresh","flavor=apple","fresh","size=182g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (247, 'Dates (4 pieces)', NULL, 80.00, 0.60, 22.00, 0.00, 2.00, 19.00, 100.00, 'g', 1, 0, '{snack}', '["brand=dried","dried","flavor=deglet nour","size=28g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (248, 'Dried Apricots (6 halves)', NULL, 84.00, 1.00, 22.00, 0.00, 2.70, 17.00, 100.00, 'g', 2, 0, '{snack}', '["brand=dried","dried","flavor=apricot","size=35g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (249, 'Raisin Pack (small)', NULL, 90.00, 1.00, 24.00, 0.00, 1.20, 18.00, 100.00, 'g', 5, 0, '{snack}', '["brand=dried","dried","flavor=raisins","size=30g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (250, 'Poppins Cereal Bar Chocolate', NULL, 110.00, 2.00, 18.00, 3.50, 1.50, 6.00, 330.00, 'ml', 90, 0, '{drink}', '["brand=poppins","flavor=chocolate","local","size=25g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (251, 'Poppins Cereal Bar Strawberry', NULL, 105.00, 1.80, 18.00, 3.20, 1.60, 6.00, 100.00, 'g', 85, 0, '{snack}', '["brand=poppins","flavor=strawberry","fruit","local","size=25g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (252, 'Nestlé Fitness Cereal Bar', NULL, 90.00, 1.20, 17.00, 2.10, 1.50, 6.00, 100.00, 'g', 60, 0, '{snack}', '["brand=nestlé","flavor=whole grain","imported","size=23g","whole_grain"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (253, 'Nature Valley Crunchy Oats & Honey (2 bars)', NULL, 190.00, 4.00, 29.00, 7.00, 3.00, 11.00, 100.00, 'g', 150, 0, '{snack}', '["brand=nature valley","flavor=oats & honey","imported","size=42g","whole_grain"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (254, 'Gandour Safari Biscuit', NULL, 134.00, 2.00, 20.00, 5.00, 0.80, 6.00, 100.00, 'g', 90, 0, '{snack}', '["brand=gandour","flavor=plain","local","size=30g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (255, 'Gandour Glucose Biscuit Pack', NULL, 125.00, 2.10, 22.00, 3.60, 0.60, 7.00, 100.00, 'g', 70, 0, '{snack}', '["brand=gandour","flavor=glucose","local","size=30g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (256, 'McVitie\'s Digestive (2 biscuits)', NULL, 140.00, 2.00, 18.00, 6.00, 2.00, 5.00, 100.00, 'g', 180, 0, '{snack}', '["brand=mcvitie\'s","flavor=digestive","imported","size=28g","whole_grain"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (257, 'LU Prince Chocolate (2 biscuits)', NULL, 190.00, 3.00, 29.00, 7.00, 1.20, 13.00, 330.00, 'ml', 160, 0, '{drink}', '["brand=lu","flavor=chocolate filled","imported","size=37g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (258, '7DAYS Croissant Chocolate', NULL, 270.00, 5.00, 33.00, 13.00, 2.00, 12.00, 330.00, 'ml', 260, 0, '{drink}', '["brand=7days","flavor=chocolate filling","imported","size=60g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (259, '7DAYS Croissant Cocoa & Vanilla', NULL, 265.00, 5.00, 32.00, 13.00, 2.00, 11.00, 100.00, 'g', 250, 0, '{snack}', '["brand=7days","flavor=cocoa & vanilla","imported","size=60g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (260, 'Chipicao Croissant', NULL, 270.00, 5.00, 34.00, 12.00, 2.00, 12.00, 100.00, 'g', 250, 0, '{snack}', '["brand=chipicao","flavor=chocolate","imported","size=60g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (261, 'Pain au Chocolat (bakery, small)', NULL, 230.00, 4.50, 26.00, 12.00, 1.50, 8.00, 330.00, 'ml', 210, 0, '{drink}', '["brand=bakery","flavor=chocolate","fresh_bakery","size=55g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (262, 'Master Sticks (Salt)', NULL, 230.00, 3.00, 23.00, 14.00, 2.50, 0.70, 100.00, 'g', 300, 0, '{snack}', '["brand=master","flavor=potato sticks","local","size=45g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (263, 'Master Chips Chili', NULL, 235.00, 3.00, 23.00, 14.00, 2.80, 1.00, 100.00, 'g', 320, 0, '{snack}', '["brand=master","flavor=chili","local","size=45g","spicy"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (264, 'Pringles Sour Cream & Onion (small)', NULL, 210.00, 2.00, 21.00, 13.00, 1.20, 1.00, 100.00, 'g', 260, 0, '{snack}', '["brand=pringles","dairy","flavor=sour cream & onion","imported","size=40g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (265, 'Doritos Sweet Chili Pepper', NULL, 198.00, 3.30, 20.00, 12.00, 1.50, 1.00, 100.00, 'g', 300, 0, '{snack}', '["brand=doritos","flavor=sweet chili","imported","size=40g","spicy"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (266, 'Ulker Halley', NULL, 140.00, 2.00, 21.00, 5.00, 0.50, 12.00, 100.00, 'g', 75, 0, '{snack}', '["brand=ülker","flavor=marshmallow biscuit","imported","size=30g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (267, 'Ulker Tea Biscuits (4 pcs)', NULL, 124.00, 2.20, 20.00, 3.60, 0.60, 5.00, 330.00, 'ml', 90, 0, '{drink}', '["brand=ülker","flavor=plain","imported","size=28g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (268, 'Loacker Gardena Fingers', NULL, 210.00, 3.00, 19.00, 13.00, 1.20, 12.00, 100.00, 'g', 50, 0, '{snack}', '["brand=loacker","contains_nuts","flavor=hazelnut","imported","size=38g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (269, 'Poppins Protein Crunch Bar', NULL, 180.00, 12.00, 18.00, 6.00, 4.00, 5.00, 100.00, 'g', 160, 0, '{snack}', '["brand=poppins","flavor=chocolate","high_protein","local","size=40g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (270, 'Nestlé Yes! Nut Bar (Almond, Peanut, Dark Choc)', NULL, 180.00, 6.00, 17.00, 11.00, 4.00, 12.00, 100.00, 'g', 60, 0, '{snack}', '["brand=nestlé","contains_nuts","flavor=nut & dark chocolate","imported","size=35g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (271, 'Nature Valley Protein Peanut & Chocolate', NULL, 190.00, 10.00, 15.00, 12.00, 5.00, 6.00, 330.00, 'ml', 150, 0, '{drink}', '["brand=nature valley","contains_nuts","flavor=peanut & choc","high_protein","imported","size=40g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (272, 'Orange (medium)', NULL, 62.00, 1.20, 15.40, 0.20, 3.10, 12.20, 100.00, 'g', 0, 0, '{snack}', '["brand=fresh","flavor=orange","fresh","size=130g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (273, 'Pear (medium)', NULL, 101.00, 0.70, 27.00, 0.30, 5.50, 17.00, 100.00, 'g', 2, 0, '{snack}', '["brand=fresh","flavor=pear","fresh","size=178g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (274, 'Fresh Grapes (cup)', NULL, 62.00, 0.60, 16.00, 0.30, 0.80, 15.00, 100.00, 'g', 2, 0, '{snack}', '["brand=fresh","flavor=red grapes","fresh","size=92g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (275, 'Oreo (4 biscuits)', NULL, 210.00, 2.40, 33.60, 9.60, 1.60, 16.00, 100.00, 'g', 180, 0, '{snack}', '["brand=mondelez","flavor=chocolate sandwich","imported","size=44g","vegan_recipe_may_vary"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (276, 'Belvita Breakfast Biscuits (2 biscuits)', NULL, 115.00, 2.00, 19.00, 3.80, 2.00, 6.00, 100.00, 'g', 90, 0, '{snack}', '["brand=mondelez","flavor=honey & nuts","imported","size=25g","whole_grain"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (277, 'TUC Crackers (portion)', NULL, 120.00, 2.50, 16.00, 5.00, 0.80, 2.00, 100.00, 'g', 300, 0, '{snack}', '["brand=mondelez","flavor=salty crackers","imported","savory","size=25g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (278, 'Mini Zaatar Croissant (bakery)', NULL, 190.00, 4.00, 20.00, 10.00, 2.00, 2.00, 100.00, 'g', 300, 0, '{snack}', '["brand=bakery","flavor=zaatar","fresh_bakery","savory","size=50g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (279, '7DAYS Mini Bake Rolls (Garlic)', NULL, 170.00, 5.00, 30.00, 3.00, 2.00, 3.00, 100.00, 'g', 420, 0, '{snack}', '["brand=7days","flavor=bake rolls garlic","imported","savory","size=40g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (280, 'Fitness Delice Dark Chocolate Bar', NULL, 99.00, 1.40, 17.00, 2.50, 1.80, 6.00, 330.00, 'ml', 70, 0, '{drink}', '["brand=nestlé","flavor=dark chocolate","imported","size=23g"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');
INSERT INTO "public"."foods" ("id", "name", "brand", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "serving_size", "serving_unit", "sodium_mg", "cholesterol_mg", "meal_types", "tags", "created_at", "updated_at") VALUES (281, 'Weetabix On The Go Cereal Bar Chocolate', NULL, 117.00, 3.00, 18.00, 3.20, 2.70, 7.00, 330.00, 'ml', 60, 0, '{drink}', '["brand=weetabix","flavor=chocolate","imported","size=30g","whole_grain"]', '2025-10-10 20:58:06.947000', '2025-10-10 20:58:06.947000');




-- Dump of table job_batches
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."job_batches";

CREATE TABLE "public"."job_batches"(
   "id" character varying(255) NOT NULL,
   "name" character varying(255),
   "total_jobs" integer NOT NULL,
   "pending_jobs" integer NOT NULL,
   "failed_jobs" integer NOT NULL,
   "failed_job_ids" text NOT NULL,
   "options" text,
   "created_at" timestamp with time zone,
   "cancelled_at" timestamp with time zone,
   "finished_at" timestamp with time zone,
   CONSTRAINT "job_batches_pkey" PRIMARY KEY ("id")
);







-- Dump of table jobs
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."jobs";

CREATE SEQUENCE "public"."jobs_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."jobs"(
   "id" bigint DEFAULT nextval('public.jobs_id_seq1'::regclass) NOT NULL,
   "queue" character varying(255) NOT NULL,
   "payload" text NOT NULL,
   "attempts" integer DEFAULT 0 NOT NULL,
   "reserved_at" bigint,
   "available_at" bigint NOT NULL,
   "created_at" bigint NOT NULL,
   CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "jobs_queue_index" ON "public"."jobs" ("queue");






-- Dump of table meal_entries
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."meal_entries";

CREATE SEQUENCE "public"."meal_entries_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."meal_entries"(
   "id" bigint DEFAULT nextval('public.meal_entries_id_seq1'::regclass) NOT NULL,
   "user_id" bigint NOT NULL,
   "food_id" bigint NOT NULL,
   "meal_type" "public".meal_type_enum NOT NULL,
   "servings" numeric DEFAULT 1 NOT NULL,
   "eaten_at" date NOT NULL,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "meal_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_me_user_day" ON "public"."meal_entries" ("user_id", "eaten_at");
CREATE INDEX "idx_me_food" ON "public"."meal_entries" ("food_id");


INSERT INTO "public"."meal_entries" ("id", "user_id", "food_id", "meal_type", "servings", "eaten_at", "created_at", "updated_at") VALUES (1, 1, 188, 'snack', 1.00, '2025-10-10', '2025-10-10 18:02:20.000000', '2025-10-10 18:02:20.000000');
INSERT INTO "public"."meal_entries" ("id", "user_id", "food_id", "meal_type", "servings", "eaten_at", "created_at", "updated_at") VALUES (2, 1, 244, 'drink', 1.00, '2025-10-14', '2025-10-14 14:11:22.000000', '2025-10-14 14:11:22.000000');
INSERT INTO "public"."meal_entries" ("id", "user_id", "food_id", "meal_type", "servings", "eaten_at", "created_at", "updated_at") VALUES (3, 1, 155, 'drink', 1.00, '2025-11-13', '2025-11-13 09:52:35.000000', '2025-11-13 09:52:35.000000');




-- Dump of table meal_log_items
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."meal_log_items";

CREATE SEQUENCE "public"."meal_log_items_id_seq"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."meal_log_items"(
   "id" bigint DEFAULT nextval('public.meal_log_items_id_seq'::regclass) NOT NULL,
   "meal_log_id" bigint NOT NULL,
   "category" character varying(80),
   "label" character varying(255),
   "quantity" numeric,
   "unit" character varying(40),
   "calories" integer,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "meal_log_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_mli_log" ON "public"."meal_log_items" ("meal_log_id");






-- Dump of table meal_logs
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."meal_logs";

CREATE SEQUENCE "public"."meal_logs_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."meal_logs"(
   "id" bigint DEFAULT nextval('public.meal_logs_id_seq1'::regclass) NOT NULL,
   "user_id" bigint NOT NULL,
   "consumed_at" date NOT NULL,
   "other_notes" text,
   "photo_path" text,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "meal_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_ml_user_day" ON "public"."meal_logs" ("user_id", "consumed_at");






-- Dump of table meal_selections
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."meal_selections";

CREATE SEQUENCE "public"."meal_selections_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."meal_selections"(
   "id" bigint DEFAULT nextval('public.meal_selections_id_seq1'::regclass) NOT NULL,
   "created_at" timestamp without time zone,
   "updated_at" timestamp without time zone,
   CONSTRAINT "meal_selections_pkey" PRIMARY KEY ("id")
);







-- Dump of table meals
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."meals";

CREATE SEQUENCE "public"."meals_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."meals"(
   "id" bigint DEFAULT nextval('public.meals_id_seq1'::regclass) NOT NULL,
   "user_id" bigint NOT NULL,
   "logged_at" timestamp with time zone NOT NULL,
   "meal_type" "public".meal_type_enum NOT NULL,
   "name" character varying(255),
   "notes" text,
   "tot_calories" integer,
   "tot_protein_g" numeric,
   "tot_carbs_g" numeric,
   "tot_fat_g" numeric,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_meals_user_ts" ON "public"."meals" ("user_id", "logged_at");






-- Dump of table measurements
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."measurements";

CREATE SEQUENCE "public"."measurements_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."measurements"(
   "id" bigint DEFAULT nextval('public.measurements_id_seq1'::regclass) NOT NULL,
   "user_id" bigint NOT NULL,
   "measured_at" timestamp with time zone NOT NULL,
   "weight_kg" numeric,
   "body_fat_pct" numeric,
   "neck_cm" numeric,
   "chest_cm" numeric,
   "waist_cm" numeric,
   "hip_cm" numeric,
   "arm_cm" numeric,
   "thigh_cm" numeric,
   "calf_cm" numeric,
   "resting_hr" integer,
   "systolic_bp" integer,
   "diastolic_bp" integer,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "measurements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_meas_user_ts" ON "public"."measurements" ("user_id", "measured_at");






-- Dump of table migrations
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."migrations";

CREATE SEQUENCE "public"."migrations_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 2147483647
   CACHE 1;

CREATE TABLE "public"."migrations"(
   "id" integer DEFAULT nextval('public.migrations_id_seq1'::regclass) NOT NULL,
   "migration" character varying(255) NOT NULL,
   "batch" integer NOT NULL,
   CONSTRAINT "migrations_pkey" PRIMARY KEY ("id")
);



INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (1, '0001_01_01_000000_create_users_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (2, '0001_01_01_000001_create_cache_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (3, '0001_01_01_000002_create_jobs_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (4, '2025_10_04_000100_update_users_add_profile_fields', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (5, '2025_10_04_000200_add_two_factor_columns_to_users_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (6, '2025_10_04_000300_create_foods_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (7, '2025_10_04_000310_update_foods_table_add_csv_columns', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (8, '2025_10_04_000400_create_meals_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (9, '2025_10_04_000500_create_meal_entries_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (10, '2025_10_04_000530_add_user_and_date_to_meal_entries', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (11, '2025_10_04_000600_create_water_intakes_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (12, '2025_10_04_000610_add_drank_at_to_water_intakes_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (13, '2025_10_04_000700_create_exercises_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (14, '2025_10_04_000800_create_workout_plans_tables', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (15, '2025_10_04_000900_create_workout_logs_tables', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (16, '2025_10_04_001000_create_measurements_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (17, '2025_10_04_001100_create_places_local_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (18, '2025_10_04_085156_add_conditions_to_exercises_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (19, '2025_10_04_101727_create_user_prefs_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (20, '2025_10_04_104425_add_missing_profile_columns_to_users_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (21, '2025_10_04_171303_create_diets_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (22, '2025_10_04_171304_create_diet_items_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (23, '2025_10_04_171304_create_meal_logs_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (24, '2025_10_04_171305_create_meal_selections_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (25, '2025_10_05_143156_add_user_id_to_meal_logs_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (26, '2025_10_08_100247_relax_unique_on_diets_user_id', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (28, '2025_10_12_000001_tune_exercises_schema', 2);




-- Dump of table password_reset_tokens
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."password_reset_tokens";

CREATE TABLE "public"."password_reset_tokens"(
   "email" character varying(255) NOT NULL,
   "token" character varying(255) NOT NULL,
   "created_at" timestamp with time zone,
   CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("email")
);







-- Dump of table personal_access_tokens
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."personal_access_tokens";

CREATE SEQUENCE "public"."personal_access_tokens_id_seq"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."personal_access_tokens"(
   "id" bigint DEFAULT nextval('public.personal_access_tokens_id_seq'::regclass) NOT NULL,
   "tokenable_type" character varying(255) NOT NULL,
   "tokenable_id" bigint NOT NULL,
   "name" character varying(255) NOT NULL,
   "token" character(64) NOT NULL,
   "abilities" text,
   "last_used_at" timestamp with time zone,
   "expires_at" timestamp with time zone,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "personal_access_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "personal_access_tokens_token_key" ON "public"."personal_access_tokens" ("token");
CREATE INDEX "idx_pat_tokenable" ON "public"."personal_access_tokens" ("tokenable_type", "tokenable_id");






-- Dump of table places_local
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."places_local";

CREATE SEQUENCE "public"."places_local_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."places_local"(
   "id" bigint DEFAULT nextval('public.places_local_id_seq1'::regclass) NOT NULL,
   "user_id" bigint,
   "name" character varying(255) NOT NULL,
   "category" character varying(80),
   "address" text,
   "city" character varying(120),
   "lat" numeric NOT NULL,
   "lng" numeric NOT NULL,
   "meta" jsonb,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "places_local_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_places_user" ON "public"."places_local" ("user_id");
CREATE INDEX "idx_places_geo" ON "public"."places_local" ("lat", "lng");


INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (1, NULL, 'Olympia Gym Jounieh', 'gym', 'Main Hwy, Jounieh', 'Jounieh', 33.980500, 35.640200, NULL, '2025-09-16 18:18:54.000000', '2025-09-16 18:18:54.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (4, NULL, 'Olympia Gym Jounieh', 'gym', 'Main Hwy, Jounieh', 'Jounieh', 33.980500, 35.640200, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (5, NULL, 'Fitness Zone Zouk Mosbeh', 'gym', 'Zouk Mosbeh Highway', 'Zouk Mosbeh', 33.955900, 35.619800, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (6, NULL, 'Shape Up Gym Zouk Mikael', 'gym', 'Zouk Mikael Main Road', 'Zouk Mikael', 33.967600, 35.615300, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (7, NULL, 'Body Garage Kaslik', 'gym', 'Kaslik Main Road', 'Kaslik', 33.980900, 35.629900, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (8, NULL, 'U Energy Dbayeh', 'gym', 'Dbayeh Highway', 'Dbayeh', 33.939700, 35.585800, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (9, NULL, 'Black Belt Gym Zalka', 'gym', 'Zalka Highway', 'Zalka', 33.907300, 35.574800, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (10, NULL, 'Gold Fitness Antelias', 'gym', 'Antelias Main Street', 'Antelias', 33.916900, 35.579900, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (11, NULL, 'Byblos Gym', 'gym', 'Byblos Old Town', 'Jbeil', 34.121400, 35.651200, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (12, NULL, 'Spartan Fitness Adonis', 'gym', 'Adonis Highway', 'Adonis', 33.964500, 35.617200, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (13, NULL, 'Titanium Gym Jounieh', 'gym', 'Kaslik Area', 'Jounieh', 33.981200, 35.629500, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (14, NULL, 'Energy Club Dbayeh', 'gym', 'Dbayeh Seaside', 'Dbayeh', 33.939300, 35.585200, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (15, NULL, 'Hard Rock Gym Zouk', 'gym', 'Zouk Area', 'Zouk Mikael', 33.962800, 35.615700, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (16, NULL, 'Impact Gym Jbeil', 'gym', 'Byblos Highway', 'Jbeil', 34.120800, 35.649700, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (17, NULL, 'Pro Gym Antelias', 'gym', 'Antelias Main Road', 'Antelias', 33.917900, 35.580900, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (18, NULL, 'Extreme Fitness Zalka', 'gym', 'Zalka Boulevard', 'Zalka', 33.906900, 35.573900, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (19, NULL, 'Diet Center Jounieh', 'nutritionist', 'Kaslik/Jounieh Hwy', 'Jounieh', 33.977800, 35.630700, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (20, NULL, 'Nutri Clinic Jbeil', 'nutritionist', 'Byblos Center', 'Jbeil', 34.121900, 35.650300, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (21, NULL, 'Healthy Bites Nutrition Zouk', 'nutritionist', 'Zouk Mikael', 'Zouk Mikael', 33.962100, 35.615800, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (22, NULL, 'Diet & More Zalka', 'nutritionist', 'Zalka Main Road', 'Zalka', 33.907900, 35.575900, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (23, NULL, 'Wellness Clinic Dbayeh', 'nutritionist', 'Dbayeh Village', 'Dbayeh', 33.942500, 35.587900, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (24, NULL, 'Slim & Healthy Antelias', 'nutritionist', 'Antelias Main Road', 'Antelias', 33.917800, 35.579200, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (25, NULL, 'Nutrition Experts Kaslik', 'nutritionist', 'Kaslik Highway', 'Kaslik', 33.981700, 35.628900, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (26, NULL, 'Lebanon Diet Clinic Jounieh', 'nutritionist', 'Jounieh Main Street', 'Jounieh', 33.979500, 35.631500, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');
INSERT INTO "public"."places_local" ("id", "user_id", "name", "category", "address", "city", "lat", "lng", "meta", "created_at", "updated_at") VALUES (27, NULL, 'NutriHealth Zouk', 'nutritionist', 'Zouk Area', 'Zouk Mikael', 33.963400, 35.616700, NULL, '2025-09-16 18:21:01.000000', '2025-09-16 18:21:01.000000');




-- Dump of table sessions
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."sessions";

CREATE TABLE "public"."sessions"(
   "id" character varying(255) NOT NULL,
   "user_id" bigint,
   "ip_address" character varying(45),
   "user_agent" text,
   "payload" text NOT NULL,
   "last_activity" integer NOT NULL,
   CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sessions_user_id_index" ON "public"."sessions" ("user_id");
CREATE INDEX "sessions_last_activity_index" ON "public"."sessions" ("last_activity");


INSERT INTO "public"."sessions" ("id", "user_id", "ip_address", "user_agent", "payload", "last_activity") VALUES ('krcmRKU3QzRX9Y4VYcTuEzD6qf3JyqgBHJyDT17a', 1, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0', 'YTo1OntzOjY6Il90b2tlbiI7czo0MDoieFlnVGpodjUzZXFreUgxUEF5aEFaNk91c2hyMVdsNXRwT2ZrakdvUSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MTAzOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvYXBpL3BsYWNlcy1sb2NhbD9sYXQ9MzQuMTQxMDAzJmxuZz0zNS42MzYxOTYmcmFkaXVzPTIwMDAmdHlwZXM9Z3ltJTJDbnV0cml0aW9uaXN0IjtzOjU6InJvdXRlIjtzOjE2OiJhcGkucGxhY2VzLmxvY2FsIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319czo1OiJsb2dpbiI7YTowOnt9czo1MDoibG9naW5fd2ViXzU5YmEzNmFkZGMyYjJmOTQwMTU4MGYwMTRjN2Y1OGVhNGUzMDk4OWQiO2k6MTt9', 1767436162);




-- Dump of table user_prefs
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."user_prefs";

CREATE SEQUENCE "public"."user_prefs_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."user_prefs"(
   "id" bigint DEFAULT nextval('public.user_prefs_id_seq1'::regclass) NOT NULL,
   "user_id" bigint NOT NULL,
   "units" character varying(20),
   "timezone" character varying(80),
   "locale" character varying(20),
   "daily_goal_calories" integer,
   "daily_goal_protein_g" numeric,
   "daily_goal_carbs_g" numeric,
   "daily_goal_fat_g" numeric,
   "water_cups_per_day" integer,
   "workout_days_target" integer,
   "notifications" jsonb,
   "settings" jsonb,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "user_prefs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_prefs_user_id_key" ON "public"."user_prefs" ("user_id");






-- Dump of table users
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."users";

CREATE SEQUENCE "public"."users_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."users"(
   "id" bigint DEFAULT nextval('public.users_id_seq1'::regclass) NOT NULL,
   "first_name" character varying(100),
   "last_name" character varying(100),
   "username" character varying(60),
   "name" character varying(150),
   "gender" character varying(20),
   "age" integer,
   "height_cm" integer,
   "weight_kg" numeric,
   "email" character varying(255) NOT NULL,
   "email_verified_at" timestamp with time zone,
   "password" character varying(255) NOT NULL,
   "remember_token" character varying(100),
   "two_factor_secret" text,
   "two_factor_recovery_codes" text,
   "two_factor_confirmed_at" timestamp with time zone,
   "appearance" character varying(20),
   "has_medical_history" boolean DEFAULT false,
   "medical_history" text,
   "dietary_goal" character varying(120),
   "fitness_goal" character varying(120),
   "diet_name" character varying(120),
   "allergies" jsonb,
   "activity_level" character varying(50),
   "workout_days_per_week" integer,
   "workout_location" character varying(100),
   "tried_diet_before" boolean DEFAULT false,
   "diet_failure_reasons" jsonb,
   "diet_failure_other" text,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_username_key" ON "public"."users" ("username");
CREATE UNIQUE INDEX "users_email_key" ON "public"."users" ("email");


INSERT INTO "public"."users" ("id", "first_name", "last_name", "username", "name", "gender", "age", "height_cm", "weight_kg", "email", "email_verified_at", "password", "remember_token", "two_factor_secret", "two_factor_recovery_codes", "two_factor_confirmed_at", "appearance", "has_medical_history", "medical_history", "dietary_goal", "fitness_goal", "diet_name", "allergies", "activity_level", "workout_days_per_week", "workout_location", "tried_diet_before", "diet_failure_reasons", "diet_failure_other", "created_at", "updated_at") VALUES (2, NULL, NULL, NULL, 'Test User', NULL, NULL, NULL, NULL, 'test@example.com', '2025-11-13 09:01:15.000000', '$2y$12$lQdGtYLz4X1jIF42QRBgTuuoGNkCJ/lj3lNJUHu7U3l6p0IgDscu.', NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, '2025-11-13 09:01:17.000000', '2025-11-13 09:01:17.000000');
INSERT INTO "public"."users" ("id", "first_name", "last_name", "username", "name", "gender", "age", "height_cm", "weight_kg", "email", "email_verified_at", "password", "remember_token", "two_factor_secret", "two_factor_recovery_codes", "two_factor_confirmed_at", "appearance", "has_medical_history", "medical_history", "dietary_goal", "fitness_goal", "diet_name", "allergies", "activity_level", "workout_days_per_week", "workout_location", "tried_diet_before", "diet_failure_reasons", "diet_failure_other", "created_at", "updated_at") VALUES (1, 'Chahid', 'Abboud', NULL, 'Chahid Abboud', 'male', 20, 190, 135.00, 'shahidabboud2015@gmail.com', NULL, '$2y$12$UGmfCdYze3DPEgt/m9WITudA87NykQ43WpHVYAcTQ/lfmiTELuWkK', 'wRk1C8ydf9zBRFtF25LOeDvGO9lkbTNyEUZWVUOsp28cWup2lY1JaB6eRe64', 'eyJpdiI6IkRseVFBcndUbzgxSlFLZDV0V0t5NEE9PSIsInZhbHVlIjoiQU55cXNZL2k5YkVZbTdXekUxc003WEFHdjBzVTZkWmdXT2dDT2h3WkpXZz0iLCJtYWMiOiIzM2MyZmQzMDJhYjYxN2UxOTQyNTk5N2M1MWEwM2Y0YjFjY2ZlNzZkMWU4ZDdkYjY5NWUwOTI4ZWQyOWIxYzkyIiwidGFnIjoiIn0=', 'eyJpdiI6IlErdTgvWXE3ZnZxcEw2aDAzVVNSTlE9PSIsInZhbHVlIjoiS1BNd3ZscEtRbWY3VnJSU2UzcE5NY1ZjcTdRVDEzanVLWkhBMkhZZUZZYTdyZE5lS2VaL2xJSWlGWHhpNTRyQ3BPUnpkdU0zSWxaSG41Y1VRUWVVTXQzamZMRVFCR3FqbGs1c2lOdkdYY1JkczRjNmF6TmtuSjMrR1RhellhWktwUWlMNmRWd1pINSt2SzlmSzNPK1hNMVRjWDh6V3I2aGZSRC9hR3J6cHdyTU9UVEY4d0cxemNVcXM2eEYrN2txSmcvN0dtOHBVNUI2Nmw5c2piLzhPc0xBWnppMldMWXIzbWJ6a1lmdE5wSi81ZHV4MzVRQzJHMjcvdFRGU3VVbVVCWVNNTnN1bFE3ZVg1Sko2Q2tBaGc9PSIsIm1hYyI6IjZjYTU5YjU1Njc1OWVhN2U4ODUzMTVlMDhjMmM0ODRiYzYwOTMwMzMxODUwMzNmNDdkMmI2NzBkZjM5MWNhMGEiLCJ0YWciOiIifQ==', '2025-10-10 17:14:17.000000', NULL, false, NULL, 'Calorie Deficit', 'Build Muscle', 'Mediterranean', '["Corn","Celery"]', 'Very Active', 5, 'gym', true, '["Too restrictive","Hunger/low energy","Cravings"]', NULL, '2025-10-10 17:13:42.000000', '2025-10-10 17:14:17.000000');




-- Dump of table water_intakes
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."water_intakes";

CREATE SEQUENCE "public"."water_intakes_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."water_intakes"(
   "id" bigint DEFAULT nextval('public.water_intakes_id_seq1'::regclass) NOT NULL,
   "user_id" bigint NOT NULL,
   "for_day" date NOT NULL,
   "ml" integer NOT NULL,
   "drank_at" timestamp with time zone,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "water_intakes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_water_user_day" ON "public"."water_intakes" ("user_id", "for_day");


INSERT INTO "public"."water_intakes" ("id", "user_id", "for_day", "ml", "drank_at", "created_at", "updated_at") VALUES (1, 1, '2025-10-10', 250, '2025-10-10 17:14:25.000000', '2025-10-10 17:14:25.000000', '2025-10-10 17:14:25.000000');
INSERT INTO "public"."water_intakes" ("id", "user_id", "for_day", "ml", "drank_at", "created_at", "updated_at") VALUES (2, 1, '2025-11-13', 1250, '2025-11-13 09:51:57.000000', '2025-11-13 09:51:53.000000', '2025-11-13 09:51:57.000000');




-- Dump of table workout_log_items
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."workout_log_items";

CREATE SEQUENCE "public"."workout_log_items_id_seq"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."workout_log_items"(
   "id" bigint DEFAULT nextval('public.workout_log_items_id_seq'::regclass) NOT NULL,
   "workout_log_id" bigint NOT NULL,
   "exercise_id" bigint NOT NULL,
   "sets" integer,
   "reps" integer,
   "weight_kg" numeric,
   "duration_seconds" integer,
   "rpe" numeric,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "workout_log_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_wli_log" ON "public"."workout_log_items" ("workout_log_id");






-- Dump of table workout_log_sets
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."workout_log_sets";

CREATE SEQUENCE "public"."workout_log_sets_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."workout_log_sets"(
   "id" bigint DEFAULT nextval('public.workout_log_sets_id_seq1'::regclass) NOT NULL,
   "workout_log_id" bigint NOT NULL,
   "exercise_id" bigint NOT NULL,
   "order_index" integer,
   "weight_kg" numeric,
   "reps" integer,
   "distance_m" integer,
   "duration_sec" integer,
   "side" character varying(20),
   "is_warmup" boolean DEFAULT false,
   "notes" text,
   "meta" jsonb,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "workout_log_sets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_wls_log" ON "public"."workout_log_sets" ("workout_log_id");






-- Dump of table workout_logs
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."workout_logs";

CREATE SEQUENCE "public"."workout_logs_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."workout_logs"(
   "id" bigint DEFAULT nextval('public.workout_logs_id_seq1'::regclass) NOT NULL,
   "user_id" bigint NOT NULL,
   "performed_at" timestamp with time zone NOT NULL,
   "duration_min" integer,
   "mood" character varying(40),
   "energy" character varying(40),
   "workout_plan_id" bigint,
   "workout_plan_day_id" bigint,
   "meta" jsonb,
   "notes" text,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_wl_user_ts" ON "public"."workout_logs" ("user_id", "performed_at");


INSERT INTO "public"."workout_logs" ("id", "user_id", "performed_at", "duration_min", "mood", "energy", "workout_plan_id", "workout_plan_day_id", "meta", "notes", "created_at", "updated_at") VALUES (1, 1, '2025-11-16 00:00:00.000000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-16 15:25:05.000000', '2025-11-16 15:25:05.000000');
INSERT INTO "public"."workout_logs" ("id", "user_id", "performed_at", "duration_min", "mood", "energy", "workout_plan_id", "workout_plan_day_id", "meta", "notes", "created_at", "updated_at") VALUES (2, 1, '2025-11-16 00:00:00.000000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2025-11-16 15:40:11.000000', '2025-11-16 15:40:11.000000');




-- Dump of table workout_plan_day_exercise
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."workout_plan_day_exercise";

CREATE SEQUENCE "public"."workout_plan_day_exercise_id_seq"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."workout_plan_day_exercise"(
   "id" bigint DEFAULT nextval('public.workout_plan_day_exercise_id_seq'::regclass) NOT NULL,
   "workout_plan_day_id" bigint NOT NULL,
   "exercise_id" bigint NOT NULL,
   "target_sets" smallint DEFAULT 3,
   "target_reps" smallint DEFAULT 10,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "workout_plan_day_exercise_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workout_plan_day_exercise_unique" ON "public"."workout_plan_day_exercise" ("workout_plan_day_id", "exercise_id");
CREATE INDEX "wpde_day_idx" ON "public"."workout_plan_day_exercise" ("workout_plan_day_id");
CREATE INDEX "wpde_ex_idx" ON "public"."workout_plan_day_exercise" ("exercise_id");






-- Dump of table workout_plan_day_exercises
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."workout_plan_day_exercises";

CREATE SEQUENCE "public"."workout_plan_day_exercises_id_seq"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."workout_plan_day_exercises"(
   "id" bigint DEFAULT nextval('public.workout_plan_day_exercises_id_seq'::regclass) NOT NULL,
   "workout_plan_day_id" bigint NOT NULL,
   "exercise_id" bigint NOT NULL,
   "order_index" integer,
   "sets" integer,
   "reps_min" integer,
   "reps_max" integer,
   "rest_seconds" integer,
   "rpe_target" numeric,
   "rir_target" numeric,
   "notes" text,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "workout_plan_day_exercises_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workout_plan_day_exercises_day_idx" ON "public"."workout_plan_day_exercises" ("workout_plan_day_id");
CREATE INDEX "workout_plan_day_exercises_ex_idx" ON "public"."workout_plan_day_exercises" ("exercise_id");
CREATE INDEX "idx_wpde_day" ON "public"."workout_plan_day_exercises" ("workout_plan_day_id");


INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (31, 10, 344, 0, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (32, 10, 342, 1, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (33, 10, 106, 2, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (34, 10, 56, 3, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (35, 10, 349, 4, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (36, 11, 46, 0, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (37, 11, 345, 1, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (38, 11, 343, 2, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (39, 11, 346, 3, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (40, 11, 122, 4, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (41, 12, 348, 0, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (42, 12, 347, 1, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (43, 12, 341, 2, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (44, 12, 105, 3, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_day_exercises" ("id", "workout_plan_day_id", "exercise_id", "order_index", "sets", "reps_min", "reps_max", "rest_seconds", "rpe_target", "rir_target", "notes", "created_at", "updated_at") VALUES (45, 12, 39, 4, 3, 10, 10, 60, 0.0, 0.0, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');




-- Dump of table workout_plan_days
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."workout_plan_days";

CREATE SEQUENCE "public"."workout_plan_days_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."workout_plan_days"(
   "id" bigint DEFAULT nextval('public.workout_plan_days_id_seq1'::regclass) NOT NULL,
   "workout_plan_id" bigint NOT NULL,
   "day_index" integer,
   "name" character varying(120),
   "notes" text,
   "meta" jsonb,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "workout_plan_days_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workout_plan_days_plan_idx" ON "public"."workout_plan_days" ("workout_plan_id");
CREATE INDEX "idx_wpd_plan" ON "public"."workout_plan_days" ("workout_plan_id");


INSERT INTO "public"."workout_plan_days" ("id", "workout_plan_id", "day_index", "name", "notes", "meta", "created_at", "updated_at") VALUES (10, 1, 1, NULL, NULL, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_days" ("id", "workout_plan_id", "day_index", "name", "notes", "meta", "created_at", "updated_at") VALUES (11, 1, 2, NULL, NULL, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');
INSERT INTO "public"."workout_plan_days" ("id", "workout_plan_id", "day_index", "name", "notes", "meta", "created_at", "updated_at") VALUES (12, 1, 3, NULL, NULL, NULL, '2026-01-03 09:48:19.000000', '2026-01-03 09:48:19.000000');




-- Dump of table workout_plan_exercises
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."workout_plan_exercises";

CREATE SEQUENCE "public"."workout_plan_exercises_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."workout_plan_exercises"(
   "id" bigint DEFAULT nextval('public.workout_plan_exercises_id_seq1'::regclass) NOT NULL,
   "workout_plan_id" bigint NOT NULL,
   "exercise_id" bigint NOT NULL,
   "sets" integer,
   "reps" integer,
   "rest_seconds" integer,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "workout_plan_exercises_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_wpe_plan" ON "public"."workout_plan_exercises" ("workout_plan_id");






-- Dump of table workout_plans
-- ------------------------------------------------------------

DROP TABLE IF EXISTS "public"."workout_plans";

CREATE SEQUENCE "public"."workout_plans_id_seq1"
   START WITH 1
   INCREMENT BY 1
   MINVALUE 1
   MAXVALUE 9223372036854775807
   CACHE 1;

CREATE TABLE "public"."workout_plans"(
   "id" bigint DEFAULT nextval('public.workout_plans_id_seq1'::regclass) NOT NULL,
   "user_id" bigint NOT NULL,
   "name" character varying(255) NOT NULL,
   "goal" character varying(255),
   "notes" text,
   "is_active" boolean DEFAULT true,
   "is_public" boolean DEFAULT false,
   "meta" jsonb,
   "created_at" timestamp with time zone DEFAULT now(),
   "updated_at" timestamp with time zone DEFAULT now(),
   CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_workout_plans_user_idx" ON "public"."workout_plans" ("user_id");
CREATE INDEX "workout_plans_user_idx" ON "public"."workout_plans" ("user_id");
CREATE INDEX "idx_wp_user" ON "public"."workout_plans" ("user_id");


INSERT INTO "public"."workout_plans" ("id", "user_id", "name", "goal", "notes", "is_active", "is_public", "meta", "created_at", "updated_at") VALUES (1, 1, 'Push–Pull–Legs', NULL, NULL, true, false, NULL, '2025-10-14 09:01:55.000000', '2025-11-13 09:20:59.000000');





ALTER TABLE ONLY "public"."diet_items"
   ADD CONSTRAINT "diet_items_diet_id_fkey" FOREIGN KEY ("diet_id") REFERENCES "public"."diets" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."diets"
   ADD CONSTRAINT "diets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."meal_entries"
   ADD CONSTRAINT "meal_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."meal_log_items"
   ADD CONSTRAINT "meal_log_items_meal_log_id_fkey" FOREIGN KEY ("meal_log_id") REFERENCES "public"."meal_logs" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."meal_logs"
   ADD CONSTRAINT "meal_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."meals"
   ADD CONSTRAINT "meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."measurements"
   ADD CONSTRAINT "measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."places_local"
   ADD CONSTRAINT "places_local_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE ONLY "public"."user_prefs"
   ADD CONSTRAINT "user_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."water_intakes"
   ADD CONSTRAINT "water_intakes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workout_log_sets"
   ADD CONSTRAINT "workout_log_sets_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises" ("id") ON UPDATE NO ACTION ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."workout_log_sets"
   ADD CONSTRAINT "workout_log_sets_workout_log_id_fkey" FOREIGN KEY ("workout_log_id") REFERENCES "public"."workout_logs" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workout_logs"
   ADD CONSTRAINT "workout_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workout_logs"
   ADD CONSTRAINT "workout_logs_workout_plan_day_id_fkey" FOREIGN KEY ("workout_plan_day_id") REFERENCES "public"."workout_plan_days" ("id") ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE ONLY "public"."workout_logs"
   ADD CONSTRAINT "workout_logs_workout_plan_id_fkey" FOREIGN KEY ("workout_plan_id") REFERENCES "public"."workout_plans" ("id") ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE ONLY "public"."workout_plan_day_exercise"
   ADD CONSTRAINT "workout_plan_day_exercise_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workout_plan_day_exercise"
   ADD CONSTRAINT "workout_plan_day_exercise_workout_plan_day_id_fkey" FOREIGN KEY ("workout_plan_day_id") REFERENCES "public"."workout_plan_days" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workout_plan_day_exercises"
   ADD CONSTRAINT "workout_plan_day_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises" ("id") ON UPDATE NO ACTION ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."workout_plan_day_exercises"
   ADD CONSTRAINT "workout_plan_day_exercises_workout_plan_day_id_fkey" FOREIGN KEY ("workout_plan_day_id") REFERENCES "public"."workout_plan_days" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workout_plan_days"
   ADD CONSTRAINT "workout_plan_days_workout_plan_id_fkey" FOREIGN KEY ("workout_plan_id") REFERENCES "public"."workout_plans" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workout_plans"
   ADD CONSTRAINT "workout_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;


-- Dump of functions
-- ------------------------------------------------------------


CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$
;

CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$
;

CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$
;

CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$
;

CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$
;

CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$
;

CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$
;

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$
;





-- Dump completed on 2026-01-05T17:08:59+02:00