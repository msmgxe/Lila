CREATE TABLE "portadas" (
	"libro_id" uuid PRIMARY KEY NOT NULL,
	"mime" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portadas" ADD CONSTRAINT "portadas_libro_id_libros_id_fk" FOREIGN KEY ("libro_id") REFERENCES "public"."libros"("id") ON DELETE cascade ON UPDATE no action;