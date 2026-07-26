CREATE TABLE "audios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poema_id" uuid NOT NULL,
	"voz" text NOT NULL,
	"proveedor" text NOT NULL,
	"url" text NOT NULL,
	"duracion_ms" integer,
	"ssml_hash" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "libros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"volumen" text NOT NULL,
	"titulo" text NOT NULL,
	"subtitulo" text,
	"descripcion" text,
	"categoria" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"color_acento" text,
	"portada_url" text,
	"anio" integer,
	"publicado" boolean DEFAULT false NOT NULL,
	"pagina_base" integer DEFAULT 1 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planchas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poema_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"titulo" text NOT NULL,
	"tecnica" text NOT NULL,
	"url" text,
	"prompt_generacion" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poemas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"libro_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"cuerpo" text NOT NULL,
	"forma" text DEFAULT 'verso libre' NOT NULL,
	"dedicatoria" text,
	"nota_autor" text,
	"anio" integer,
	"orden" integer DEFAULT 0 NOT NULL,
	"temas" text[] DEFAULT '{}'::text[] NOT NULL,
	"publicado" boolean DEFAULT false NOT NULL,
	"busqueda" "tsvector" GENERATED ALWAYS AS (to_tsvector('public.spanish_unaccent', coalesce(titulo,'') || ' ' || coalesce(cuerpo,'') || ' ' || array_to_string(temas,' '))) STORED,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" uuid,
	"accion" text NOT NULL,
	"detalle_json" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audios" ADD CONSTRAINT "audios_poema_id_poemas_id_fk" FOREIGN KEY ("poema_id") REFERENCES "public"."poemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planchas" ADD CONSTRAINT "planchas_poema_id_poemas_id_fk" FOREIGN KEY ("poema_id") REFERENCES "public"."poemas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poemas" ADD CONSTRAINT "poemas_libro_id_libros_id_fk" FOREIGN KEY ("libro_id") REFERENCES "public"."libros"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audios_poema_voz_idx" ON "audios" USING btree ("poema_id","voz");--> statement-breakpoint
CREATE UNIQUE INDEX "libros_slug_idx" ON "libros" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "libros_categoria_idx" ON "libros" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX "libros_orden_idx" ON "libros" USING btree ("orden");--> statement-breakpoint
CREATE INDEX "planchas_poema_orden_idx" ON "planchas" USING btree ("poema_id","orden");--> statement-breakpoint
CREATE UNIQUE INDEX "poemas_libro_slug_idx" ON "poemas" USING btree ("libro_id","slug");--> statement-breakpoint
CREATE INDEX "poemas_libro_orden_idx" ON "poemas" USING btree ("libro_id","orden");--> statement-breakpoint
CREATE INDEX "poemas_busqueda_idx" ON "poemas" USING gin ("busqueda");--> statement-breakpoint
CREATE INDEX "poemas_titulo_trgm_idx" ON "poemas" USING gin ("titulo" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "registro_entidad_idx" ON "registro" USING btree ("entidad","creado_en");