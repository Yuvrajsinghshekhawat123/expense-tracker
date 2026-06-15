# Key Decisions Made

## Decision 1: Handle All Anomalies vs Reject File
**Options considered:** 
- Reject entire file if any anomaly found
- Import all rows but flag anomalies
**Chosen:** Import all, flag anomalies
**Why:** User needs to see data, even imperfect data

## Decision 2: Negative Amounts as Refunds vs Errors
**Options considered:**
- Treat as error and reject row
- Convert to positive and treat as refund
**Chosen:** Convert to positive as refund
**Why:** Real expense reports have refunds/credits

## Decision 3: MySQL vs PostgreSQL
**Options considered:**
- PostgreSQL (more features)
- MySQL (simpler, widely used)
**Chosen:** MySQL
**Why:** Easier for anyone to understand and set up

## Decision 4: Raw SQL vs ORM
**Options considered:**
- Prisma/TypeORM (abstraction)
- Raw SQL (explicit)
**Chosen:** Raw SQL
**Why:** Everyone can read SQL, no magic



# Decision Log for Anomaly Handling

## 1. Negative Amounts (-30 USD on row 25)
**Options:** Treat as error vs refund  
**Decision:** Convert to positive as REFUND  
**Why:** Expense reports legitimately contain refunds/credits

## 2. Duplicate Transactions (Marina Bites, Thalassa dinner)
**Options:** Skip duplicates vs import both  
**Decision:** Import both but FLAG as duplicate  
**Why:** User needs to decide which is correct

## 3. Missing Paid By (row 22 - house cleaning)
**Options:** Reject row vs assign default  
**Decision:** Set to "UNKNOWN" and flag  
**Why:** Better to have partial data than missing data

## 4. Member Moved Out (Meera after March 28)
**Options:** Reject expenses vs flag  
**Decision:** Import but FLAG with warning  
**Why:** Meera might still owe for shared bills

## 5. Zero Amount (row 29 - Swiggy order)
**Options:** Skip row vs import  
**Decision:** Import but FLAG as anomaly  
**Why:** User noted "fixing later" - keep as placeholder

## 6. Percentage Split Mismatch (110% totals)
**Options:** Auto-correct vs flag  
**Decision:** FLAG but don't auto-correct  
**Why:** Don't assume which percentage is wrong

## 7. Currency Mix (USD and INR)
**Options:** Convert all to INR  
**Decision:** Keep original currency, add conversion later  
**Why:** Exchange rates change, don't hardcode