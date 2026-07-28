CREATE TABLE "autor" (
	"clave" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"titular" text,
	"intro" text,
	"retrato_url" text,
	"hitos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"videos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medios" (
	"clave" text PRIMARY KEY NOT NULL,
	"mime" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
