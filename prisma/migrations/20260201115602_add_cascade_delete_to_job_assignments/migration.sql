-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JobAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "assignedAmount" REAL NOT NULL,
    "notes" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Ödenmedi',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentHistory" TEXT,
    CONSTRAINT "JobAssignment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobAssignment_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JobAssignment" ("assignedAmount", "assignedAt", "id", "notes", "paymentHistory", "paymentStatus", "personnelId", "proposalId") SELECT "assignedAmount", "assignedAt", "id", "notes", "paymentHistory", "paymentStatus", "personnelId", "proposalId" FROM "JobAssignment";
DROP TABLE "JobAssignment";
ALTER TABLE "new_JobAssignment" RENAME TO "JobAssignment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
