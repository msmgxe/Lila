CREATE TABLE "ajustes" (
	"clave" text PRIMARY KEY NOT NULL,
	"tema" text DEFAULT 'lila' NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
