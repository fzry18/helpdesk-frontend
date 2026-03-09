-- CreateEnum
CREATE TYPE "helpdesk_role" AS ENUM ('USER', 'DEPT_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "ticket_priority" AS ENUM ('VERY_LOW', 'LOW', 'NORMAL', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "ticket_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CONFIRMATION', 'RESOLVED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ticket_category_type" AS ENUM ('HELPER', 'SYSTEM');

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "odoo_employee_id" INTEGER NOT NULL,
    "nik" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "department" TEXT,
    "department_id" INTEGER,
    "job_title" TEXT,
    "operating_unit" TEXT,
    "gender" TEXT,
    "is_manager" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "helpdesk_role" "helpdesk_role" NOT NULL DEFAULT 'USER',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "odoo_token" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "ticket_priority" NOT NULL DEFAULT 'NORMAL',
    "status" "ticket_status" NOT NULL DEFAULT 'OPEN',
    "ticket_category_type" "ticket_category_type",
    "system_category" TEXT,
    "created_by_id" INTEGER NOT NULL,
    "assigned_to_id" INTEGER,
    "category_id" INTEGER,
    "team_id" INTEGER,
    "stage_id" INTEGER,
    "department_id" INTEGER,
    "department_name" TEXT,
    "waiting_user_confirmation" BOOLEAN NOT NULL DEFAULT false,
    "resolution_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "is_rejected" BOOLEAN NOT NULL DEFAULT false,
    "rejection_reason" TEXT,
    "rejected_date" TIMESTAMP(3),
    "user_confirmation_request_date" TIMESTAMP(3),
    "confirmation_date" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "body_plain" TEXT,
    "message_type" TEXT NOT NULL DEFAULT 'comment',
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "is_leader" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "is_starting" BOOLEAN NOT NULL DEFAULT false,
    "is_closing" BOOLEAN NOT NULL DEFAULT false,
    "fold" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_tags" (
    "ticket_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "ticket_tags_pkey" PRIMARY KEY ("ticket_id","tag_id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "activity_type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_odoo_employee_id_key" ON "employees"("odoo_employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_nik_key" ON "employees"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_employee_id_idx" ON "sessions"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_created_by_id_idx" ON "tickets"("created_by_id");

-- CreateIndex
CREATE INDEX "tickets_assigned_to_id_idx" ON "tickets"("assigned_to_id");

-- CreateIndex
CREATE INDEX "tickets_team_id_idx" ON "tickets"("team_id");

-- CreateIndex
CREATE INDEX "tickets_category_id_idx" ON "tickets"("category_id");

-- CreateIndex
CREATE INDEX "tickets_stage_id_idx" ON "tickets"("stage_id");

-- CreateIndex
CREATE INDEX "tickets_created_at_idx" ON "tickets"("created_at");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_messages_author_id_idx" ON "ticket_messages"("author_id");

-- CreateIndex
CREATE INDEX "attachments_ticket_id_idx" ON "attachments"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_employee_id_key" ON "team_members"("team_id", "employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "stages_name_key" ON "stages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "activity_logs_ticket_id_idx" ON "activity_logs"("ticket_id");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_tags" ADD CONSTRAINT "ticket_tags_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_tags" ADD CONSTRAINT "ticket_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
